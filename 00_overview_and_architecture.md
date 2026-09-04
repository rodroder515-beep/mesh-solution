# Retail Voice AI Assistant — Master Architecture & Build Plan

**Read this document first, before opening your assigned chunk doc.** This is the shared
contract that keeps every piece compatible even though different people/AIs are building
them independently and in parallel.

## 1. What we're building

A multilingual (Kannada, Hindi, Malayalam) voice-and-text AI assistant for Indian retail
store owners. It sits on top of a POS system and can:

- **Look up** stock levels, prices, order status (read-only)
- **Update** stock, place orders (write, needs confirmation)
- **Handle billing** (write, needs confirmation — highest risk)

## 2. Current build phase — IMPORTANT

**This entire build is internal only. Zero real client data, zero real client exposure —
not even on a trial page.** Every layer below must be built and fully tested against
**mock data** first. Nothing in this phase talks to a real POS system or a real client.
The mock Data Layer (Chunk 4) stands in for a real POS until we're confident everything
works end to end.

## 3. The four layers + safety wrapper

```
┌─────────────────────────────────────────────────────────┐
│  SAFETY LAYER — confirmation prompts, action logging,     │
│  undo, wraps around Brain + Data layers                   │
└─────────────────────────────────────────────────────────┘
   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │ INTERFACE │──▶│ LANGUAGE  │──▶│   BRAIN   │──▶│   DATA    │
   │  LAYER    │◀──│  LAYER    │◀──│   LAYER   │◀──│  LAYER    │
   │ (Chunk 1) │   │ (Chunk 2) │   │ (Chunk 3) │   │ (Chunk 4) │
   └───────────┘   └───────────┘   └───────────┘   └───────────┘
```

| Layer | Job | Chunk doc |
|---|---|---|
| Interface | Website chat/voice UI, captures audio or text input, plays back responses | `01_interface_layer.md` |
| Language | Speech-to-text and text-to-speech, Kannada/Hindi/Malayalam ↔ English | `02_language_layer.md` |
| Brain | Understands intent, decides which action to call, talks to Claude | `03_brain_layer.md` |
| Data | Mock POS/database — stock, pricing, orders, billing records | `04_data_layer.md` |
| Safety | Confirmation flow before any write, action logging, undo | `05_safety_layer.md` |
| Integration | Wires all layers together end to end, owned by whoever assembles the final build | `06_integration_orchestration.md` |

## 4. The shared API contract (this is what makes parallel building work)

Every layer talks to its neighbor **only** through these JSON shapes. If your chunk
respects these shapes, it will plug into whatever the other builders produce, even if you
never talk to them directly.

### 4a. Interface Layer → Language Layer
```json
{
  "type": "audio_input",
  "audio_base64": "...",
  "format": "wav",
  "session_id": "sess_001"
}
```

### 4b. Language Layer → Brain Layer
```json
{
  "type": "transcribed_text",
  "text_original": "ಸಕ್ಕರೆ ಸ್ಟಾಕ್ ಎಷ್ಟಿದೆ",
  "text_language": "kn",
  "text_english": "how much sugar stock is there",
  "session_id": "sess_001"
}
```
**Rule agreed earlier: any numbers (quantities, prices, amounts) must be transcribed/parsed
in English/digits, never as Kannada/Hindi/Malayalam number-words.** This is a hard rule for
Chunk 2 — it exists because regional-language numeral transcription is unreliable and this
is a money-handling product.

### 4c. Brain Layer → Data Layer (action request)
```json
{
  "type": "action_request",
  "action": "get_stock | update_stock | get_price | place_order | get_order_status | create_bill",
  "params": { "item_name": "sugar", "quantity": 10 },
  "requires_confirmation": true,
  "session_id": "sess_001"
}
```

### 4d. Data Layer → Brain Layer (action result)
```json
{
  "type": "action_result",
  "success": true,
  "data": { "item_name": "sugar", "current_stock": 42, "unit": "kg" },
  "error": null,
  "session_id": "sess_001"
}
```

### 4e. Brain Layer → Language Layer (response to speak back)
```json
{
  "type": "response_text",
  "text_english": "You have 42 kg of sugar in stock.",
  "target_language": "kn",
  "session_id": "sess_001"
}
```

### 4f. Safety Layer wraps 4c/4d
Any `action_request` where `requires_confirmation: true` must round-trip through a
confirmation step before the Data Layer executes it. See `05_safety_layer.md` for the exact
state machine. **Every action, confirmed or not, gets logged** — this is non-negotiable,
it's how you'll debug and how you'll build client trust later.

## 5. Tech stack (locked in from earlier planning — don't deviate without updating this doc)

- **Interface**: Website, not WhatsApp bot. Framework: React (or plain HTML/JS for the
  internal test build — keep it simple, this isn't client-facing yet).
- **Language**: Sarvam AI for STT/TTS (Kannada/Hindi/Malayalam). Numbers always in English.
- **Brain**: Claude (via Anthropic API) for intent understanding and action routing.
- **Data**: Mock database for this phase — simple JSON file or SQLite standing in for a
  real POS. Schema defined in `04_data_layer.md`.
- **Safety**: Confirmation + logging layer, framework-agnostic — implement as middleware
  between Brain and Data.

## 6. Mock data — single source of truth

All chunks must test against the **same mock dataset** so integration doesn't break on
data mismatches. Chunk 4 owns and publishes this dataset (`mock_inventory.json`). Every
other chunk imports it rather than inventing its own sample data.

## 7. Definition of done for this phase

The full pipeline works end to end **on mock data**, voice or text in Kannada/Hindi/
Malayalam, going through all four layers plus the safety wrapper, with every write action
confirmed and logged, before any client ever sees it. Only after this phase is fully
tested internally do we talk about a real client trial.

## 8. Chunk assignment tracker

| Chunk | Doc | Assigned to | Status |
|---|---|---|---|
| 0 | Overview (this doc) | — | done |
| 1 | Interface Layer | | not started |
| 2 | Language Layer | | not started |
| 3 | Brain Layer | | not started |
| 4 | Data Layer | | not started |
| 5 | Safety Layer | | not started |
| 6 | Integration | | not started |

Fill in "assigned to" as you hand chunks out to co-founders or other AI sessions.
