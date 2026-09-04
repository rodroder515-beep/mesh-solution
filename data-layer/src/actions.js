const { loadData, saveData } = require("./db");

function findItem(data, itemName) {
  if (!itemName) return null;
  const needle = itemName.trim().toLowerCase();
  return data.items.find((i) => i.item_name.toLowerCase() === needle) || null;
}

function nextOrderId(data) {
  const nums = data.orders
    .map((o) => parseInt(o.order_id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `ORD${max + 1}`;
}

function nextBillId(data) {
  return `BILL${data.bills.length + 1001}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ---- Action handlers ----
// Each returns { success, data, error } matching the action_result contract
// (section 4d of 00_overview_and_architecture.md). The server wraps this with
// the `type` / `session_id` envelope.

function getStock(params) {
  const data = loadData();
  const item = findItem(data, params.item_name);
  if (!item) {
    return { success: false, data: null, error: `Item '${params.item_name}' not found` };
  }
  return {
    success: true,
    data: { item_name: item.item_name, current_stock: item.stock, unit: item.unit },
    error: null,
  };
}

function getPrice(params) {
  const data = loadData();
  const item = findItem(data, params.item_name);
  if (!item) {
    return { success: false, data: null, error: `Item '${params.item_name}' not found` };
  }
  return {
    success: true,
    data: { item_name: item.item_name, price_per_unit: item.price_per_unit, unit: item.unit },
    error: null,
  };
}

function getOrderStatus(params) {
  const data = loadData();
  let order = null;

  if (params.order_id) {
    order = data.orders.find((o) => o.order_id.toLowerCase() === params.order_id.toLowerCase());
  } else if (params.item_name) {
    const matches = data.orders.filter(
      (o) => o.item_name.toLowerCase() === params.item_name.trim().toLowerCase()
    );
    // most recent by placed_on if multiple orders exist for the same item
    order = matches.sort((a, b) => (a.placed_on < b.placed_on ? 1 : -1))[0] || null;
  }

  if (!order) {
    return { success: false, data: null, error: "No matching order found" };
  }
  return { success: true, data: order, error: null };
}

function updateStock(params) {
  const data = loadData();
  const item = findItem(data, params.item_name);
  if (!item) {
    return { success: false, data: null, error: `Item '${params.item_name}' not found` };
  }

  const quantity = Number(params.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    return { success: false, data: null, error: "Quantity must be a positive number" };
  }

  const direction = params.direction === "subtract" ? "subtract" : "add";
  if (direction === "subtract" && quantity > item.stock) {
    return {
      success: false,
      data: null,
      error: `Cannot subtract ${quantity}${item.unit} — only ${item.stock}${item.unit} in stock`,
    };
  }

  item.stock = direction === "add" ? item.stock + quantity : item.stock - quantity;
  saveData(data);

  return {
    success: true,
    data: { item_name: item.item_name, new_stock: item.stock, unit: item.unit },
    error: null,
  };
}

function placeOrder(params) {
  const data = loadData();
  const item = findItem(data, params.item_name);
  if (!item) {
    return { success: false, data: null, error: `Item '${params.item_name}' not found` };
  }

  const quantity = Number(params.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    return { success: false, data: null, error: "Quantity must be a positive number" };
  }

  const order = {
    order_id: nextOrderId(data),
    item_name: item.item_name,
    quantity,
    status: "pending",
    placed_on: todayISO(),
  };
  data.orders.push(order);
  saveData(data);

  return { success: true, data: order, error: null };
}

function createBill(params) {
  const data = loadData();
  const requestedItems = params.items || [];

  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return { success: false, data: null, error: "No items provided for billing" };
  }

  // Validate everything first — a bill should never partially apply.
  const resolvedLines = [];
  for (const line of requestedItems) {
    const item = findItem(data, line.item_name);
    if (!item) {
      return { success: false, data: null, error: `Item '${line.item_name}' not found` };
    }
    const quantity = Number(line.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      return { success: false, data: null, error: `Invalid quantity for '${line.item_name}'` };
    }
    if (quantity > item.stock) {
      return {
        success: false,
        data: null,
        error: `Insufficient stock for '${item.item_name}' — have ${item.stock}${item.unit}, need ${quantity}${item.unit}`,
      };
    }
    resolvedLines.push({ item, quantity });
  }

  // All validated — now apply.
  let total = 0;
  const billLines = resolvedLines.map(({ item, quantity }) => {
    item.stock -= quantity;
    const lineTotal = item.price_per_unit * quantity;
    total += lineTotal;
    return {
      item_name: item.item_name,
      quantity,
      unit: item.unit,
      price_per_unit: item.price_per_unit,
      line_total: lineTotal,
    };
  });

  const bill = {
    bill_id: nextBillId(data),
    customer_name: params.customer_name || null,
    items: billLines,
    total,
    billed_on: todayISO(),
  };
  data.bills.push(bill);
  saveData(data);

  return { success: true, data: bill, error: null };
}

const ACTION_HANDLERS = {
  get_stock: getStock,
  get_price: getPrice,
  get_order_status: getOrderStatus,
  update_stock: updateStock,
  place_order: placeOrder,
  create_bill: createBill,
};

function runAction(action, params) {
  const handler = ACTION_HANDLERS[action];
  if (!handler) {
    return { success: false, data: null, error: `Unknown action '${action}'` };
  }
  try {
    return handler(params || {});
  } catch (err) {
    return { success: false, data: null, error: `Internal error: ${err.message}` };
  }
}

module.exports = { runAction, ACTION_HANDLERS };
