// form-data is only needed for real Sarvam calls — lazy-required below so mock
// mode (no SARVAM_API_KEY) works even before `npm install` has been run.
const SARVAM_BASE_URL = "https://api.sarvam.ai";

// BCP-47 language codes Sarvam expects, keyed by our short codes used elsewhere
// in the pipeline (matches the contract in 00_overview_and_architecture.md).
const LANGUAGE_CODE_MAP = {
  kn: "kn-IN",
  hi: "hi-IN",
  ml: "ml-IN",
  en: "en-IN",
};

function toSarvamLanguageCode(shortCode) {
  return LANGUAGE_CODE_MAP[shortCode] || "unknown";
}

function isMockMode() {
  return !process.env.SARVAM_API_KEY;
}

/**
 * Calls Sarvam's /speech-to-text endpoint once.
 * mode: "transcribe" (native language, numbers auto-normalized to digits by Sarvam)
 *       "translate"  (English output directly from audio)
 */
async function callSpeechToText({ audioBuffer, format, languageCode, mode }) {
  if (isMockMode()) {
    return mockSpeechToText({ mode, languageCode });
  }

  const FormData = require("form-data");
  const form = new FormData();
  form.append("file", audioBuffer, { filename: `audio.${format || "wav"}` });
  form.append("model", "saaras:v3");
  form.append("mode", mode);
  if (languageCode && languageCode !== "unknown") {
    form.append("language_code", languageCode);
  }

  const endpoint =
    mode === "translate"
      ? `${SARVAM_BASE_URL}/speech-to-text` // mode=translate on the same endpoint returns English
      : `${SARVAM_BASE_URL}/speech-to-text`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "api-subscription-key": process.env.SARVAM_API_KEY,
      ...form.getHeaders(),
    },
    body: form.getBuffer(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sarvam STT failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return {
    transcript: data.transcript || "",
    languageCode: data.language_code || languageCode || null,
  };
}

/**
 * Calls Sarvam's /text-to-speech endpoint. Returns base64 WAV audio.
 */
async function callTextToSpeech({ text, targetLanguageShortCode, speaker = "shubh" }) {
  if (isMockMode()) {
    return mockTextToSpeech({ text, targetLanguageShortCode });
  }

  const targetLanguageCode = toSarvamLanguageCode(targetLanguageShortCode);

  const response = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
    method: "POST",
    headers: {
      "api-subscription-key": process.env.SARVAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      target_language_code: targetLanguageCode,
      speaker,
      model: "bulbul:v3",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sarvam TTS failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  // Sarvam returns an `audios` array of base64-encoded WAV strings; for a single
  // short response we join them into one base64 blob.
  const audioBase64 = (data.audios || []).join("");
  return { audioBase64, format: "wav" };
}

// ---- Mock helpers (used when SARVAM_API_KEY is not set, so Chunks 1 and 3 can
// build and test against this service before a real Sarvam key is wired in) ----

function mockSpeechToText({ mode, languageCode }) {
  if (mode === "translate") {
    return {
      transcript: "how much sugar stock is there",
      languageCode: languageCode || "kn-IN",
    };
  }
  return {
    transcript: "ಸಕ್ಕರೆ ಸ್ಟಾಕ್ ಎಷ್ಟಿದೆ",
    languageCode: languageCode || "kn-IN",
  };
}

function mockTextToSpeech({ text }) {
  // Not real audio — a small silent-WAV placeholder base64 string, just enough
  // for downstream services to verify the field is populated during mock testing.
  const silentWavBase64 =
    "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
  return { audioBase64: silentWavBase64, format: "wav" };
}

module.exports = {
  callSpeechToText,
  callTextToSpeech,
  toSarvamLanguageCode,
  isMockMode,
};
