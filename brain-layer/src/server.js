import "dotenv/config";
import express from "express";
import { randomUUID } from "node:crypto";

import { classifyIntent } from "./classifier.js";
import { sendActionRequest } from "./dataClient.js";
import { generateResponseText } from "./responseGenerator.js";
import { logClassification } from "./logger.js";
import { requiresConfirmation } from "./actions.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 5002;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", layer: "brain" });
});

// Main entry point. Receives a transcribed_text message (section 4b) from the
// Language Layer and returns a response_text message (section 4e).
app.post("/process", async (req, res) => {
  const body = req.body || {};
  const { type, text_english, text_language, session_id } = body;

  if (type !== "transcribed_text") {
    return res.status(400).json({
      type: "error",
      error: `expected type "transcribed_text", got "${type}"`,
      session_id: session_id ?? null,
    });
  }

  if (!text_english || typeof text_english !== "string") {
    return res.status(400).json({
      type: "error",
      error: "text_english is required",
      session_id: session_id ?? null,
    });
  }

  const sessionId = session_id || randomUUID();
  const targetLanguage = text_language || "en";

  try {
    const decision = await classifyIntent(text_english);

    // Fire-and-forget logging — don't block the response on it.
    logClassification({ sessionId, textEnglish: text_english, decision }).catch(() => {});

    if (decision.decision === "clarify") {
      return res.json({
        type: "response_text",
        text_english: decision.clarifying_question,
        target_language: targetLanguage,
        session_id: sessionId,
      });
    }

    const actionRequest = {
      type: "action_request",
      action: decision.action,
      params: decision.params,
      // Set honestly here, but per 05_safety_layer.md the Safety Layer does
      // NOT trust this value for write actions — it re-derives it
      // independently. This flag is still sent because the contract (4c)
      // requires it, and because it's a useful first line of defense.
      requires_confirmation: requiresConfirmation(decision.action),
      session_id: sessionId,
    };

    const actionResult = await sendActionRequest(actionRequest);

    const responseText = generateResponseText(decision.action, actionResult);

    return res.json({
      type: "response_text",
      text_english: responseText,
      target_language: targetLanguage,
      session_id: sessionId,
    });
  } catch (err) {
    console.error("Brain Layer error:", err);
    return res.status(500).json({
      type: "error",
      error: "brain_layer_internal_error",
      session_id: sessionId,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Brain Layer listening on http://localhost:${PORT}`);
  console.log(`Forwarding action_requests to ${process.env.DOWNSTREAM_URL || "http://localhost:5003"}`);
});
