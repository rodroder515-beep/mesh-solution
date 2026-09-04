// Run with: npm run test:classify
// Requires ANTHROPIC_API_KEY to be set (via .env). Calls the real classifier
// for every phrase in testPhrases.js and reports pass/fail against the
// expected action (or "clarify").

import "dotenv/config";
import { classifyIntent } from "../src/classifier.js";
import { testPhrases } from "./testPhrases.js";

function checkParamMatches(decision, checkParam) {
  if (!checkParam) return true;
  const value = decision.params?.[checkParam.key];
  return value === checkParam.value;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  let pass = 0;
  let fail = 0;
  const failures = [];

  for (const { text, expected, checkParam } of testPhrases) {
    let decision;
    try {
      decision = await classifyIntent(text);
    } catch (err) {
      fail++;
      failures.push({ text, expected, error: err.message });
      console.log(`✗ ERROR  "${text}" -> ${err.message}`);
      continue;
    }

    const actual = decision.decision === "clarify" ? "clarify" : decision.action;
    const paramOk = checkParamMatches(decision, checkParam);
    const passed = actual === expected && paramOk;

    if (passed) {
      pass++;
      console.log(`✓ PASS   "${text}" -> ${actual}`);
    } else {
      fail++;
      failures.push({ text, expected, actual, decision });
      console.log(`✗ FAIL   "${text}" -> expected ${expected}, got ${actual}${paramOk ? "" : " (param mismatch)"}`);
    }
  }

  console.log(`\n${pass}/${pass + fail} passed`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(JSON.stringify(f, null, 2));
    }
    process.exit(1);
  }
}

main();
