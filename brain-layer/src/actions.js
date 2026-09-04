// Shared source of truth for the six actions the Data Layer supports.
// Keep this in sync with 04_data_layer.md if that chunk's action list ever changes.

export const READ_ACTIONS = ["get_stock", "get_price", "get_order_status"];

export const WRITE_ACTIONS = ["update_stock", "place_order", "create_bill"];

export const ALL_ACTIONS = [...READ_ACTIONS, ...WRITE_ACTIONS];

// The Brain Layer sets requires_confirmation, but per 05_safety_layer.md the
// Safety Layer independently re-derives this from its own list and does not
// trust this flag. This function exists so Brain and its tests agree with
// that same logic.
export function requiresConfirmation(action) {
  return WRITE_ACTIONS.includes(action);
}
