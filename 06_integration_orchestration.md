# Chunk 6: Integration & Orchestration

**Read `00_overview_and_architecture.md` first.** This chunk is done last, after Chunks
1-5 each work in isolation against the shared contracts.

## Goal
Wire the four layers plus the Safety Layer together into one working end-to-end pipeline,
running entirely on mock data, so you (the founders) can test the full experience yourselves
before any client ever sees it.

## What to do

1. **Collect each chunk's service**, confirm each one runs standalone and respects its
   documented input/output shape (test each with a simple manual request before wiring
   them together — don't debug the whole pipeline at once if one piece is already broken).
2. **Wire the message flow**:
   Interface → Language → Brain → Safety → Data → Safety → Brain → Language → Interface
3. **Session handling**: make sure `session_id` is generated once by the Interface Layer
   per conversation and threaded through every hop unchanged — this is what lets the
   Safety Layer's confirmation round-trip find its way back to the right conversation.
4. **Error handling across boundaries**: if any layer returns an error or times out, the
   Interface Layer should show something sensible ("Sorry, I didn't catch that — try
   again") rather than hanging silently. Define a generic `error` message shape all layers
   can emit.
5. **End-to-end test script**: write down (or script) a full test session covering at
   least:
   - A read-only lookup in each of the three languages
   - A write action (e.g. update_stock) including the confirmation step, both confirmed
     and cancelled paths
   - An ambiguous phrase that should trigger a clarifying question rather than a wrong
     action
   - A number spoken in a native language, verifying it comes out correctly as a digit
     downstream (tests the Chunk 2 hard rule)
6. **Local run setup**: document how to start all services together (a single script or
   `docker-compose` if you want it clean, or just a README with the order to start things
   in — keep it simple for this phase, it only needs to work on your own machines).

## Deliverable
A single README (`RUNNING_LOCALLY.md`) plus whatever startup script you use, such that any
of the three co-founders can pull the code, start all five services, open the Interface
Layer in a browser, and run a full voice conversation against mock data — including a write
action with confirmation — without needing to know how any individual chunk was built
internally.

## After this chunk is done
This is the point where the "definition of done" from section 7 of the overview doc is
met. Only after this works reliably should you move toward exposing anything to a real
client — starting with a controlled internal demo, then the actual client trial.
