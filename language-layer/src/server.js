const express = require("express");
const { callSpeechToText, callTextToSpeech, isMockMode } = require("./sarvamClient");
const { normalizeNumbersInText } = require("./numberNormalize");

const app = express();
app.use(express.json({ limit: "25mb" })); // audio comes in as base64 JSON, can get large

const PORT = process.env.PORT || 5001;

const LANGUAGE_TO_SARVAM = { kn: "kn-IN", hi: "hi-IN", ml: "ml-IN", en: "en-IN", unknown: "unknown" };

/**
 * POST /stt
 * Input:  audio_input shape (section 4a) from the Interface Layer, OR
 *         text_input shape (typed fallback) from Chunk 1's doc.
 * Output: transcribed_text shape (section 4b) for the Brain Layer.
 */
app.post("/stt", async (req, res) => {
  const body = req.body;

  if (!body || (body.type !== "audio_input" && body.type !== "text_input")) {
    return res.status(400).json({
      type: "error",
      error: "Expected type 'audio_input' or 'text_input'",
      session_id: body ? body.session_id : null,
    });
  }

  try {
    // Typed text skips STT entirely — still normalize numbers and pass through.
    if (body.type === "text_input") {
      const textEnglish = normalizeNumbersInText(body.text);
      return res.json({
        type: "transcribed_text",
        text_original: normalizeNumbersInText(body.text),
        text_language: body.language || "unknown",
        text_english: textEnglish,
        session_id: body.session_id,
      });
    }

    const audioBuffer = Buffer.from(body.audio_base64, "base64");
    const languageCode = LANGUAGE_TO_SARVAM[body.language] || "unknown";

    // Two calls in parallel: native-language transcript + direct English translation.
    const [nativeResult, englishResult] = await Promise.all([
      callSpeechToText({
        audioBuffer,
        format: body.format,
        languageCode,
        mode: "transcribe",
      }),
      callSpeechToText({
        audioBuffer,
        format: body.format,
        languageCode,
        mode: "translate",
      }),
    ]);

    const responsePayload = {
      type: "transcribed_text",
      text_original: normalizeNumbersInText(nativeResult.transcript),
      text_language: (nativeResult.languageCode || languageCode || "unknown").replace("-IN", ""),
      text_english: normalizeNumbersInText(englishResult.transcript),
      session_id: body.session_id,
    };

    return res.json(responsePayload);
  } catch (err) {
    return res.status(502).json({
      type: "error",
      error: err.message,
      session_id: body.session_id,
    });
  }
});

/**
 * POST /tts
 * Input:  response_text shape (section 4e) from the Brain Layer.
 * Output: audio_output shape (matches Chunk 1's expected reply) for the Interface Layer.
 */
app.post("/tts", async (req, res) => {
  const body = req.body;

  if (!body || body.type !== "response_text") {
    return res.status(400).json({
      type: "error",
      error: "Expected type 'response_text'",
      session_id: body ? body.session_id : null,
    });
  }

  try {
    const { audioBase64, format } = await callTextToSpeech({
      text: body.text_english,
      targetLanguageShortCode: body.target_language,
    });

    return res.json({
      type: "audio_output",
      audio_base64: audioBase64,
      format,
      text_display: body.text_english,
      session_id: body.session_id,
    });
  } catch (err) {
    return res.status(502).json({
      type: "error",
      error: err.message,
      session_id: body.session_id,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", mock_mode: isMockMode() });
});

app.listen(PORT, () => {
  console.log(`Language Layer listening on http://localhost:${PORT}`);
  console.log(`Mock mode: ${isMockMode() ? "ON (no SARVAM_API_KEY set)" : "OFF (using real Sarvam API)"}`);
});
