# Language Layer (Chunk 2)

Speech-to-text and text-to-speech for Kannada, Hindi, and Malayalam, wrapping the Sarvam
AI API. See `../00_overview_and_architecture.md` for the full project contract this chunk
implements.

## Setup

```bash
npm install
cp .env.example .env
# then edit .env and paste your real SARVAM_API_KEY
```

If you don't have a Sarvam API key yet, **leave `.env` empty or don't create it at all** —
the service automatically runs in **mock mode** and returns realistic canned responses.
This lets whoever is building the Interface Layer (Chunk 1) or Brain Layer (Chunk 3) build
and test against this service immediately, without waiting on API access.

## Running

```bash
npm start
```

Starts on `http://localhost:5001` by default. You'll see a log line telling you whether
it's running in mock mode or hitting the real Sarvam API.

## Endpoints

### `POST /stt` — speech (or typed text) in → transcribed text out

Request (voice):
```json
{
  "type": "audio_input",
  "audio_base64": "<base64 wav/mp3/etc audio>",
  "format": "wav",
  "language": "kn",
  "session_id": "sess_001"
}
```

Request (typed text fallback, per Chunk 1's doc):
```json
{ "type": "text_input", "text": "how much sugar stock", "language": "kn", "session_id": "sess_001" }
```

Response (matches section 4b of the overview doc):
```json
{
  "type": "transcribed_text",
  "text_original": "ಸಕ್ಕರೆ ಸ್ಟಾಕ್ ಎಷ್ಟಿದೆ",
  "text_language": "kn",
  "text_english": "how much sugar stock is there",
  "session_id": "sess_001"
}
```

### `POST /tts` — text in → spoken audio out

Request (matches section 4e of the overview doc):
```json
{
  "type": "response_text",
  "text_english": "You have 42 kg of sugar in stock.",
  "target_language": "kn",
  "session_id": "sess_001"
}
```

Response:
```json
{
  "type": "audio_output",
  "audio_base64": "<base64 wav audio>",
  "format": "wav",
  "text_display": "You have 42 kg of sugar in stock.",
  "session_id": "sess_001"
}
```

### `GET /health`
Quick check — returns `{ "status": "ok", "mock_mode": true|false }`.

## Testing it yourself

```bash
# health check
curl http://localhost:5001/health

# typed-text path (no real audio needed, easiest way to sanity-check the pipeline)
curl -X POST http://localhost:5001/stt \
  -H "Content-Type: application/json" \
  -d '{"type":"text_input","text":"add twenty five packets of atta","language":"kn","session_id":"test1"}'

# tts
curl -X POST http://localhost:5001/tts \
  -H "Content-Type: application/json" \
  -d '{"type":"response_text","text_english":"You have 42 kg of sugar in stock.","target_language":"kn","session_id":"test1"}'
```

For real audio testing: record a short phrase in Kannada/Hindi/Malayalam, base64-encode
it (`base64 -i your_clip.wav`), and paste it into the `audio_base64` field of an
`audio_input` request.

## The number rule

Every number that comes out of this service — in `text_original` and `text_english` — is
guaranteed to be in digit form, never spelled out as words. This is enforced two ways:

1. Sarvam's own `transcribe` mode already normalizes spoken numbers to digits in the
   native-language output (this is documented Sarvam behavior, not something we built).
2. `src/numberNormalize.js` is a defensive second pass on the English text, converting any
   spelled-out number words (`"forty two"` → `"42"`, `"one thousand two hundred"` →
   `"1200"`) that might otherwise slip through. Run `node -e` snippets against this module
   directly if you want to extend its vocabulary — it currently covers units, tens,
   hundreds, thousands, lakhs, and crores, which covers real retail phrasing.

## Known limitation to flag to whoever builds Chunk 6 (Integration)

Mock-mode TTS returns a tiny silent placeholder WAV, not real speech — it only proves the
field is populated end-to-end. Don't rely on it sounding right during integration testing;
switch in a real `SARVAM_API_KEY` before doing audio quality checks.
