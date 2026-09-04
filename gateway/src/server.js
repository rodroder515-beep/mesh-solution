import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json({ limit: "25mb" })); // audio comes in as base64 JSON

const PORT = process.env.PORT || 5000;
const LANGUAGE_LAYER_URL = process.env.LANGUAGE_LAYER_URL || "http://localhost:5001";
const BRAIN_LAYER_URL = process.env.BRAIN_LAYER_URL || "http://localhost:5002";

// -----------------------------------------------------------------------
// Chunk 6 gateway. The Interface Layer (Chunk 1) was built against a single
// backend exposing GET /health, POST /api/v1/message, POST /api/v1/audio,
// and POST /api/v1/confirm (see interface-layer/README.md). The real
// pipeline is four separate hops (Language -> Brain -> Safety -> Data), so
// this service sits in front of all of them and does the multi-step calls
// on the Interface Layer's behalf, translating shapes at each edge.
// -----------------------------------------------------------------------

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON response (${res.status}) from ${url}: ${text.slice(0, 200)}`);
  }
  if (!res.ok && json.type !== "error") {
    throw new Error(`${url} returned ${res.status}: ${text.slice(0, 200)}`);
  }
  return json;
}

/**
 * Runs a transcribed_text message through the Brain Layer and, depending on
 * what comes back, either speaks the final answer (read-only actions, or
 * clarifying questions) or surfaces a confirmation prompt (write actions)
 * — mapped onto the Interface Layer's BackendResponse union.
 */
async function runThroughBrain(transcribedText) {
  const brainResult = await postJson(`${BRAIN_LAYER_URL}/process`, transcribedText);

  if (brainResult.type === "confirmation_required") {
    // Also synthesize a spoken version of the confirmation prompt so the
    // frontend's optional audio_base64/format fields are populated too.
    let audio_base64;
    let format;
    try {
      const tts = await postJson(`${LANGUAGE_LAYER_URL}/tts`, {
        type: "response_text",
        text_english: brainResult.message,
        target_language: brainResult.target_language,
        session_id: brainResult.session_id,
      });
      audio_base64 = tts.audio_base64;
      format = tts.format;
    } catch {
      // Non-fatal — the dialog still works from text alone.
    }

    return {
      type: "confirmation_required",
      action: brainResult.action,
      prompt: brainResult.message,
      details: "This action will modify store records in the POS database.",
      session_id: brainResult.session_id,
      audio_base64,
      format,
    };
  }

  if (brainResult.type === "error") {
    throw new Error(brainResult.error || "brain_layer_error");
  }

  // response_text -> speak it via the Language Layer, return audio_output.
  const tts = await postJson(`${LANGUAGE_LAYER_URL}/tts`, brainResult);
  return {
    type: "audio_output",
    audio_base64: tts.audio_base64,
    format: tts.format,
    text_display: tts.text_display,
    session_id: tts.session_id,
  };
}

app.get("/health", async (_req, res) => {
  res.json({ status: "ok", layer: "gateway" });
});

app.post("/api/v1/message", async (req, res) => {
  const body = req.body || {};
  if (body.type !== "text_input") {
    return res.status(400).json({ code: "bad_request", message: "expected type 'text_input'" });
  }

  try {
    const transcribed = await postJson(`${LANGUAGE_LAYER_URL}/stt`, body);
    const result = await runThroughBrain(transcribed);
    return res.json(result);
  } catch (err) {
    console.error("Gateway /api/v1/message error:", err);
    return res.status(502).json({
      code: "pipeline_error",
      message: err.message || "Something went wrong processing that message.",
      retryable: true,
    });
  }
});

app.post("/api/v1/audio", async (req, res) => {
  const body = req.body || {};
  if (body.type !== "audio_input") {
    return res.status(400).json({ code: "bad_request", message: "expected type 'audio_input'" });
  }

  try {
    const transcribed = await postJson(`${LANGUAGE_LAYER_URL}/stt`, body);
    const result = await runThroughBrain(transcribed);
    return res.json(result);
  } catch (err) {
    console.error("Gateway /api/v1/audio error:", err);
    return res.status(502).json({
      code: "pipeline_error",
      message: err.message || "Something went wrong processing that audio.",
      retryable: true,
    });
  }
});

app.post("/api/v1/confirm", async (req, res) => {
  const body = req.body || {};
  const { confirmed, session_id } = body;

  if (!session_id) {
    return res.status(400).json({ code: "bad_request", message: "session_id is required" });
  }

  try {
    const brainResult = await postJson(`${BRAIN_LAYER_URL}/confirm`, {
      session_id,
      confirmed: Boolean(confirmed),
    });

    if (brainResult.type === "error") {
      throw new Error(brainResult.error || "brain_layer_error");
    }

    return res.json({
      type: "confirmation_result",
      status: confirmed ? "success" : "cancelled",
      message: brainResult.text_english,
      session_id,
    });
  } catch (err) {
    console.error("Gateway /api/v1/confirm error:", err);
    return res.status(502).json({
      code: "pipeline_error",
      message: err.message || "Something went wrong resolving that confirmation.",
      retryable: true,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Gateway listening on http://localhost:${PORT}`);
  console.log(`  Language Layer: ${LANGUAGE_LAYER_URL}`);
  console.log(`  Brain Layer:    ${BRAIN_LAYER_URL}`);
});
