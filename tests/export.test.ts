import { test } from 'node:test';
import assert from 'node:assert/strict';
import { receiptExport } from '../shared/export';
import { addReceipt, blankDraft, emptyLedger, parseLedger } from '../shared/receipt';

test('JSON export preserves every receipt, reference, unicode and precise amount without device paths or credentials', () => {
  let sequence = 0;
  const id = () => String(++sequence);
  const draft = { ...blankDraft(), shop_name: 'Bäckerei Müller', purchased_at: '2026-10-22', total: 2.15,
    items: [
      { receipt_item_name: 'Äpfel', category: 'food' as const, quantity: 1.25, quantity_unit: 'kg', unit_price: 1.739 },
      { receipt_item_name: 'Rabatt', category: 'food' as const, quantity: 1, quantity_unit: 'Stk.', unit_price: -0.02 },
    ] };
  let ledger = addReceipt(emptyLedger, draft, id, 'file:///private/bon.jpg');
  ledger = addReceipt(ledger, { ...draft, branch_address: 'Straße 2', purchased_at: '2026-09-01' }, id, 'data:image/jpeg;base64,private-photo');
  const before = JSON.stringify(ledger);
  const json = JSON.stringify(receiptExport({ ...ledger, access_token: 'private-token' } as typeof ledger, false, new Date('2026-10-22T08:00:00Z')));
  const exported = JSON.parse(json);
  assert.equal(exported.exported_at, '2026-10-22T08:00:00.000Z');
  assert.equal(exported.source, 'local');
  assert.equal(exported.ledger.purchases.length, 2);
  assert.equal(exported.ledger.shops[0].name, 'Bäckerei Müller');
  assert.equal(exported.ledger.purchases[0].items[0].quantity, 1.25);
  assert.equal(exported.ledger.purchases[0].items[0].unit_price_micros, 1739000);
  assert.equal(exported.ledger.purchases[0].items[1].unit_price_micros, -20000);
  assert.equal(exported.ledger.purchases[0].total_cents, 215);
  assert.deepEqual(parseLedger(exported.ledger), exported.ledger);
  for (const privateValue of ['private-photo', 'file://', 'image_uri', 'access_token', 'private-token']) assert.ok(!json.includes(privateValue));
  assert.equal(JSON.stringify(ledger), before);
  assert.equal(receiptExport(emptyLedger, true).source, 'demo');
  assert.deepEqual(receiptExport(emptyLedger, false).ledger.purchases, []);
});
