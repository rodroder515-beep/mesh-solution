# Chunk 5: Safety Layer

Confirmation + logging middleware between the Brain Layer and the Data Layer.
Built against `00_overview_and_architecture.md` and `05_safety_layer.md`.

## What's here

| File | Purpose |
|---|---|
| `app.py` | The Safety Layer service itself (Flask). Start here. |
| `store.py` | In-memory pending-confirmation tracker with timeout. |
| `logger.py` | Append-only JSONL audit logger. |
| `data_client.py` | HTTP client that forwards to the Data Layer. |
| `mock_data_stub.py` | **Not Chunk 4.** A tiny in-memory stand-in for the Data Layer, only for testing this chunk in isolation before the real one exists. |
| `test_safety_layer.py` | Self-contained end-to-end test — spins up the stub + this service and exercises confirm / cancel / timeout / independent-enforcement paths. |

## How it enforces the spec

1. **Independent write-action check.** `WRITE_ACTIONS = {"update_stock", "place_order", "create_bill"}`
   in `app.py` is checked regardless of the `requires_confirmation` flag the Brain Layer
   sent. If the Brain mislabels a write as `requires_confirmation: false`, the Safety Layer
   still blocks it and demands confirmation (see Test 5 in the test script).
2. **No silent writes.** A write `action_request` is never forwarded to the Data Layer from
   `/action_request` — it's parked in `store.py` and a `confirmation_required` message is
   returned instead. The Data Layer only ever sees it after `/confirmation_response` arrives
   with `confirmed: true` inside the timeout window.
3. **Everything is logged**, one JSON object per line in `safety_layer_actions.jsonl`
   (path configurable via `SAFETY_LAYER_LOG_PATH`): every action received, every
   confirmation sent, every confirm/cancel/timeout, and the actual result. Read-only
   lookups are logged too, just without the confirmation round-trip.
4. **Undo groundwork.** For `update_stock`, the Safety Layer calls `get_stock` on the Data
   Layer *before* forwarding the write, and logs that as `pre_state` alongside the
   `post_state` from the actual result. That's enough to reconstruct a manual undo
   (`new_stock - pre_state.current_stock` gives you the delta to reverse). For
   `place_order` / `create_bill`, there's no "previous value" to snapshot since they create
   new records — undo there means cancelling/voiding the record whose ID is in
   `post_state`, which is already in the log.
5. **Timeouts are logged even if nobody calls back.** A background thread sweeps expired
   pending confirmations every 5 seconds and logs a `confirmation_timeout` even if the
   Interface Layer never sends a `/confirmation_response` at all (e.g. the user just closes
   the tab).

## Endpoints

### `POST /action_request`
Body: an `action_request` (section 4c of the overview doc).
- Read-only action → forwarded immediately, returns an `action_result` (4d) directly.
- Write action → returns:
  ```json
  {
    "type": "confirmation_required",
    "session_id": "sess_001",
    "confirmation_id": "uuid-...",
    "message": "About to add 10 of sugar in stock — confirm?",
    "action_request": { ...the original request, echoed back... },
    "timeout_seconds": 60
  }
  ```

### `POST /confirmation_response`
Body:
```json
{ "confirmed": true, "session_id": "sess_001", "confirmation_id": "uuid-..." }
```
Returns an `action_result` (4d). `error` will be one of `cancelled_by_user`,
`confirmation_timeout`, `confirmation_not_found`, or `session_mismatch` when the write
didn't go through; otherwise it's the Data Layer's real result.

### `GET /health`
Basic liveness check.

## Configuration (environment variables)

| Var | Default | Meaning |
|---|---|---|
| `SAFETY_LAYER_PORT` | `5004` | Port this service listens on. |
| `DATA_LAYER_URL` | `http://localhost:5003/action` | Where the real Chunk 4 (Data Layer) service lives. Confirmed against the actual Data Layer implementation during Chunk 6 integration — it exposes `POST /action`, not `/action_request` (that path is this service's own, and is also used by `mock_data_stub.py`). |
| `CONFIRMATION_TIMEOUT_SECONDS` | `60` | How long a pending write waits for confirmation before auto-expiring, per the spec. |
| `SAFETY_LAYER_LOG_PATH` | `safety_layer_actions.jsonl` | Where the audit log is written. |

## Running it

```bash
pip install -r requirements.txt
export DATA_LAYER_URL="http://localhost:<chunk4-port>/action_request"   # once Chunk 4 exists
python app.py
```

Whoever builds Chunk 6 (Integration) can either run this as its own process (as set up
here) or import the Flask app / route functions directly as middleware — the doc leaves
that choice open. This build defaults to a standalone process since that's simplest to
reason about and test independently, which is what this phase calls for.

## Testing

No real Chunk 4 needed. This spins up the mock Data Layer stub and this service together
on throwaway ports and runs through confirm / cancel / timeout / independent-enforcement:

```bash
python test_safety_layer.py
```

It prints every step and, at the end, the full contents of the audit log so you can see
exactly what got recorded for each path. All assertions are checked automatically — a
failed enforcement or a broken round-trip will raise, not just print something you have to
eyeball.

## Explicitly out of scope (per the chunk doc)

- Deciding what action to take (Brain Layer, Chunk 3)
- Actually executing the write (Data Layer, Chunk 4)
- Rendering the confirmation dialog (Interface Layer, Chunk 1) — this service only defines
  the `confirmation_required` message contract that dialog is built from.
