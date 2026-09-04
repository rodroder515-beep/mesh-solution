# Chunk 2: Language Layer

**Read `00_overview_and_architecture.md` first — it defines the API contracts you must
follow.**

## Goal
Convert spoken Kannada/Hindi/Malayalam into text the Brain Layer can reason over, and
convert the Brain's text response back into spoken audio in the right language.

## What to build
1. **Speech-to-text (STT)**: wrap the Sarvam AI STT API. Input: audio file/blob from the
   Interface Layer. Output: transcribed text, in the original language AND an English
   translation (Sarvam or a secondary translation call — your choice, document which).
2. **Text-to-speech (TTS)**: wrap the Sarvam AI TTS API. Input: English text response from
   the Brain Layer + target language. Output: audio in the target language.
3. **The hard rule (from earlier planning, do not skip this)**: any numbers — quantities,
   prices, amounts, order numbers — must always be represented in English/digit form, never
   as native-language number-words, in every text payload you pass onward. If Sarvam's
   transcription gives you a number in Kannada/Hindi/Malayalam words, normalize it to
   digits before passing it on. This exists because regional numeral transcription is the
   least reliable part of the pipeline and this product touches money.

## What you receive (from Interface Layer)
Match `audio_input` (section 4a) or the `text_input` shape from Chunk 1's doc.

## What you send onward (to Brain Layer)
Match `transcribed_text` exactly (section 4b of the overview doc):
```json
{
  "type": "transcribed_text",
  "text_original": "...",
  "text_language": "kn",
  "text_english": "...",
  "session_id": "sess_001"
}
```

## What you receive back (from Brain Layer, to speak)
Match `response_text` (section 4e):
```json
{
  "type": "response_text",
  "text_english": "...",
  "target_language": "kn",
  "session_id": "sess_001"
}
```

## What you send back to Interface Layer
Match the `audio_output` shape from Chunk 1's doc (audio + display text).

## Tech
- Sarvam AI API for STT and TTS (API key handling — use environment variables, never
  hardcode).
- Node.js or Python service exposing a small local API (agree on port with Chunk 1 and
  Chunk 3 builders — e.g. `localhost:5001`).

## Testing without real client data
Record a handful of sample phrases yourselves in Kannada/Hindi/Malayalam covering: stock
lookup, price lookup, order status, stock update, order placement, billing — use these as
your test set. Include a few with spoken numbers to specifically test the digit-
normalization rule above.

## Deliverable
A local service that takes audio in, returns clean bilingual text out (and the reverse for
responses), with the number-normalization rule verifiably working on test recordings.

## Explicitly out of scope for this chunk
- Deciding what action to take with the text (that's Chunk 3, the Brain)
- Any UI (that's Chunk 1)
