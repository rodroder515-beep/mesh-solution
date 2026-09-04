const { resetData } = require("../src/db");

const data = resetData();
console.log(`Mock data reset — ${data.items.length} items, ${data.orders.length} orders, ${data.bills.length} bills.`);
