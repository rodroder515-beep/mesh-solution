# Chunk 1: Interface Layer

**Read `00_overview_and_architecture.md` first — it defines the API contracts you must
follow.**

## Goal
Build the website front end where a store owner interacts with the assistant — by voice
or typed text — and sees/hears responses back.

## Scope for this phase
Internal test build only. No real client will see this. Keep it functional over polished,
but keep it usable enough that co-founders can test it end to end.

## What to build
1. A simple chat-style web page with:
   - A microphone button to record voice input
   - A text input as a fallback/alternative
   - A conversation view showing what was said and what the assistant replied
   - Audio playback for the assistant's spoken response
2. Language selector (Kannada / Hindi / Malayalam / English) — can default to
   auto-detect later, but start with an explicit selector to keep things simple.
3. A visible **confirmation UI** for any write action — e.g. "Update sugar stock to 42kg?
   [Confirm] [Cancel]" — this connects to the Safety Layer (Chunk 5). Do not let a write
   action execute without this appearing.
4. A basic session log view (even just a scrollable list) so during internal testing you
   can see every action the assistant took — useful for debugging before Chunk 5's formal
   logging is wired in.

## What you send downstream (to Language Layer)
Match the `audio_input` shape exactly from section 4a of the overview doc. If text was
typed instead of spoken, send:
```json
{ "type": "text_input", "text": "...", "language": "kn", "session_id": "sess_001" }
```

## What you receive back (from Language Layer, after it's converted the Brain's reply to speech)
```json
{
  "type": "audio_output",
  "audio_base64": "...",
  "format": "mp3",
  "text_display": "You have 42 kg of sugar in stock.",
  "session_id": "sess_001"
}
```

## Tech
React (or plain HTML/JS/CSS if you want something fast to stand up for internal testing).
Keep components simple: `<ChatWindow>`, `<MicButton>`, `<ConfirmationDialog>`,
`<LanguageSelector>`.

## Deliverable
A working local web page that can record/send audio or text, display the conversation,
play back responses, and show confirmation dialogs for write actions — talking to whatever
stub/mock endpoint the Language Layer exposes (agree on a local port, e.g.
`http://localhost:5001`, with whoever builds Chunk 2).

## Explicitly out of scope for this chunk
- Real authentication/login (not needed for internal testing)
- Styling/branding polish (functional only, for now)
- Connecting to the real Data Layer directly — you only ever talk to the Language Layer
