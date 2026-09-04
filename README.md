# Retail Voice AI Assistant — Backend

Multilingual (Kannada/Hindi/Malayalam) voice assistant for Indian retail store
owners, sitting on a mock POS for this internal-testing phase. See
`00_overview_and_architecture.md` for the full project contract.

## Layout

```
00_overview_and_architecture.md   ← read this first
01-06_*.md                        ← per-chunk specs
language-layer/                   ← Chunk 2: Sarvam STT/TTS
brain-layer/                      ← Chunk 3: Claude intent routing
safety-layer/                     ← Chunk 5: confirmation + audit log
data-layer/                       ← Chunk 4: mock POS
render.yaml                       ← Chunk 6: one-blueprint deploy for all four
RUNNING_LOCALLY.md                ← Chunk 6: how to run/deploy this
```

The Interface Layer (Chunk 1) is a separate front-end project — not part of
this backend repo yet.

## Quick start

See `RUNNING_LOCALLY.md` for local dev setup and Render deployment.
