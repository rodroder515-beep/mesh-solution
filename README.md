# Retail Voice AI Assistant

Multilingual (Kannada/Hindi/Malayalam) voice assistant for Indian retail store
owners, sitting on a mock POS for this internal-testing phase. See
`00_overview_and_architecture.md` for the full project contract.

## Layout

```
00_overview_and_architecture.md   ← read this first
01-06_*.md                        ← per-chunk specs
interface-layer/                  ← Chunk 1: React/Vite web UI
language-layer/                   ← Chunk 2: Sarvam STT/TTS
brain-layer/                      ← Chunk 3: Claude intent routing
data-layer/                       ← Chunk 4: mock POS
safety-layer/                     ← Chunk 5: confirmation + audit log
gateway/                          ← Chunk 6: adapts Chunk 1's contract onto the pipeline
render.yaml                       ← Chunk 6: one-blueprint deploy for all six services
RUNNING_LOCALLY.md                ← Chunk 6: how to run/deploy this
```

## How it fits together

```
Interface Layer (browser)
        │  POST /api/v1/message | /api/v1/audio | /api/v1/confirm
        ▼
Gateway  ──▶  Language Layer (STT/TTS)  ──▶  Brain Layer (Claude routing)
                                                     │
                                                     ▼
                                    Safety Layer (confirmation gate + audit log)
                                                     │
                                                     ▼
                                        Data Layer (mock POS)
```

## Quick start

See `RUNNING_LOCALLY.md` for local dev setup and Render deployment.
