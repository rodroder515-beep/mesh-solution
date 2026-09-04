# Running the Backend — Local + Render

This is the Chunk 6 (Integration) doc. It covers the four backend services
(Language, Brain, Safety, Data — Chunks 2/3/5/4). The Interface Layer
(Chunk 1) is a separate front-end piece that talks to Language Layer's
`/stt` and `/tts` endpoints; it's not part of this backend deploy.

## The pipeline

```
Interface --> Language(5001) --> Brain(5002) --> Safety(5004) --> Data(5003)
                  ^                                                    |
                  |________________________ result flows back _________|
```

Brain never talks to Data directly — every action request goes through
Safety, which is what enforces the confirmation gate on writes.

## Bugs found and fixed during integration

Chunks 2-5 were built independently against the shared contract in
`00_overview_and_architecture.md`, and two mismatches showed up once wired
together for real:

1. **Endpoint path mismatch, Brain -> Safety.** Brain's `dataClient.js`
   was posting to `{DOWNSTREAM_URL}/action`, but the Safety Layer only
   exposes `/action_request` (`/action` is the Data Layer's own path, which
   Brain never calls directly in the real pipeline). Fixed in
   `brain-layer/src/dataClient.js` and `brain-layer/src/mockDataLayer.js`.
2. **Port collision.** Data Layer and Brain Layer both defaulted to port
   `5002`. Data Layer now defaults to `5003`, matching what Safety Layer's
   `data_client.py` already assumed.
3. **Safety -> Data URL guess.** Safety Layer's `DATA_LAYER_URL` default
   pointed at `.../action_request` (a guess made before Chunk 4 existed).
   The real Data Layer exposes `/action`. Fixed the default in
   `safety-layer/data_client.py`.

Standardized local ports: **Language 5001, Brain 5002, Data 5003, Safety
5004.**

## Running locally

Four terminals, in this order (Data and Language don't depend on anything
else, so start those first):

```bash
# Terminal 1 — Data Layer
cd data-layer
npm install
npm start                  # http://localhost:5003

# Terminal 2 — Safety Layer
cd safety-layer
pip install -r requirements.txt
cp .env.example .env       # DATA_LAYER_URL already defaults correctly for local
python app.py               # http://localhost:5004

# Terminal 3 — Brain Layer
cd brain-layer
npm install
cp .env.example .env
# edit .env: set ANTHROPIC_API_KEY, and set DOWNSTREAM_URL=http://localhost:5004
npm start                  # http://localhost:5002

# Terminal 4 — Language Layer
cd language-layer
npm install
cp .env.example .env       # leave SARVAM_API_KEY blank to run in mock mode
npm start                  # http://localhost:5001
```

Check everything's up:

```bash
curl http://localhost:5003/health
curl http://localhost:5004/health
curl http://localhost:5002/health
curl http://localhost:5001/health
```

## End-to-end smoke test (text-only, no Interface Layer needed yet)

This exercises the full Language -> Brain -> Safety -> Data round trip,
including the confirmation gate on a write action.

```bash
# 1. Read-only lookup, no confirmation needed
curl -s -X POST http://localhost:5001/stt \
  -H "Content-Type: application/json" \
  -d '{"type":"text_input","text":"how much sugar do we have","language":"en","session_id":"smoke1"}' \
| python3 -c "import sys,json,urllib.request; \
t=json.load(sys.stdin); \
r=urllib.request.urlopen(urllib.request.Request('http://localhost:5002/process', \
  data=json.dumps(t).encode(), headers={'Content-Type':'application/json'})); \
print(json.load(r))"

# 2. A write action — this one will come back from Brain as a plain
#    response_text describing the SAFETY LAYER's confirmation prompt, since
#    Brain -> Safety -> (parked, awaiting confirmation) is all synchronous
#    in this build. Check safety-layer's terminal output / log file for the
#    confirmation_id, then confirm it:
curl -s -X POST http://localhost:5004/confirmation_response \
  -H "Content-Type: application/json" \
  -d '{"confirmed": true, "session_id": "smoke2", "confirmation_id": "<paste from log>"}'
```

(The Interface Layer, once built, is what will surface the confirmation
prompt as a UI dialog and post back to Safety Layer's
`/confirmation_response` on the user's tap — see `01_interface_layer.md`.)

## Resetting mock data between test runs

```bash
curl -X POST http://localhost:5003/reset
# or: cd data-layer && npm run reset
```

## Deploying to Render

A `render.yaml` Blueprint at the repo root deploys all four services and
wires `DOWNSTREAM_URL` / `DATA_LAYER_URL` automatically using Render's own
service URLs — you don't need to copy-paste `.onrender.com` URLs between
dashboards.

1. Push this repo to GitHub.
2. In the Render dashboard: **New -> Blueprint**, point it at the repo.
3. Render will prompt for two secrets it can't infer on its own:
   - `brain-layer` → `ANTHROPIC_API_KEY`
   - `language-layer` → `SARVAM_API_KEY` (optional — leave blank to run
     Language Layer in mock mode)
4. Sync. All four services deploy; Safety and Brain pick up each other's
   real Render URLs automatically.

**Free-plan caveat:** all four services default to Render's free plan,
which spins down after 15 minutes idle and takes ~30-60s to wake on the
next request. That can eat into the Safety Layer's 60s confirmation
timeout on a cold start. If you hit that during testing, bump `data-layer`
and `safety-layer` to the `starter` plan in `render.yaml`.

## Explicitly out of scope for this backend deploy
- Interface Layer (Chunk 1) — separate front-end piece, not in this repo yet
- Real POS integration — Data Layer stays mock-only for this phase
