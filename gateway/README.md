# Gateway (Chunk 6)

Adapts the Interface Layer's (Chunk 1) expected API contract onto the real
Language → Brain → Safety → Data pipeline.

## Why this exists

Chunk 1 was built against a single backend exposing:
- `GET /health`
- `POST /api/v1/message` (text in)
- `POST /api/v1/audio` (voice in)
- `POST /api/v1/confirm` (confirm/cancel a pending write)

The real backend is four separate services talking to each other in a chain
(see `00_overview_and_architecture.md`). This gateway is what the frontend's
`VITE_LANGUAGE_API` should point at — it does the multi-hop calls on the
frontend's behalf and translates each response shape at the edges.

## Flow

**`POST /api/v1/message` / `POST /api/v1/audio`**
1. Forward to the Language Layer's `/stt` → get back `transcribed_text`.
2. Forward that to the Brain Layer's `/process`.
3. If Brain returns `response_text` → call Language Layer's `/tts` → return
   an `audio_output` to the frontend.
4. If Brain returns `confirmation_required` (a write action is pending) →
   also synthesize a spoken version of the prompt via `/tts`, then return a
   `confirmation_required` shape (action, prompt, details, audio) to the
   frontend.

**`POST /api/v1/confirm`**
1. Forward `{ session_id, confirmed }` to the Brain Layer's `/confirm`
   (Brain holds the `confirmation_id` mapping internally — the frontend
   never needs to know it).
2. Brain resolves it against the Safety Layer, gets the real result, and
   returns a natural-language `response_text`.
3. Gateway maps that to a `confirmation_result` (`status: success | cancelled`).

## Config

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `5000` | Port this service listens on. |
| `LANGUAGE_LAYER_URL` | `http://localhost:5001` | Chunk 2 service. |
| `BRAIN_LAYER_URL` | `http://localhost:5002` | Chunk 3 service. |

## Running

```bash
npm install
npm start
```

## Testing it yourself

```bash
curl -X POST http://localhost:5000/api/v1/message \
  -H "Content-Type: application/json" \
  -d '{"type":"text_input","text":"how much sugar do we have","language":"en","session_id":"t1"}'
```
