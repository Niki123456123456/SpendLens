import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addReceipt, blankDraft, draftTotal, emptyLedger, itemTotal, monthStats, parseLedger, receiptSchema } from '../shared/receipt';
function purchase() { return { ...blankDraft(), shop_name: 'REWE', branch_address: 'A street 1', purchased_at: '2026-10-21', total: 6.03, items: [
  { receipt_item_name: 'Bananas', category: 'food' as const, quantity: 1.25, quantity_unit: 'kg', unit_price: 2.79 },
  { receipt_item_name: 'Drink', category: 'food' as const, quantity: 2, quantity_unit: 'Stk.', unit_price: 1.27 },
] }; }
let sequence = 0;
const id = () => String(++sequence);
test('fractional quantities and fuel unit prices retain precision, totals round per item', () => {
  const draft = purchase();
  assert.equal(draftTotal(draft), 603);
  const ledger = addReceipt(emptyLedger, draft, id);
  assert.equal(ledger.purchases[0].items.reduce((s, i) => s + itemTotal(i), 0), 603);
  const fuel = { ...draft, total: 54.32, items: [{ ...draft.items[0], quantity: 32, unit_price: 1.6975 }] };
  const next = addReceipt(emptyLedger, fuel, id);
  assert.equal(next.purchases[0].items[0].unit_price_micros, 1697500);
  assert.equal(itemTotal(next.purchases[0].items[0]), 5432);
});
test('normalizes shops and branches, preserves separate purchases and historical item prices', () => {
  const original = addReceipt(emptyLedger, purchase(), id);
  const next = addReceipt(original, { ...purchase(), shop_name: ' rewe ', items: [{ ...purchase().items[0], unit_price: 4 }] }, id);
  assert.equal(next.shops.length, 1); assert.equal(next.branches.length, 1); assert.equal(next.purchases.length, 2);
  assert.equal(original.purchases.length, 1); assert.equal(original.purchases[0].items[0].unit_price_micros, 2790000);
  const branch = addReceipt(next, { ...purchase(), branch_address: 'Different branch' }, id);
  assert.equal(branch.shops.length, 1); assert.equal(branch.branches.length, 2);
});
test('validates receipt dates, finite prices, required items, category and EUR currency', () => {
  for (const input of [
    { ...purchase(), purchased_at: '2026-02-30' }, { ...purchase(), shop_name: '' },
    { ...purchase(), items: [] }, { ...purchase(), total: NaN }, { ...purchase(), currency: 'USD' },
    { ...purchase(), items: [{ ...purchase().items[0], quantity: 0 }] },
  ]) assert.equal(receiptSchema.safeParse(input).success, false);
});
test('month totals use printed receipt totals while categories use item totals including discounts', () => {
  let ledger = addReceipt(emptyLedger, purchase(), id);
  ledger = addReceipt(ledger, { ...purchase(), purchased_at: '2026-09-30' }, id);
  ledger = addReceipt(ledger, { ...purchase(), total: 0, items: [{ ...purchase().items[0], quantity: 1, unit_price: -1 }] }, id);
  const stats = monthStats(ledger, '2026-10');
  assert.equal(stats.total, 603); assert.equal(stats.totals.food, 503); assert.equal(stats.purchases.length, 2);
});

test('stored ledgers reject corrupt references and invalid nested records', () => {
  const ledger = addReceipt(emptyLedger, purchase(), id);
  assert.deepEqual(parseLedger(ledger), ledger);
  assert.throws(() => parseLedger({ ...ledger, branches: [] }));
  assert.throws(() => parseLedger({ ...ledger, shops: [...ledger.shops, ledger.shops[0]] }));
  assert.throws(() => parseLedger({ ...ledger, purchases: [{ ...ledger.purchases[0], items: [{}] }] }));
});
