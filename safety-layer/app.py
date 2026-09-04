"""
Chunk 5: Safety Layer

Sits between the Brain Layer and the Data Layer. See
00_overview_and_architecture.md and 05_safety_layer.md for the contract.

Responsibilities (non-negotiable per the spec):
  1. No write action (update_stock, place_order, create_bill) ever reaches
     the Data Layer without an explicit confirmation round-trip.
  2. This is enforced independently of whatever `requires_confirmation`
     flag the Brain Layer sent — we keep our own list of write actions and
     trust it over the incoming flag.
  3. Every action (read or write, confirmed or cancelled or timed out) gets
     appended to an audit log.
  4. Enough pre/post state is logged for write actions that a manual undo
     is reconstructible.

Endpoints:
  POST /action_request        <- Brain Layer (action_request shape, 4c)
  POST /confirmation_response <- Brain/Interface Layer round-trip
  GET  /health

Run:
  python app.py
  (reads SAFETY_LAYER_PORT, CONFIRMATION_TIMEOUT_SECONDS, DATA_LAYER_URL,
  SAFETY_LAYER_LOG_PATH from the environment — see README.md)
"""

import os
import threading
import time

from flask import Flask, jsonify, request

from data_client import call_data_layer
from logger import ActionLogger
from store import PendingConfirmationStore

app = Flask(__name__)

# --- Independent write-action list. Do NOT derive this from the incoming
# requires_confirmation flag — that's the whole point of the second check. ---
WRITE_ACTIONS = {"update_stock", "place_order", "create_bill"}

CONFIRMATION_TIMEOUT_SECONDS = int(os.environ.get("CONFIRMATION_TIMEOUT_SECONDS", 60))

store = PendingConfirmationStore(timeout_seconds=CONFIRMATION_TIMEOUT_SECONDS)
logger = ActionLogger()


def build_confirmation_message(action_request):
    """Plain-language message for the Interface Layer's confirmation dialog."""
    action = action_request.get("action")
    params = action_request.get("params", {}) or {}

    if action == "update_stock":
        item = params.get("item_name", "the item")
        qty = params.get("quantity", "?")
        direction = params.get("direction", "update")
        verb = {"add": "Add", "remove": "Remove"}.get(direction, "Set")
        return f"About to {verb.lower()} {qty} of {item} in stock — confirm?"

    if action == "place_order":
        item = params.get("item_name", "the item")
        qty = params.get("quantity", "?")
        return f"About to place an order for {qty} of {item} — confirm?"

    if action == "create_bill":
        items = params.get("items") or []
        if items:
            desc = ", ".join(
                f"{i.get('quantity', '?')}x {i.get('item_name', 'item')}" for i in items
            )
        else:
            desc = "the listed items"
        return f"About to create a bill for {desc} — confirm?"

    return f"About to perform '{action}' — confirm?"


def get_pre_state(action, params):
    """Best-effort pre-action snapshot, used only to make undo reconstructible
    from the log. Failure here should never block the confirmation flow, so
    any error is swallowed and we just log pre_state: null."""
    try:
        if action == "update_stock":
            item_name = (params or {}).get("item_name")
            if not item_name:
                return None
            read_request = {
                "type": "action_request",
                "action": "get_stock",
                "params": {"item_name": item_name},
                "requires_confirmation": False,
                "session_id": "safety-layer-internal-pre-state-check",
            }
            result = call_data_layer(read_request)
            if result.get("success"):
                return result.get("data")
        # place_order / create_bill create new records rather than mutate
        # existing ones, so there's no "previous value" to snapshot — undo
        # for those means cancelling the order / voiding the bill, which is
        # reconstructible from the post_state (the created record) alone.
    except Exception:
        return None
    return None


@app.route("/action_request", methods=["POST"])
def action_request():
    req = request.get_json(force=True)
    action = req.get("action")
    params = req.get("params", {})
    session_id = req.get("session_id")

    is_write = action in WRITE_ACTIONS

    logger.log(
        session_id=session_id,
        action=action,
        params=params,
        requires_confirmation=is_write,
        brain_flagged_confirmation=req.get("requires_confirmation"),
        event="action_request_received",
    )

    if not is_write:
        # Read-only actions pass straight through, no slowdown.
        result = call_data_layer(req)
        logger.log(
            session_id=session_id,
            action=action,
            params=params,
            requires_confirmation=False,
            confirmed=None,
            result_success=result.get("success"),
            error=result.get("error"),
            event="read_action_executed",
        )
        return jsonify(result)

    # Write action: never forward directly, regardless of what the Brain
    # Layer's requires_confirmation flag said.
    pre_state = get_pre_state(action, params)
    record = store.create(session_id, req, pre_state=pre_state)

    logger.log(
        session_id=session_id,
        action=action,
        params=params,
        requires_confirmation=True,
        confirmed=False,
        pending=True,
        confirmation_id=record["confirmation_id"],
        pre_state=pre_state,
        event="confirmation_required_sent",
    )

    return jsonify(
        {
            "type": "confirmation_required",
            "session_id": session_id,
            "confirmation_id": record["confirmation_id"],
            "message": build_confirmation_message(req),
            "action_request": req,
            "timeout_seconds": store.timeout_seconds,
        }
    )


@app.route("/confirmation_response", methods=["POST"])
def confirmation_response():
    body = request.get_json(force=True)
    confirmation_id = body.get("confirmation_id")
    session_id = body.get("session_id")
    confirmed = bool(body.get("confirmed", False))

    record, status = store.get(confirmation_id)

    if status == "not_found":
        result = {
            "type": "action_result",
            "success": False,
            "data": None,
            "error": "confirmation_not_found",
            "session_id": session_id,
        }
        logger.log(
            session_id=session_id,
            confirmation_id=confirmation_id,
            confirmed=confirmed,
            result_success=False,
            error="confirmation_not_found",
            event="confirmation_response_unknown",
        )
        return jsonify(result), 404

    if record["session_id"] != session_id:
        result = {
            "type": "action_result",
            "success": False,
            "data": None,
            "error": "session_mismatch",
            "session_id": session_id,
        }
        logger.log(
            session_id=session_id,
            confirmation_id=confirmation_id,
            result_success=False,
            error="session_mismatch",
            event="confirmation_session_mismatch",
        )
        return jsonify(result), 400

    if status == "expired":
        store.pop(confirmation_id)
        orig = record["action_request"]
        result = {
            "type": "action_result",
            "success": False,
            "data": None,
            "error": "confirmation_timeout",
            "session_id": session_id,
        }
        logger.log(
            session_id=session_id,
            action=orig.get("action"),
            params=orig.get("params"),
            requires_confirmation=True,
            confirmed=False,
            result_success=False,
            error="confirmation_timeout",
            confirmation_id=confirmation_id,
            event="confirmation_timed_out",
        )
        return jsonify(result)

    # status == "ok"
    store.pop(confirmation_id)
    orig = record["action_request"]

    if not confirmed:
        result = {
            "type": "action_result",
            "success": False,
            "data": None,
            "error": "cancelled_by_user",
            "session_id": session_id,
        }
        logger.log(
            session_id=session_id,
            action=orig.get("action"),
            params=orig.get("params"),
            requires_confirmation=True,
            confirmed=False,
            result_success=False,
            error="cancelled_by_user",
            confirmation_id=confirmation_id,
            event="confirmation_cancelled",
        )
        return jsonify(result)

    # Confirmed -> now, and only now, forward to the Data Layer.
    result = call_data_layer(orig)
    logger.log(
        session_id=session_id,
        action=orig.get("action"),
        params=orig.get("params"),
        requires_confirmation=True,
        confirmed=True,
        result_success=result.get("success"),
        error=result.get("error"),
        pre_state=record.get("pre_state"),
        post_state=result.get("data"),
        confirmation_id=confirmation_id,
        event="write_action_executed",
    )
    return jsonify(result)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "pending_confirmations_timeout_seconds": store.timeout_seconds})


def _sweep_loop():
    """Background thread: logs a confirmation_timeout even if the Interface
    Layer never calls /confirmation_response at all (e.g. the user just
    closes the tab). Without this, an abandoned confirmation would sit
    silently in memory with no audit trail of the fact that it timed out."""
    while True:
        time.sleep(5)
        for rec in store.sweep_expired():
            orig = rec["action_request"]
            logger.log(
                session_id=rec["session_id"],
                action=orig.get("action"),
                params=orig.get("params"),
                requires_confirmation=True,
                confirmed=False,
                result_success=False,
                error="confirmation_timeout",
                confirmation_id=rec["confirmation_id"],
                event="confirmation_timed_out_sweep",
            )


if __name__ == "__main__":
    threading.Thread(target=_sweep_loop, daemon=True).start()
    port = int(os.environ.get("SAFETY_LAYER_PORT", 5004))
    app.run(host="0.0.0.0", port=port, debug=False)
