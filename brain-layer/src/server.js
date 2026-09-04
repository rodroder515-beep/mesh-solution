import "dotenv/config";
import express from "express";
import { randomUUID } from "node:crypto";

import { classifyIntent } from "./classifier.js";
import { sendActionRequest, sendConfirmationResponse } from "./dataClient.js";
import { generateResponseText } from "./responseGenerator.js";
import { logClassification } from "./logger.js";
import { requiresConfirmation } from "./actions.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 5002;

// Chunk 6 integration fix: the Safety Layer's response to a write action_request
// is a `confirmation_required` message, not an action_result — it carries a
// `confirmation_id` the Brain Layer needs later to resolve the confirmation,
// but which the Interface Layer (Chunk 1) never sees or stores itself (its
// ConfirmationDecisionPayload is just { confirmed, session_id }). So the Brain
// Layer holds the mapping itself, session_id -> pending confirmation details,
// for the (short) window between asking and getting an answer.
const pendingConfirmations = new Map();

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

    if (actionResult.type === "confirmation_required") {
      pendingConfirmations.set(sessionId, {
        confirmationId: actionResult.confirmation_id,
        action: decision.action,
        params: decision.params,
        targetLanguage,
      });

      return res.json({
        type: "confirmation_required",
        message: actionResult.message,
        action: decision.action,
        params: decision.params,
        target_language: targetLanguage,
        session_id: sessionId,
      });
    }

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

// Receives the user's confirm/cancel decision (forwarded by the Interface
// Layer via whatever gateway sits in front of it), resolves it against the
// Safety Layer using the confirmation_id this service stashed earlier, and
// returns the final natural-language response_text once the real action has
// actually run (or been cancelled/timed out).
app.post("/confirm", async (req, res) => {
  const body = req.body || {};
  const { session_id, confirmed } = body;

  if (!session_id) {
    return res.status(400).json({
      type: "error",
      error: "session_id is required",
      session_id: null,
    });
  }

  const pending = pendingConfirmations.get(session_id);
  pendingConfirmations.delete(session_id);

  if (!pending) {
    return res.json({
      type: "response_text",
      text_english: "Sorry, that confirmation has expired or wasn't found — please try again.",
      target_language: "en",
      session_id,
    });
  }

  const actionResult = await sendConfirmationResponse({
    confirmed: Boolean(confirmed),
    session_id,
    confirmation_id: pending.confirmationId,
  });

  const responseText = generateResponseText(pending.action, actionResult);

  return res.json({
    type: "response_text",
    text_english: responseText,
    target_language: pending.targetLanguage,
    session_id,
  });
});

app.listen(PORT, () => {
  console.log(`Brain Layer listening on http://localhost:${PORT}`);
  console.log(`Forwarding action_requests to ${process.env.DOWNSTREAM_URL || "http://localhost:5003"}`);
});
