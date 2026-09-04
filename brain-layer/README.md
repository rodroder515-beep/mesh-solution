# Chunk 3: Brain Layer

Intent understanding + action routing for the Retail Voice AI Assistant. Takes English
text from the Language Layer, decides which of the six supported actions applies (or asks
a clarifying question), forwards an `action_request` downstream, and turns the
`action_result` it gets back into a natural-language `response_text`.

Implements the contract in `00_overview_and_architecture.md` — read that first if you
haven't. This chunk only knows about six actions: `get_stock`, `get_price`,
`get_order_status`, `update_stock`, `place_order`, `create_bill`.

## Setup

```bash
cd brain-layer
npm install
cp .env.example .env
# edit .env: set ANTHROPIC_API_KEY
```

## Running standalone (before Chunk 4/5 exist)

This repo includes a **placeholder mock Data Layer** (`src/mockDataLayer.js`) so you can
test the Brain Layer end-to-end right now, without waiting on Chunk 4. It implements the
same `action_request`/`action_result` contract and the same `mock_inventory.json` shape
described in `04_data_layer.md`, so swapping in the real Chunk 4 service later is just a
matter of pointing `DOWNSTREAM_URL` at it instead.

**This placeholder has no confirmation gating** — that's the Safety Layer's (Chunk 5) job,
not the Brain Layer's. Don't mistake successful writes against this mock for a fully safe
pipeline; the real pipeline requires Brain → Safety → Data (see `00_overview_and_architecture.md`
and note the `DOWNSTREAM_URL` comment in `.env.example`).

Two terminals:

```bash
# Terminal 1
npm run mock-data       # placeholder Data Layer on :5003

# Terminal 2
npm start                # Brain Layer on :5002
```

## Testing

### 1. Classifier-only tests (no server needed, calls Claude directly)

```bash
npm run test:classify
```

Runs every phrase in `test/testPhrases.js` (5-8 per action, plus ambiguous and numeric
edge cases) through `classifyIntent()` and checks the result against the expected action.
Prints a pass/fail summary.

### 2. Full pipeline test (needs both servers running)

```bash
# with mock-data and the brain server both running, in a third terminal:
npm run test:pipeline
```

Sends a handful of realistic `transcribed_text` payloads to `POST /process` and prints
the `response_text` that comes back — read-only lookups, write actions, and one
deliberately ambiguous phrase that should trigger a clarifying question instead of a
guess.

## API

### `POST /process`

Request body — matches `transcribed_text` (section 4b of the overview doc):

```json
{
  "type": "transcribed_text",
  "text_original": "ಸಕ್ಕರೆ ಸ್ಟಾಕ್ ಎಷ್ಟಿದೆ",
  "text_language": "kn",
  "text_english": "how much sugar stock is there",
  "session_id": "sess_001"
}
```

Response — matches `response_text` (section 4e):

```json
{
  "type": "response_text",
  "text_english": "You have 42 kg of sugar in stock.",
  "target_language": "kn",
  "session_id": "sess_001"
}
```

### `GET /health`

Returns `{ "status": "ok", "layer": "brain" }`.

## How classification works

`src/classifier.js` calls the Anthropic API with a system prompt scoped tightly to the six
actions (each with example utterances) and forces a single structured `tool_use` call
(`route_action`) — no free-text parsing. The model either:

- returns `decision: "action"` with an `action` + `params`, or
- returns `decision: "clarify"` with a `clarifying_question`

Every classification decision is logged to `logs/classification.log` (JSON lines) via
`src/logger.js`, regardless of which path it took — useful for spotting misroutes during
testing.

## Files

| File | Purpose |
|---|---|
| `src/server.js` | Express app, `POST /process` entry point |
| `src/classifier.js` | Claude-backed intent router (forced tool use) |
| `src/actions.js` | Shared list of the six actions + which ones need confirmation |
| `src/dataClient.js` | Forwards `action_request` downstream, returns `action_result` |
| `src/responseGenerator.js` | Templates `action_result` → natural-language `response_text` |
| `src/logger.js` | Append-only classification decision log |
| `src/mockDataLayer.js` | ⚠️ Placeholder Data Layer for standalone testing only — not Chunk 4 |
| `test/testPhrases.js` | Sample utterances per action + ambiguous/edge cases |
| `test/runClassifierTests.js` | Runs phrases through the classifier directly |
| `test/runPipelineTest.js` | Runs phrases through the full HTTP pipeline |

## Explicitly out of scope (per `03_brain_layer.md`)

- **Confirmation logic** — the Brain Layer sets `requires_confirmation: true` honestly on
  write actions, but does not enforce it. That's the Safety Layer (Chunk 5), which
  independently re-derives which actions need confirmation and does not trust this flag.
- **Executing writes** — that's the Data Layer (Chunk 4).
- **Speech/audio** — upstream and downstream of this chunk is always plain text.

## Wiring into the real pipeline (Chunk 6)

When Chunk 4 and Chunk 5 exist:

1. Point `DOWNSTREAM_URL` in `.env` at the **Safety Layer**, not the Data Layer directly.
2. Retire `src/mockDataLayer.js` (or keep it around purely for offline classifier testing —
   just don't run it as part of the real pipeline).
3. Chunk 4's real service should accept the same `POST /action` shape this placeholder
   does, so no changes should be needed here.
