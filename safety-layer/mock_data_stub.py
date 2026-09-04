"""
NOT Chunk 4. This is a tiny in-memory stand-in for the real Data Layer,
included only so the Safety Layer can be tested end to end before Chunk 4
exists. It follows the mock_inventory.json shape from
00_overview_and_architecture.md section 6, and the action_request /
action_result contract from sections 4c/4d.

Once the real Chunk 4 service exists, point DATA_LAYER_URL at it instead
and this file is no longer needed for anything but ad-hoc local testing.
"""

import itertools
import os

from flask import Flask, jsonify, request

app = Flask(__name__)

_order_id_counter = itertools.count(1002)
_bill_id_counter = itertools.count(1)

STATE = {
    "items": {
        "sugar": {"stock": 42, "unit": "kg", "price_per_unit": 45},
        "rice": {"stock": 120, "unit": "kg", "price_per_unit": 60},
        "atta": {"stock": 8, "unit": "packet", "price_per_unit": 55},
    },
    "orders": {
        "ORD1001": {
            "order_id": "ORD1001",
            "item_name": "atta",
            "quantity": 50,
            "status": "pending",
            "placed_on": "2026-09-01",
        }
    },
    "bills": {},
}


def ok(data, session_id):
    return {"type": "action_result", "success": True, "data": data, "error": None, "session_id": session_id}


def fail(error, session_id):
    return {"type": "action_result", "success": False, "data": None, "error": error, "session_id": session_id}


@app.route("/action_request", methods=["POST"])
def action_request():
    req = request.get_json(force=True)
    action = req.get("action")
    params = req.get("params") or {}
    session_id = req.get("session_id")

    if action == "get_stock":
        item = STATE["items"].get(params.get("item_name"))
        if not item:
            return jsonify(fail("item_not_found", session_id))
        return jsonify(ok({"item_name": params["item_name"], "current_stock": item["stock"], "unit": item["unit"]}, session_id))

    if action == "get_price":
        item = STATE["items"].get(params.get("item_name"))
        if not item:
            return jsonify(fail("item_not_found", session_id))
        return jsonify(ok({"item_name": params["item_name"], "price_per_unit": item["price_per_unit"]}, session_id))

    if action == "get_order_status":
        order = STATE["orders"].get(params.get("order_id"))
        if not order:
            return jsonify(fail("order_not_found", session_id))
        return jsonify(ok(order, session_id))

    if action == "update_stock":
        item = STATE["items"].get(params.get("item_name"))
        if not item:
            return jsonify(fail("item_not_found", session_id))
        qty = params.get("quantity", 0)
        direction = params.get("direction", "add")
        item["stock"] += qty if direction == "add" else -qty
        return jsonify(ok({"item_name": params["item_name"], "new_stock": item["stock"], "unit": item["unit"]}, session_id))

    if action == "place_order":
        if params.get("item_name") not in STATE["items"]:
            return jsonify(fail("item_not_found", session_id))
        order_id = f"ORD{next(_order_id_counter)}"
        order = {
            "order_id": order_id,
            "item_name": params.get("item_name"),
            "quantity": params.get("quantity"),
            "status": "pending",
            "placed_on": "2026-09-04",
        }
        STATE["orders"][order_id] = order
        return jsonify(ok(order, session_id))

    if action == "create_bill":
        items = params.get("items", [])
        total = 0
        for line in items:
            item = STATE["items"].get(line.get("item_name"))
            if not item:
                return jsonify(fail(f"item_not_found: {line.get('item_name')}", session_id))
            total += item["price_per_unit"] * line.get("quantity", 0)
        bill_id = f"BILL{next(_bill_id_counter)}"
        bill = {"bill_id": bill_id, "items": items, "total": total}
        STATE["bills"][bill_id] = bill
        return jsonify(ok(bill, session_id))

    return jsonify(fail(f"unknown_action: {action}", session_id))


if __name__ == "__main__":
    port = int(os.environ.get("MOCK_DATA_STUB_PORT", 5003))
    app.run(host="0.0.0.0", port=port, debug=False)
