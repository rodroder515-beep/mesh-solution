// Sample English utterances (post-translation, as the Brain Layer receives them)
// used to validate classification. Covers 5-10 phrases per action plus edge
// cases, per the Chunk 3 deliverable requirement.
//
// expected: the action name, or "clarify" for phrases that should NOT resolve
// to a confident action.

export const testPhrases = [
  // --- get_stock ---
  { text: "how much sugar do we have", expected: "get_stock" },
  { text: "check rice stock", expected: "get_stock" },
  { text: "is atta running low", expected: "get_stock" },
  { text: "what's our current stock of tea", expected: "get_stock" },
  { text: "do we still have salt", expected: "get_stock" },
  { text: "sugar stock kitna hai", expected: "get_stock" }, // occasionally leaks through untranslated
  { text: "how many kg of rice left", expected: "get_stock" },

  // --- get_price ---
  { text: "what's the price of rice", expected: "get_price" },
  { text: "how much does sugar cost", expected: "get_price" },
  { text: "price check on atta", expected: "get_price" },
  { text: "what do we charge for tea per packet", expected: "get_price" },
  { text: "salt price please", expected: "get_price" },
  { text: "rice rate today", expected: "get_price" },

  // --- get_order_status ---
  { text: "did the order from yesterday arrive", expected: "get_order_status" },
  { text: "what's the status of order 1001", expected: "get_order_status" },
  { text: "has the atta order been delivered", expected: "get_order_status" },
  { text: "check on order ORD1002", expected: "get_order_status" },
  { text: "is our sugar order still pending", expected: "get_order_status" },
  { text: "track my last order", expected: "get_order_status" },

  // --- update_stock (write) ---
  { text: "add 20kg sugar to stock", expected: "update_stock" },
  { text: "we received 50 packets of atta, update stock", expected: "update_stock" },
  { text: "reduce rice stock by 10kg, some spoiled", expected: "update_stock" },
  { text: "set sugar stock to 42kg", expected: "update_stock" },
  { text: "5kg of tea got damaged, remove it from stock", expected: "update_stock" },
  { text: "delivery came in, 30kg salt, add to stock", expected: "update_stock" },

  // --- place_order (write) ---
  { text: "order 50 packets of atta", expected: "place_order" },
  { text: "we need to order more sugar, 30kg", expected: "place_order" },
  { text: "place an order for 100kg rice", expected: "place_order" },
  { text: "order 10 packets of tea from the supplier", expected: "place_order" },
  { text: "get more salt ordered, 40kg", expected: "place_order" },

  // --- create_bill (write, highest risk) ---
  { text: "bill this customer for 5kg sugar and 2kg rice", expected: "create_bill" },
  { text: "create a bill: 10 packets atta", expected: "create_bill" },
  { text: "generate an invoice for 3kg rice at the counter", expected: "create_bill" },
  { text: "customer wants to buy 2kg tea and 1kg salt, make the bill", expected: "create_bill" },
  { text: "checkout: 5kg sugar for this customer", expected: "create_bill" },

  // --- ambiguous / should trigger a clarifying question, not a guess ---
  { text: "sugar", expected: "clarify" },
  { text: "do something about the rice", expected: "clarify" },
  { text: "update it", expected: "clarify" },
  { text: "add stock", expected: "clarify" }, // missing item_name and quantity
  { text: "order more", expected: "clarify" }, // missing item_name and quantity
  { text: "what's the weather like today", expected: "clarify" }, // out of scope entirely

  // --- numeric handling (tests that digits pass through cleanly, not
  //     Kannada/Hindi/Malayalam number-words per the Chunk 2 hard rule —
  //     by the time text reaches the Brain Layer, this should already be true) ---
  { text: "add 15kg sugar to stock", expected: "update_stock", checkParam: { key: "quantity", value: 15 } },
  { text: "order 25 packets of atta", expected: "place_order", checkParam: { key: "quantity", value: 25 } },
];
