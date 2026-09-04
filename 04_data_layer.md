# Chunk 4: Data Layer (Mock POS)

**Read `00_overview_and_architecture.md` first — it defines the API contracts you must
follow.**

## Goal
Stand in for a real POS system with a mock database, so the rest of the pipeline can be
built and tested with zero real client data. This chunk **owns the shared mock dataset**
that every other chunk tests against.

## What to build

### 1. Mock dataset (`mock_inventory.json`) — publish this early, others depend on it
```json
{
  "items": [
    { "item_name": "sugar", "stock": 42, "unit": "kg", "price_per_unit": 45 },
    { "item_name": "rice", "stock": 120, "unit": "kg", "price_per_unit": 60 },
    { "item_name": "atta", "stock": 8, "unit": "packet", "price_per_unit": 55 }
  ],
  "orders": [
    { "order_id": "ORD1001", "item_name": "atta", "quantity": 50, "status": "pending", "placed_on": "2026-09-01" }
  ],
  "bills": []
}
```
Include at least 15-20 items and a handful of orders in varied states (pending, delivered,
cancelled) so downstream testing has enough to work with. Share this file with whoever is
building Chunks 1-3 as soon as it's ready — they should not invent their own sample data.

### 2. Action handlers
Implement the six actions the Brain Layer will call:
- `get_stock(item_name)` → current stock + unit
- `get_price(item_name)` → price per unit
- `get_order_status(order_id or item_name)` → status
- `update_stock(item_name, quantity, direction)` → new stock level
- `place_order(item_name, quantity)` → new order record
- `create_bill(items[], customer_info?)` → bill total + record

### 3. Persistence
For this phase, a simple JSON file or SQLite is enough — no need for a real database
server. Every write action should actually mutate the mock data so you can verify state
changes across a session (e.g. stock really does go down after an order is billed).

## What you receive (from Brain Layer, via Safety Layer)
Match `action_request` exactly (section 4c).

## What you send back (to Brain Layer)
Match `action_result` exactly (section 4d). On failure (item not found, invalid quantity,
etc.), set `success: false` and put a clear message in `error` — don't throw raw
exceptions across the API boundary.

## Tech
Node.js or Python, simple REST/local API. SQLite if you want proper querying, or a JSON
file with a small wrapper if you want to move fast — either is fine for this phase.

## Deliverable
A local service exposing the six actions above, backed by the shared mock dataset,
returning results in the `action_result` shape, with writes actually persisting during a
session. Include a short README on how to reset the mock data to its original state
between test runs (important — testers will be repeatedly billing/updating the same mock
shop).

## Explicitly out of scope for this chunk
- Any confirmation logic (that's the Safety Layer — you just execute what's sent to you
  once it's already been confirmed and routed to you)
- Any real POS integration — that is a future phase, not this one
