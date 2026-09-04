// Run with: npm run test:pipeline
//
// Before running:
//   1. In one terminal: npm run mock-data   (starts placeholder Data Layer on :5003)
//   2. In another:       npm start           (starts Brain Layer on :5002)
// Then: npm run test:pipeline
//
// This exercises the Brain Layer over real HTTP exactly as the Language Layer
// (Chunk 2) will call it, including a full round trip to a Data Layer.
// Note: the bundled mock Data Layer has no confirmation gating, so writes
// execute immediately here — that's expected for THIS test. Confirmation
// behavior is Chunk 5's responsibility and gets tested once Chunk 6 wires
// Brain -> Safety -> Data together.

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:5002";
const MOCK_DATA_URL = process.env.MOCK_DATA_URL || "http://localhost:5003";

async function resetMockData() {
  await fetch(`${MOCK_DATA_URL}/reset`, { method: "POST" });
}

async function process(textEnglish, sessionId) {
  const res = await fetch(`${BRAIN_URL}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "transcribed_text",
      text_original: textEnglish,
      text_language: "en",
      text_english: textEnglish,
      session_id: sessionId,
    }),
  });
  return res.json();
}

async function main() {
  console.log("Resetting mock data...");
  await resetMockData();

  const scenarios = [
    { name: "Read-only lookup", text: "how much sugar do we have" },
    { name: "Price lookup", text: "what's the price of rice" },
    { name: "Order status lookup", text: "what's the status of order 1001" },
    { name: "Write action: update_stock", text: "add 15kg sugar to stock" },
    { name: "Write action: place_order", text: "order 25 packets of atta" },
    { name: "Ambiguous -> should clarify", text: "do something about the rice" },
    { name: "Numeric passthrough check", text: "reduce rice stock by 12kg, some spoiled" },
  ];

  for (const [i, scenario] of scenarios.entries()) {
    const sessionId = `pipeline_test_${i}`;
    console.log(`\n--- ${scenario.name} ---`);
    console.log(`> "${scenario.text}"`);
    const result = await process(scenario.text, sessionId);
    console.log(JSON.stringify(result, null, 2));
  }

  console.log("\nDone. Check logs/classification.log for the routing decisions made above.");
}

main().catch((err) => {
  console.error("Pipeline test failed:", err);
  process.exit(1);
});
