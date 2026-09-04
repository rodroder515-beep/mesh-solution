const express = require("express");
const { runAction } = require("./actions");
const { resetData, loadData } = require("./db");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5003;

/**
 * POST /action
 * Input:  action_request shape (section 4c of 00_overview_and_architecture.md),
 *         forwarded here by the Safety Layer once any needed confirmation has
 *         already happened.
 * Output: action_result shape (section 4d).
 */
app.post("/action", (req, res) => {
  const body = req.body;

  if (!body || body.type !== "action_request") {
    return res.status(400).json({
      type: "error",
      error: "Expected type 'action_request'",
      session_id: body ? body.session_id : null,
    });
  }

  const result = runAction(body.action, body.params);

  return res.json({
    type: "action_result",
    success: result.success,
    data: result.data,
    error: result.error,
    session_id: body.session_id,
  });
});

/**
 * POST /reset
 * Restores the mock dataset to its original seed state. Useful between test
 * runs since testers will repeatedly bill/update the same mock shop.
 */
app.post("/reset", (req, res) => {
  const data = resetData();
  res.json({ status: "reset", item_count: data.items.length, order_count: data.orders.length });
});

/**
 * GET /inventory — convenience endpoint to inspect current mock state while
 * testing (not part of the formal contract, just useful for debugging).
 */
app.get("/inventory", (req, res) => {
  res.json(loadData());
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Data Layer listening on http://localhost:${PORT}`);
});
