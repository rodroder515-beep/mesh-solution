const fs = require("fs");
const path = require("path");

const SEED_PATH = path.join(__dirname, "..", "data", "seed_inventory.json");
const WORKING_PATH = path.join(__dirname, "..", "data", "mock_inventory.json");

/**
 * Ensures a working copy of the mock dataset exists. If it doesn't (first run,
 * or after a reset), it's copied fresh from the seed file. The seed file itself
 * is never mutated — this is what lets `resetData()` always return to a known
 * starting state.
 */
function ensureWorkingCopy() {
  if (!fs.existsSync(WORKING_PATH)) {
    const seed = fs.readFileSync(SEED_PATH, "utf-8");
    fs.writeFileSync(WORKING_PATH, seed);
  }
}

function loadData() {
  ensureWorkingCopy();
  const raw = fs.readFileSync(WORKING_PATH, "utf-8");
  return JSON.parse(raw);
}

function saveData(data) {
  fs.writeFileSync(WORKING_PATH, JSON.stringify(data, null, 2));
}

/**
 * Resets the working dataset back to the original seed — useful between test
 * runs since testers will repeatedly bill/update the same mock shop.
 */
function resetData() {
  const seed = fs.readFileSync(SEED_PATH, "utf-8");
  fs.writeFileSync(WORKING_PATH, seed);
  return JSON.parse(seed);
}

module.exports = { loadData, saveData, resetData };
