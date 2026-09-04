import Anthropic from "@anthropic-ai/sdk";
import { ALL_ACTIONS } from "./actions.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";

// Tightly scoped system prompt — six actions only, nothing else. Per
// 03_brain_layer.md's "Prompt design note": don't let the model free-associate
// into actions the Data Layer doesn't support.
const SYSTEM_PROMPT = `You are the intent router for a retail store assistant used by
Indian kirana/retail store owners. You receive an English sentence (already translated
upstream from Kannada/Hindi/Malayalam — you never see the original language) describing
what the store owner wants to do. Your only job is to decide which ONE of the following
six actions applies, and extract its parameters. You must always call the route_action
tool — never respond with plain text.

The six supported actions, with example utterances:

1. get_stock — check how much of an item is in stock (read-only)
   - "how much sugar do we have"
   - "check rice stock"
   - "is atta running low"
   - params: { "item_name": string }

2. get_price — check the price of an item (read-only)
   - "what's the price of rice"
   - "how much does sugar cost"
   - "price check on atta"
   - params: { "item_name": string }

3. get_order_status — check the status of a placed order (read-only)
   - "did the order from yesterday arrive"
   - "what's the status of order 1001"
   - "has the atta order been delivered"
   - params: { "order_id": string (optional), "item_name": string (optional) }
     Include order_id if a specific order number/id was mentioned, otherwise
     item_name. Include whichever is available; at least one must be present.

4. update_stock — WRITE. Change the stock level of an item already in inventory
   (e.g. after a delivery arrives, or a manual correction)
   - "add 20kg sugar to stock"
   - "we received 50 packets of atta, update stock"
   - "reduce rice stock by 10kg, some spoiled"
   - "set sugar stock to 42kg"
   - params: { "item_name": string, "quantity": number, "direction": "add" | "subtract" | "set" }
     Infer direction from wording: received/added/arrived -> "add";
     spoiled/damaged/sold outside the system/reduce -> "subtract";
     an explicit absolute value ("set to X") -> "set".

5. place_order — WRITE. Order more stock from a supplier
   - "order 50 packets of atta"
   - "we need to order more sugar, 30kg"
   - "place an order for 100kg rice"
   - params: { "item_name": string, "quantity": number }

6. create_bill — WRITE, highest risk. Create a bill/invoice for a customer
   - "bill this customer for 5kg sugar and 2kg rice"
   - "create a bill: 10 packets atta"
   - "generate an invoice for 3kg rice at the counter"
   - params: { "items": [{ "item_name": string, "quantity": number }], "customer_info": string (optional) }

Rules:
- Quantities and prices always arrive as digits already (a hard rule enforced upstream in
  the Language Layer) — never expect or parse number-words.
- Normalize item_name to lowercase, singular, no extra words (e.g. "sugar" not "sugar packets").
- If the sentence is ambiguous, ambiguous, ambiguous, missing a required parameter (e.g. a
  write action with no quantity given), or doesn't clearly match one of the six actions —
  do NOT guess. Set decision to "clarify" and write one short, specific clarifying
  question in plain English (e.g. "How many kg of sugar would you like to add?").
- Never invent an item_name, quantity, or order_id that wasn't stated or clearly implied.
- Only ever pick one action. Never chain or invent additional actions.`;

const ROUTE_ACTION_TOOL = {
  name: "route_action",
  description:
    "Route the store owner's request to exactly one of the six supported actions, or ask a clarifying question if the request is ambiguous or incomplete.",
  input_schema: {
    type: "object",
    properties: {
      decision: {
        type: "string",
        enum: ["action", "clarify"],
        description:
          "'action' if you can confidently route this to one of the six actions with all required params, 'clarify' if the request is ambiguous, missing required info, or doesn't match a supported action.",
      },
      action: {
        type: "string",
        enum: ALL_ACTIONS,
        description: "Required when decision is 'action'. One of the six supported actions.",
      },
      params: {
        type: "object",
        description:
          "Required when decision is 'action'. Parameters for the chosen action, matching the shape documented for that action.",
      },
      clarifying_question: {
        type: "string",
        description:
          "Required when decision is 'clarify'. A short, specific question in plain English to ask the store owner.",
      },
      reasoning: {
        type: "string",
        description:
          "One short sentence on why you made this decision. Internal only — never shown to the store owner.",
      },
    },
    required: ["decision"],
  },
};

/**
 * Classify an English utterance into one of the six supported actions,
 * or a clarifying question if ambiguous.
 *
 * @param {string} textEnglish - already-translated English text from the Language Layer
 * @returns {Promise<{decision: "action"|"clarify", action?: string, params?: object, clarifying_question?: string, reasoning?: string}>}
 */
export async function classifyIntent(textEnglish) {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    tools: [ROUTE_ACTION_TOOL],
    tool_choice: { type: "tool", name: "route_action" },
    messages: [
      {
        role: "user",
        content: textEnglish,
      },
    ],
  });

  const toolUseBlock = message.content.find((block) => block.type === "tool_use");

  if (!toolUseBlock) {
    // Should not happen since tool_choice forces the tool, but fail safe
    // into a clarifying question rather than guessing an action.
    return {
      decision: "clarify",
      clarifying_question: "Sorry, I didn't quite catch that — could you say it again?",
      reasoning: "no_tool_use_block_returned",
    };
  }

  const result = toolUseBlock.input;

  if (result.decision === "action" && (!result.action || !result.params)) {
    // Model claimed 'action' but didn't fill required fields — treat as
    // a safety fallback rather than forwarding an incomplete action_request.
    return {
      decision: "clarify",
      clarifying_question: "Sorry, could you give me a bit more detail on that?",
      reasoning: "incomplete_action_decision",
    };
  }

  return result;
}
