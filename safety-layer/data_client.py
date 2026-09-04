"""
Thin HTTP client for talking to the Data Layer (Chunk 4).

ASSUMPTION (document/adjust when Chunk 4 is actually built): the Data Layer
exposes a single POST endpoint that accepts the action_request shape
(section 4c of the overview doc) and returns the action_result shape
(section 4d). If Chunk 4 ends up exposing something different (e.g. one
endpoint per action, like POST /get_stock), change only this file — nothing
else in the Safety Layer needs to know.
"""

import os

import requests

DATA_LAYER_URL = os.environ.get(
    "DATA_LAYER_URL", "http://localhost:5003/action"
)


def call_data_layer(action_request, timeout=10):
    """Forward an action_request to the Data Layer and return its
    action_result. Never lets a raw exception escape across this boundary —
    on any transport failure we still return a well-formed action_result
    with success: False, per the contract in 00_overview_and_architecture.md."""
    try:
        resp = requests.post(DATA_LAYER_URL, json=action_request, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:  # noqa: BLE001 - intentionally broad, this is a boundary
        return {
            "type": "action_result",
            "success": False,
            "data": None,
            "error": f"data_layer_unreachable: {e}",
            "session_id": action_request.get("session_id"),
        }
