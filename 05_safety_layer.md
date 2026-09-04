# Chunk 5: Safety Layer

**Read `00_overview_and_architecture.md` first — it defines the API contracts you must
follow.**

## Goal
Sit between the Brain Layer and the Data Layer. Make sure no write action (update_stock,
place_order, create_bill) ever executes without explicit confirmation, and log every single
action — confirmed or not — so the system is fully auditable. This is the layer that
protects client trust once this ever reaches a real shop, so treat it as non-negotiable
even though nothing here touches a real client yet.

## What to build

### 1. Confirmation state machine
When an `action_request` arrives with `requires_confirmation: true`:
1. Do **not** forward it to the Data Layer yet.
2. Send a `confirmation_required` message back up toward the Interface Layer (via the
   Brain Layer) describing what's about to happen in plain language, e.g. "About to update
   sugar stock to 42kg — confirm?"
3. Wait for a `confirmation_response` (`{ "confirmed": true/false, "session_id": "..." }`).
4. If `confirmed: true`, forward the original `action_request` to the Data Layer and return
   its `action_result` as normal.
5. If `confirmed: false` or a timeout occurs (suggest 60 seconds), do not execute — return
   an `action_result` with `success: false` and `error: "cancelled_by_user"` or
   `"confirmation_timeout"`.

For `requires_confirmation: false` (read-only actions), pass through immediately — no need
to slow down lookups.

**Independent check, don't just trust the Brain Layer's flag**: maintain your own list of
which actions are write actions (`update_stock`, `place_order`, `create_bill`) and require
confirmation for those regardless of what `requires_confirmation` says in the incoming
request. This is a deliberate second layer of defense in case the Brain Layer
misclassifies something.

### 2. Action logging
Every action — read or write, confirmed or cancelled — gets logged with at minimum:
```json
{
  "timestamp": "2026-09-04T10:22:00Z",
  "session_id": "sess_001",
  "action": "update_stock",
  "params": { "item_name": "sugar", "quantity": 42 },
  "requires_confirmation": true,
  "confirmed": true,
  "result_success": true,
  "error": null
}
```
Append-only log (JSON lines file is fine for this phase). This becomes essential later for
debugging misroutes and, eventually, for showing a client exactly what the assistant did.

### 3. Undo (basic version for this phase)
For write actions, log enough of the pre-action state (e.g. previous stock level) that a
manual undo is possible by replaying the inverse action. Full one-click undo can come
later — for this phase, just make sure the log has what's needed to reconstruct it.

## What you receive / send
You sit transparently in the Brain ↔ Data path — same `action_request` / `action_result`
shapes as sections 4c/4d, plus the `confirmation_required` / `confirmation_response`
messages defined above, which round-trip through the Brain Layer to the Interface Layer's
confirmation dialog (see Chunk 1).

## Tech
Can be a thin middleware module rather than a separate service if that's simpler —
whoever builds Chunk 6 (Integration) will decide whether this runs as its own process or
as a function both Brain and Data import. Document your choice either way.

## Deliverable
A working confirmation round-trip (tested with at least one write action end to end:
request → confirmation prompt → confirm → execution → logged), plus a readable log file
after a test session showing every action taken.

## Explicitly out of scope for this chunk
- Deciding what action to take (Brain Layer)
- Executing the action (Data Layer)
- Rendering the confirmation dialog itself (Interface Layer — you just define the message
  contract it displays)
