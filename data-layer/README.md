# Data Layer (Chunk 4) — Mock POS

Stands in for a real POS system so the rest of the pipeline can be built and tested with
**zero real client data**. See `../00_overview_and_architecture.md` for the full project
contract this chunk implements. This chunk **owns the shared mock dataset** — Chunks 1, 2,
and 3 should test against this data rather than inventing their own.

## Setup

```bash
npm install
```

No API keys needed — this is entirely self-contained mock data.

## Running

```bash
npm start
```

Starts on `http://localhost:5003` by default.

## The dataset

`data/seed_inventory.json` is the original, never-mutated reference dataset — 18 items
across typical kirana-store categories (grains, oils, spices, dairy, household), plus 4
sample orders in varied states (pending, delivered, cancelled).

`data/mock_inventory.json` is the **working copy** that actually gets read and written
during testing — it's created automatically from the seed on first run. This file is
gitignored; it's expected to get messy as you test billing and stock updates.

### Resetting between test runs

```bash
npm run reset
```

or, if the server is already running:

```bash
curl -X POST http://localhost:5003/reset
```

Do this before each fresh test session — testers will repeatedly bill/update the same mock
shop, so state doesn't reset itself.

### Inspecting current state

```bash
curl http://localhost:5003/inventory
```

Not part of the formal contract, just useful while debugging.

## The six actions

| Action | Params | Notes |
|---|---|---|
| `get_stock` | `item_name` | read-only |
| `get_price` | `item_name` | read-only |
| `get_order_status` | `order_id` **or** `item_name` | read-only; if `item_name` given and multiple orders exist, returns the most recent |
| `update_stock` | `item_name`, `quantity`, `direction` (`"add"` \| `"subtract"`, default `"add"`) | write; fails cleanly if subtracting more than current stock |
| `place_order` | `item_name`, `quantity` | write; auto-generates a new `order_id`, status starts `"pending"` |
| `create_bill` | `items: [{item_name, quantity}]`, `customer_name` (optional) | write; validates every line **before** applying any of them — a bill never partially applies. Fails if any item is unknown or short on stock. |

## Endpoint

### `POST /action`

Request (matches section 4c of the overview doc):
```json
{
  "type": "action_request",
  "action": "get_stock",
  "params": { "item_name": "sugar" },
  "requires_confirmation": false,
  "session_id": "sess_001"
}
```

Response (matches section 4d):
```json
{
  "type": "action_result",
  "success": true,
  "data": { "item_name": "sugar", "current_stock": 42, "unit": "kg" },
  "error": null,
  "session_id": "sess_001"
}
```

On failure, `success` is `false`, `data` is `null`, and `error` has a human-readable
message — never a raw exception.

## Testing it yourself

```bash
curl -X POST http://localhost:5003/action \
  -H "Content-Type: application/json" \
  -d '{"type":"action_request","action":"get_stock","params":{"item_name":"sugar"},"session_id":"test1"}'

curl -X POST http://localhost:5003/action \
  -H "Content-Type: application/json" \
  -d '{"type":"action_request","action":"create_bill","params":{"customer_name":"Ramesh","items":[{"item_name":"sugar","quantity":2},{"item_name":"rice","quantity":5}]},"session_id":"test1"}'
```

All six handlers were also exercised directly (bypassing the HTTP layer) during
development, including edge cases — unknown item, insufficient stock on both
`update_stock` and `create_bill`, and an unknown action name — and all fail cleanly with a
`success: false` and a clear `error` message rather than throwing.

## A note for whoever builds Chunk 5 (Safety Layer)

This chunk does **not** implement any confirmation logic itself — it executes whatever
action it's given immediately. The Safety Layer is what's supposed to sit in front of this
and hold back `update_stock` / `place_order` / `create_bill` until confirmed. Don't skip
wiring that up before this ever gets near a real client.

## Explicitly out of scope for this chunk
- Confirmation logic (Chunk 5)
- Any real POS integration — that's a future phase, not this one
