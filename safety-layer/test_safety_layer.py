"""
Self-contained end-to-end test for the Safety Layer.

Spins up the mock Data Layer stand-in and the Safety Layer itself as real
local HTTP servers (in-process, on throwaway ports), then exercises:
  1. A read-only lookup (should pass straight through, no confirmation)
  2. A write action that gets CONFIRMED
  3. A write action that gets CANCELLED
  4. A write action that TIMES OUT
  5. Independent enforcement: a write action where the Brain Layer
     incorrectly set requires_confirmation: false — the Safety Layer
     should still demand confirmation.

Run: python test_safety_layer.py
"""

import os
import sys
import time

# Config must be set BEFORE importing app.py / data_client.py, since they
# read these at import/module-load time.
os.environ["DATA_LAYER_URL"] = "http://localhost:5099/action_request"
os.environ["CONFIRMATION_TIMEOUT_SECONDS"] = "3"
os.environ["SAFETY_LAYER_LOG_PATH"] = "test_safety_actions.jsonl"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Fresh log file each run so output is easy to read.
if os.path.exists(os.environ["SAFETY_LAYER_LOG_PATH"]):
    os.remove(os.environ["SAFETY_LAYER_LOG_PATH"])

import threading

import requests
from werkzeug.serving import make_server

import mock_data_stub
import app as safety_app_module


def run_server(flask_app, port):
    server = make_server("localhost", port, flask_app)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server


def main():
    data_server = run_server(mock_data_stub.app, 5099)
    safety_server = run_server(safety_app_module.app, 5098)
    time.sleep(0.5)  # let both servers bind

    base = "http://localhost:5098"

    print("=== Test 1: read-only lookup (get_stock) — should NOT require confirmation ===")
    r = requests.post(
        f"{base}/action_request",
        json={
            "type": "action_request",
            "action": "get_stock",
            "params": {"item_name": "sugar"},
            "requires_confirmation": False,
            "session_id": "test_sess_1",
        },
    )
    print(r.json())
    assert r.json()["type"] == "action_result"

    print("\n=== Test 2: write action, CONFIRMED ===")
    r = requests.post(
        f"{base}/action_request",
        json={
            "type": "action_request",
            "action": "update_stock",
            "params": {"item_name": "sugar", "quantity": 10, "direction": "add"},
            "requires_confirmation": True,
            "session_id": "test_sess_2",
        },
    )
    conf = r.json()
    print("confirmation prompt:", conf)
    assert conf["type"] == "confirmation_required"
    r2 = requests.post(
        f"{base}/confirmation_response",
        json={"confirmed": True, "session_id": "test_sess_2", "confirmation_id": conf["confirmation_id"]},
    )
    print("result after confirm:", r2.json())
    assert r2.json()["success"] is True

    print("\n=== Test 3: write action, CANCELLED ===")
    r = requests.post(
        f"{base}/action_request",
        json={
            "type": "action_request",
            "action": "place_order",
            "params": {"item_name": "atta", "quantity": 20},
            "requires_confirmation": True,
            "session_id": "test_sess_3",
        },
    )
    conf = r.json()
    r2 = requests.post(
        f"{base}/confirmation_response",
        json={"confirmed": False, "session_id": "test_sess_3", "confirmation_id": conf["confirmation_id"]},
    )
    print("result after cancel:", r2.json())
    assert r2.json()["error"] == "cancelled_by_user"

    print("\n=== Test 4: write action, TIMEOUT (waiting past the 3s test timeout) ===")
    r = requests.post(
        f"{base}/action_request",
        json={
            "type": "action_request",
            "action": "create_bill",
            "params": {"items": [{"item_name": "rice", "quantity": 2}]},
            "requires_confirmation": True,
            "session_id": "test_sess_4",
        },
    )
    conf = r.json()
    time.sleep(4)
    r2 = requests.post(
        f"{base}/confirmation_response",
        json={"confirmed": True, "session_id": "test_sess_4", "confirmation_id": conf["confirmation_id"]},
    )
    print("result after timeout:", r2.json())
    assert r2.json()["error"] == "confirmation_timeout"

    print(
        "\n=== Test 5: independent enforcement — Brain says requires_confirmation: false "
        "for a write action, Safety Layer should override it ==="
    )
    r = requests.post(
        f"{base}/action_request",
        json={
            "type": "action_request",
            "action": "update_stock",
            "params": {"item_name": "rice", "quantity": 5, "direction": "remove"},
            "requires_confirmation": False,  # deliberately wrong
            "session_id": "test_sess_5",
        },
    )
    conf = r.json()
    print(conf)
    assert conf["type"] == "confirmation_required", "Safety Layer failed to override an incorrect flag!"
    requests.post(
        f"{base}/confirmation_response",
        json={"confirmed": True, "session_id": "test_sess_5", "confirmation_id": conf["confirmation_id"]},
    )

    print("\nAll assertions passed.\n")
    print("=== Log file contents (test_safety_actions.jsonl) ===")
    with open(os.environ["SAFETY_LAYER_LOG_PATH"], encoding="utf-8") as f:
        for line in f:
            print(line.strip())

    data_server.shutdown()
    safety_server.shutdown()


if __name__ == "__main__":
    main()
