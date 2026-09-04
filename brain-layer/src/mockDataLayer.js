// ⚠️  PLACEHOLDER ONLY — NOT Chunk 4.
//
// This is a minimal stand-in for the real Data Layer (04_data_layer.md), included
// here so the Brain Layer can be tested end-to-end before that chunk exists.
// It uses the same mock_inventory.json shape described in that doc so it's a
// drop-in swap once the real Chunk 4 service is ready — just point
// DOWNSTREAM_URL at that service instead.
//
// It also has NO confirmation gating (that's the Safety Layer's job), so only
// use this for testing Brain Layer classification + wiring, never as a stand-in
// for the real integrated pipeline.

import "dotenv/config";
import express from "express";
import { randomUUID } from "node:crypto";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.MOCK_DATA_PORT || 5003;

// Same shape as mock_inventory.json in 04_data_layer.md
const db = {
  items: [
    { item_name: "sugar", stock: 42, unit: "kg", price_per_unit: 45 },
    { item_name: "rice", stock: 120, unit: "kg", price_per_unit: 60 },
    { item_name: "atta", stock: 8, unit: "packet", price_per_unit: 55 },
    { item_name: "salt", stock: 60, unit: "kg", price_per_unit: 20 },
    { item_name: "tea", stock: 15, unit: "packet", price_per_unit: 120 },
  ],
  orders: [
    { order_id: "ORD1001", item_name: "atta", quantity: 50, status: "pending", placed_on: "2026-09-01" },
    { order_id: "ORD1002", item_name: "sugar", quantity: 100, status: "delivered", placed_on: "2026-08-20" },
  ],
  bills: [],
};

function findItem(itemName) {
  if (!itemName) return null;
  const needle = itemName.trim().toLowerCase();
  return db.items.find((i) => i.item_name === needle) || null;
}

function ok(data, session_id) {
  return { type: "action_result", success: true, data, error: null, session_id };
}

function fail(error, session_id) {
  return { type: "action_result", success: false, data: null, error, session_id };
}

app.post("/action", (req, res) => {
  const { action, params = {}, session_id } = req.body || {};

  switch (action) {
    case "get_stock": {
      const item = findItem(params.item_name);
      if (!item) return res.json(fail(`item not found: ${params.item_name}`, session_id));
      return res.json(ok({ item_name: item.item_name, current_stock: item.stock, unit: item.unit }, session_id));
    }

    case "get_price": {
      const item = findItem(params.item_name);
      if (!item) return res.json(fail(`item not found: ${params.item_name}`, session_id));
      return res.json(
        ok({ item_name: item.item_name, price_per_unit: item.price_per_unit, unit: item.unit }, session_id)
      );
    }

    case "get_order_status": {
      let order = null;
      if (params.order_id) {
        order = db.orders.find((o) => o.order_id.toLowerCase() === String(params.order_id).toLowerCase());
      } else if (params.item_name) {
        order = db.orders.find((o) => o.item_name === params.item_name.trim().toLowerCase());
      }
      if (!order) return res.json(fail("order not found", session_id));
      return res.json(ok({ ...order }, session_id));
    }

    case "update_stock": {
      const item = findItem(params.item_name);
      if (!item) return res.json(fail(`item not found: ${params.item_name}`, session_id));
      const qty = Number(params.quantity);
      if (!Number.isFinite(qty) || qty < 0) return res.json(fail("invalid quantity", session_id));

      const previousStock = item.stock;
      if (params.direction === "add") item.stock += qty;
      else if (params.direction === "subtract") item.stock = Math.max(0, item.stock - qty);
      else if (params.direction === "set") item.stock = qty;
      else return res.json(fail(`invalid direction: ${params.direction}`, session_id));

      return res.json(
        ok(
          { item_name: item.item_name, previous_stock: previousStock, new_stock: item.stock, unit: item.unit },
          session_id
        )
      );
    }

    case "place_order": {
      const item = findItem(params.item_name);
      if (!item) return res.json(fail(`item not found: ${params.item_name}`, session_id));
      const qty = Number(params.quantity);
      if (!Number.isFinite(qty) || qty <= 0) return res.json(fail("invalid quantity", session_id));

      const order = {
        order_id: `ORD${1000 + db.orders.length + 1}`,
        item_name: item.item_name,
        quantity: qty,
        status: "pending",
        placed_on: new Date().toISOString().slice(0, 10),
      };
      db.orders.push(order);
      return res.json(ok({ ...order, unit: item.unit }, session_id));
    }

    case "create_bill": {
      const items = Array.isArray(params.items) ? params.items : [];
      if (items.length === 0) return res.json(fail("no items provided for bill", session_id));

      let total = 0;
      const lineItems = [];
      for (const line of items) {
        const item = findItem(line.item_name);
        if (!item) return res.json(fail(`item not found: ${line.item_name}`, session_id));
        const qty = Number(line.quantity);
        if (!Number.isFinite(qty) || qty <= 0) return res.json(fail(`invalid quantity for ${line.item_name}`, session_id));
        if (item.stock < qty) return res.json(fail(`insufficient stock for ${line.item_name}`, session_id));

        item.stock -= qty;
        const lineTotal = qty * item.price_per_unit;
        total += lineTotal;
        lineItems.push({ item_name: item.item_name, quantity: qty, line_total: lineTotal });
      }

      const bill = {
        bill_id: `BILL${1000 + db.bills.length + 1}`,
        items: lineItems,
        total,
        customer_info: params.customer_info || null,
        created_on: new Date().toISOString(),
      };
      db.bills.push(bill);
      return res.json(ok(bill, session_id));
    }

    default:
      return res.json(fail(`unknown action: ${action}`, session_id));
  }
});

// Testing convenience — reset the mock data back to its original state.
const RESET_SNAPSHOT = JSON.stringify(db);
app.post("/reset", (_req, res) => {
  const fresh = JSON.parse(RESET_SNAPSHOT);
  db.items = fresh.items;
  db.orders = fresh.orders;
  db.bills = fresh.bills;
  res.json({ reset: true });
});

app.get("/health", (_req, res) => res.json({ status: "ok", layer: "mock-data (placeholder)" }));

app.listen(PORT, () => {
  console.log(`Mock Data Layer (placeholder for Chunk 4) listening on http://localhost:${PORT}`);
});
