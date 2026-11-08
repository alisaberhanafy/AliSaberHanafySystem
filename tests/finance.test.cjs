const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(new URL('../assets/js/finance.js', `file://${__filename}`), 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(`${source}; this.FinanceModule = FinanceModule;`, context);
const F = context.FinanceModule;

const invoice = F.invoice({
  discount: 10, discountType: 'PERCENT', deliveryStatus: 'delivered',
  items: [{ qty: 2, price: 100, costPrice: 60 }, { qty: 1, price: 50, isPayment: true }]
}, []);
assert.deepEqual(JSON.parse(JSON.stringify(invoice)), {
  itemsSubtotal: 200, discount: 20, net: 180, paid: 50, remaining: 130,
  advance: 0, costTotal: 120, costIncomplete: false, costEstimated: false, grossProfit: 60
});

const overpaid = F.invoice({ discount: 500, discountType: 'EGP', items: [
  { qty: 1, price: 100, costPrice: 30 }, { qty: 1, price: 250, isPayment: true }
]}, []);
assert.equal(overpaid.net, 0);
assert.equal(overpaid.advance, 250);

const negativeDiscount = F.invoice({ discount: -25, discountType: 'EGP', items: [
  { qty: 1, price: 100, costPrice: 40 }
]}, []);
assert.equal(negativeDiscount.net, 100);
assert.equal(negativeDiscount.discount, 0);

const client = F.client({ invoices: [
  { deliveryStatus: 'delivered', items: [{ qty: 1, price: 100, costPrice: 40 }, { qty: 1, price: 30, isPayment: true }] },
  { deliveryStatus: 'pending', items: [{ qty: 1, price: 200, costPrice: 100 }, { qty: 1, price: 50, isPayment: true }] }
]}, []);
assert.deepEqual(JSON.parse(JSON.stringify(client)), { total: 300, paid: 80, debt: 70, advance: 50 });

const legacy = F.invoice({ items: [{ qty: 1, price: 100 }] }, []);
assert.equal(legacy.costIncomplete, true);
assert.equal(legacy.costEstimated, true);
const legacyWithCatalog = F.invoice({ items: [{ qty: 1, price: 100, name: 'Old Item' }] }, [{ name: 'Old Item', costPrice: 35 }]);
assert.equal(legacyWithCatalog.costTotal, 35);
assert.equal(legacyWithCatalog.costEstimated, true);
console.log('Financial tests passed: 6 cases');
