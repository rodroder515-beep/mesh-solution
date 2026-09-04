import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, "..", "logs", "classification.log");

// Per 03_brain_layer.md: "Log every classification decision during testing so
// you can spot misroutes." This is a lighter-weight log than the Safety
// Layer's action log (05_safety_layer.md) — it captures the *routing*
// decision, not the confirmation/execution outcome.
export async function logClassification({ sessionId, textEnglish, decision }) {
  const entry = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    text_english: textEnglish,
    decision: decision.decision,
    action: decision.action ?? null,
    params: decision.params ?? null,
    clarifying_question: decision.clarifying_question ?? null,
    reasoning: decision.reasoning ?? null,
  };

  try {
    await mkdir(dirname(LOG_PATH), { recursive: true });
    await appendFile(LOG_PATH, JSON.stringify(entry) + "\n", "utf-8");
  } catch (err) {
    // Logging should never take down the request path.
    console.error("Failed to write classification log:", err.message);
  }
}
