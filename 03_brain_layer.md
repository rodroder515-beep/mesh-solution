# Chunk 3: Brain Layer

**Read `00_overview_and_architecture.md` first — it defines the API contracts you must
follow.**

## Goal
Understand what the store owner is asking for, in English (already translated by the
Language Layer), and decide which action to take — then turn the Data Layer's result back
into a plain-English sentence for the response.

## What to build
1. An intent classifier / router using Claude (Anthropic API). Given
   `text_english` from the Language Layer, decide which of these actions applies:
   - `get_stock` — "how much sugar do we have"
   - `get_price` — "what's the price of rice"
   - `get_order_status` — "did the order from yesterday arrive"
   - `update_stock` — "add 20kg sugar to stock" (**write, needs confirmation**)
   - `place_order` — "order 50 packets of atta" (**write, needs confirmation**)
   - `create_bill` — "bill this customer for X" (**write, needs confirmation, highest risk**)
2. Extract the parameters needed for that action (item name, quantity, etc.) from the
   English text.
3. Mark `requires_confirmation: true` for every write action (update_stock, place_order,
   create_bill) — never false, this is not optional, it's enforced again independently by
   the Safety Layer as a second check.
4. Take the `action_result` back from the Data Layer and turn it into a short, natural
   English sentence for the response (this then goes to the Language Layer for TTS).
5. Handle the "didn't understand" case gracefully — don't guess an action if intent is
   ambiguous; ask a clarifying question instead (send back a `response_text` that's a
   question, with no action_request issued).

## What you receive (from Language Layer)
Match `transcribed_text` exactly (section 4b).

## What you send (to Data Layer)
Match `action_request` exactly (section 4c):
```json
{
  "type": "action_request",
  "action": "get_stock",
  "params": { "item_name": "sugar" },
  "requires_confirmation": false,
  "session_id": "sess_001"
}
```

## What you receive back (from Data Layer)
Match `action_result` exactly (section 4d).

## What you send onward (to Language Layer)
Match `response_text` exactly (section 4e).

## Prompt design note
Keep the Claude system prompt tightly scoped to these six actions and their parameters —
don't let it free-associate into actions the Data Layer doesn't support. Include a few
example utterances per action (in English, since translation already happened upstream) so
classification is reliable. Log every classification decision during testing so you can
spot misroutes.

## Tech
Node.js or Python service calling the Anthropic API (`claude-sonnet-4-6` per current
setup). Structured JSON output for the action decision — no free text parsing.

## Deliverable
A local service that takes English transcribed text, correctly classifies it into one of
the six actions (or asks a clarifying question), extracts parameters, calls the Data Layer
mock, and returns a natural-language response — tested against a written-out set of at
least 5-10 sample phrases per action, including edge cases and ambiguous ones.

## Explicitly out of scope for this chunk
- Actually executing the write (that's the Data Layer, gated by the Safety Layer)
- Speech/audio (upstream and downstream of you are always plain text)
