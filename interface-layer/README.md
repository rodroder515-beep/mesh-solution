# Store Assistant — Voice-First Interface (Chunk 1)

This repository contains **Chunk 1: Interface Layer** of the voice-first AI store assistant designed for small store owners.

Built with **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS**, featuring a minimalist, high-contrast, technical editorial aesthetic inspired by precision hardware and POS interfaces.

---

## 1. Quick Start (Local Run)

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev
```

The application will be running at `http://localhost:3000`.

---

## 2. Architecture & File Structure

```
├── .env.example                       # Environment template
├── index.html                         # HTML entry with Quantico font
├── metadata.json                      # App configuration & permissions
├── package.json                       # Dependencies & scripts
├── README.md                          # Documentation & handoff guide
├── src/
│   ├── api/
│   │   ├── languageApi.ts             # Dedicated client for Language Layer
│   │   └── mockLanguageApi.ts         # High-fidelity mock adapter with test cases
│   ├── components/
│   │   ├── AudioPlayer/
│   │   │   └── AudioPlayer.tsx        # Base64 audio decoder, play/pause, waveforms
│   │   ├── ChatWindow/
│   │   │   └── ChatWindow.tsx         # Central conversation feed & quick prompts
│   │   ├── ConfirmationDialog/
│   │   │   └── ConfirmationDialog.tsx # Mandatory write-action confirmation dialog
│   │   ├── Hero/
│   │   │   └── Hero.tsx               # Editorial staircase header (Quantico)
│   │   ├── InputBar/
│   │   │   └── InputBar.tsx           # Combined voice mic & text input bar
│   │   ├── LanguageSelector/
│   │   │   └── LanguageSelector.tsx   # Multilingual toggle (en, kn, hi, ml)
│   │   ├── MicButton/
│   │   │   └── MicButton.tsx          # Large voice controller with state machine
│   │   ├── Navbar/
│   │   │   └── Navbar.tsx             # Minimalist nav, status badge & dev tools
│   │   └── SessionLog/
│   │       └── SessionLog.tsx         # Internal debug panel for session telemetry
│   ├── hooks/
│   │   ├── useRecorder.ts             # MediaRecorder API microphone hook
│   │   └── useSession.ts              # Session ID persistence & telemetry logs
│   ├── types/
│   │   ├── api.ts                     # Strict Language Layer payload contracts
│   │   └── messages.ts                # UI message, sender, and log interfaces
│   ├── utils/
│   │   └── audio.ts                   # Base64 <-> Blob conversions & WAV synth
│   ├── App.tsx                        # Main application container
│   ├── index.css                      # Tailwind v4 theme, Chamfer geometry
│   ├── main.tsx                       # React root entry
│   └── vite-env.d.ts                  # Vite client env definitions
└── vite.config.ts                     # Vite build configuration
```

---

## 3. Connecting the Teammate's Language Layer (Chunk 2)

The frontend is completely decoupled from the backend intelligence (no Sarvam, Claude, or POS logic embedded).

### Step 1: Set Environment Variables
In your local `.env` file (or container environment):

```env
# Point to your running Language Layer service:
VITE_LANGUAGE_API="http://localhost:5001"

# Turn off mock mode to route all requests to real backend:
VITE_USE_MOCK="false"
```

### Step 2: API Contract Expected by the Frontend

#### A. Health Check
- **Endpoint**: `GET /health`
- **Response**: `200 OK` (Indicates `● CONNECTED` in top navbar)

#### B. Text Input Request
- **Endpoint**: `POST /api/v1/message`
- **Header**: `Content-Type: application/json`
- **Payload**:
```json
{
  "type": "text_input",
  "text": "How much sugar do we have?",
  "language": "en",
  "session_id": "sess_001"
}
```

#### C. Audio Input Request
- **Endpoint**: `POST /api/v1/audio`
- **Header**: `Content-Type: application/json`
- **Payload**:
```json
{
  "type": "audio_input",
  "audio_base64": "<base64-encoded-audio>",
  "format": "webm",
  "language": "en",
  "session_id": "sess_001"
}
```

#### D. Assistant Response (Audio Output)
When replying to the user:
```json
{
  "type": "audio_output",
  "audio_base64": "<base64-encoded-mp3-or-wav>",
  "format": "mp3",
  "text_display": "You have 42 kg of sugar in stock.",
  "session_id": "sess_001"
}
```

#### E. Confirmation Required (For Write Actions)
When an action modifies store inventory, creates orders, or issues bills:
```json
{
  "type": "confirmation_required",
  "action": "update_stock",
  "prompt": "Update sugar stock to 62 kg?",
  "details": "This action will modify store inventory records in the POS database.",
  "session_id": "sess_001",
  "audio_base64": "<optional-voice-prompt-base64>",
  "format": "wav"
}
```

#### F. Confirmation Response (Sent by Frontend)
The frontend will only send the user's explicit decision:
```json
{
  "confirmed": true,
  "session_id": "sess_001"
}
```
- Endpoint: `POST /api/v1/confirm`
- Return status:
```json
{
  "type": "confirmation_result",
  "status": "success",
  "message": "Action confirmed. Store data updated successfully.",
  "session_id": "sess_001"
}
```

---

## 4. Testing Acceptance Scenarios

You can verify all 6 acceptance criteria in Mock Mode right now:

1. **Test 1 — Text Query**:
   Type `"How much sugar do we have?"` and press Enter. The assistant returns stock levels with a playable voice indicator.
2. **Test 2 — Voice Recording**:
   Click the large **🎤 TAP TO SPEAK** button. The button pulses with a live timer. Click to finish speaking. The response appears with an audio playback waveform.
3. **Test 3 — Language Switch**:
   Click **ಕನ್ನಡ**, **हिन्दी**, or **മലയാളം** in the top navbar. Send a query and inspect the **SESSION LOG** panel on the right — verify that the outgoing payload includes `"language": "kn"` (or `"hi"`, `"ml"`).
4. **Test 4 — Confirmation Workflow**:
   Click the quick prompt `"Add 20 kg sugar to stock"`. The dark chamfered confirmation dialog appears. Click **CONFIRM ACTION** or **CANCEL** — verify the frontend transmits `{ confirmed: true/false, session_id }`.
5. **Test 5 — Session Log Telemetry**:
   Every input, language switch, audio transmission, and confirmation event logs in the right-side **SESSION LOG** panel with timestamps and inspectable JSON payloads.
6. **Test 6 — Offline / Backend Failure Recovery**:
   Click the settings gear in the navbar and toggle **"SIMULATE OFFLINE BACKEND"**. Attempt a query. A friendly error notice with a **RETRY** button appears without freezing or crashing the UI.

---

## 5. Vercel Deployment

This project builds as a clean, static SPA with Vite:

```bash
npm run build
```

The output directory is `dist/`. In Vercel, set:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: `VITE_LANGUAGE_API` (optional), `VITE_USE_MOCK`
