// Sarvam's default "transcribe" mode already normalizes spoken numbers to digits
// in the native-language transcript, and "translate" mode usually does too.
// This module is a defensive second pass on the English text specifically,
// catching any spelled-out number words that slip through, since this product
// touches money and stock quantities and we agreed numbers must never travel
// downstream as words. See section 4b of 00_overview_and_architecture.md.

const ONES = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};

const TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};

const MULTIPLIERS = {
  hundred: 100, thousand: 1000, lakh: 100000, lakhs: 100000,
  crore: 10000000, crores: 10000000,
};

const NUMBER_WORD_PATTERN = new RegExp(
  "\\b(" +
    Object.keys(ONES).concat(Object.keys(TENS), Object.keys(MULTIPLIERS)).join("|") +
    ")\\b",
  "i"
);

/**
 * Converts a run of number-word tokens (e.g. "twenty five") into a numeric value.
 * Handles the common retail-quantity range well (units, tens, hundreds, thousands,
 * lakhs) — not a full natural-language-number parser, but covers what a shop
 * owner would actually say about stock, price, or quantity.
 */
function wordsToNumber(words) {
  let total = 0;
  let current = 0;

  for (const rawWord of words) {
    const word = rawWord.toLowerCase();
    if (word in ONES) {
      current += ONES[word];
    } else if (word in TENS) {
      current += TENS[word];
    } else if (word in MULTIPLIERS) {
      const mult = MULTIPLIERS[word];
      current = (current === 0 ? 1 : current) * mult;
      if (mult >= 1000) {
        total += current;
        current = 0;
      }
    } else if (word === "and") {
      continue;
    }
  }
  return total + current;
}

/**
 * Scans text for runs of number-words and replaces them with digits.
 * Leaves already-numeric text (e.g. "42kg") untouched.
 */
function normalizeNumbersInText(text) {
  if (!text) return text;

  const tokens = text.split(/\s+/);
  const outputTokens = [];
  let buffer = [];

  function flushBuffer() {
    if (buffer.length === 0) return;
    const value = wordsToNumber(buffer);
    outputTokens.push(String(value));
    buffer = [];
  }

  function isNumberWord(word) {
    const lower = word.toLowerCase();
    return (
      lower in ONES ||
      lower in TENS ||
      lower in MULTIPLIERS ||
      (lower === "and" && buffer.length > 0)
    );
  }

  for (const token of tokens) {
    const cleanToken = token.replace(/[.,]/g, "");
    if (isNumberWord(cleanToken)) {
      buffer.push(cleanToken);
    } else {
      flushBuffer();
      outputTokens.push(token);
    }
  }
  flushBuffer();

  return outputTokens.join(" ");
}

module.exports = { normalizeNumbersInText, wordsToNumber };
