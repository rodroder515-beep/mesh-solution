// Turns an action_result (section 4d) into the short, natural English sentence
// that response_text (section 4e) carries onward to the Language Layer for TTS.
//
// Deliberately template-based rather than another Claude call: this is a
// money-handling product (stock, prices, bills), so responses that state
// figures should be deterministic and directly reflect what the Data Layer
// returned, not paraphrased by a model.

function fmtQty(n, unit) {
  return unit ? `${n} ${unit}` : `${n}`;
}

const CANCELLED_ERRORS = new Set(["cancelled_by_user", "confirmation_timeout"]);

export function generateResponseText(action, actionResult) {
  const { success, data, error } = actionResult;

  if (!success) {
    if (CANCELLED_ERRORS.has(error)) {
      return "Okay, I've cancelled that — nothing was changed.";
    }
    return `Sorry, I couldn't do that: ${error || "something went wrong"}.`;
  }

  switch (action) {
    case "get_stock":
      return `You have ${fmtQty(data.current_stock, data.unit)} of ${data.item_name} in stock.`;

    case "get_price":
      return `${data.item_name} is priced at ₹${data.price_per_unit} per ${data.unit}.`;

    case "get_order_status":
      return data.order_id
        ? `Order ${data.order_id} (${data.item_name}, qty ${data.quantity}) is currently ${data.status}.`
        : `The order for ${data.item_name} is currently ${data.status}.`;

    case "update_stock":
      return `Done — ${data.item_name} stock is now ${fmtQty(data.new_stock, data.unit)}.`;

    case "place_order":
      return `Order placed: ${fmtQty(data.quantity, data.unit)} of ${data.item_name}. Order ID ${data.order_id}.`;

    case "create_bill":
      return `Bill created for ₹${data.total}. Bill ID ${data.bill_id}.`;

    default:
      return "Done.";
  }
}
