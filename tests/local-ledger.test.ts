import assert from 'node:assert/strict';
import test from 'node:test';
import { addReceipt, blankDraft, emptyLedger, parseLedger, purchaseInfo } from '../shared/receipt';
import { demoLedgerKey, loadLocalLedger, localLedgerKey } from '../src/lib/local-ledger';

function fixture(shop: string, photo: string) {
  let sequence = 0;
  return addReceipt(emptyLedger, { ...blankDraft(), shop_name: shop, branch_address: shop + ' 1', total: 2.17,
    items: [{ receipt_item_name: 'Äpfel', category: 'food', quantity: 1.25, quantity_unit: 'kg', unit_price: 1.739 }] },
  () => String(++sequence), photo);
}
function memory(entries: Record<string, string> = {}) {
  const data = new Map(Object.entries(entries));
  return {
    data,
    async getItem(key: string) { return data.get(key) ?? null; },
    async setItem(key: string, value: string) { data.set(key, value); },
    async getAllKeys() { return [...data.keys()]; },
    async multiRemove(keys: string[]) { for (const key of keys) data.delete(key); },
  };
}
let sequence = 0;
const uuid = () => `new-${++sequence}`;

test('migrates guest and every former ChatGPT profile, preserves collisions, references, precision and photos, excludes demo', async () => {
  const profiles = [fixture('Gast', 'file:///guest.jpg'), fixture('Konto A', 'file:///a.jpg'), fixture('Konto B', 'file:///b.jpg')];
  const storage = memory({
    'spendlens.ledger.guest': JSON.stringify(profiles[0]),
    'spendlens.ledger.account-a': JSON.stringify(profiles[1]),
    'spendlens.ledger.account-b': JSON.stringify(profiles[2]),
    [demoLedgerKey]: JSON.stringify(fixture('Demo', 'file:///demo.jpg')),
    'spendlens.session': 'unrelated-secret',
  });
  const ledger = await loadLocalLedger(storage, uuid);
  assert.equal(ledger.purchases.length, 3);
  assert.deepEqual(parseLedger(ledger), ledger);
  for (const original of profiles) {
    const purchase = ledger.purchases.find(p => p.image_uri === original.purchases[0].image_uri)!;
    assert.equal(purchaseInfo(ledger, purchase).shop.name, original.shops[0].name);
    assert.equal(purchaseInfo(ledger, purchase).branch.address, original.branches[0].address);
    assert.equal(purchase.total_cents, 217);
    assert.equal(purchase.items[0].quantity, 1.25);
    assert.equal(purchase.items[0].unit_price_micros, 1739000);
  }
  assert.equal(storage.data.has('spendlens.ledger.account-a'), false);
  assert.equal(storage.data.has('spendlens.ledger.guest'), false);
  assert.ok(storage.data.has(demoLedgerKey));
  assert.equal(storage.data.get('spendlens.session'), 'unrelated-secret');
  assert.deepEqual(await loadLocalLedger(storage, uuid), ledger);
});

test('failed migration write leaves all original profiles intact for retry', async () => {
  const original = JSON.stringify(fixture('Gast', 'file:///guest.jpg'));
  const storage = memory({ 'spendlens.ledger.guest': original });
  await assert.rejects(loadLocalLedger({ ...storage, setItem: async () => { throw new Error('Disk full'); } }, uuid), /Disk full/);
  assert.equal(storage.data.get('spendlens.ledger.guest'), original);
  assert.equal(storage.data.has(localLedgerKey), false);
  assert.equal((await loadLocalLedger(storage, uuid)).purchases.length, 1);
});

test('retry after cleanup failure uses committed local data and never resurrects a deleted receipt', async () => {
  const storage = memory({ 'spendlens.ledger.guest': JSON.stringify(fixture('Gast', 'file:///guest.jpg')) });
  await assert.rejects(loadLocalLedger({ ...storage, multiRemove: async () => { throw new Error('Cleanup failed'); } }, uuid), /Cleanup failed/);
  assert.ok(storage.data.has(localLedgerKey));
  await storage.setItem(localLedgerKey, JSON.stringify(emptyLedger));
  assert.deepEqual(await loadLocalLedger(storage, uuid), emptyLedger);
  assert.equal(storage.data.has('spendlens.ledger.guest'), false);
});

test('invalid source data stops migration before any original data is changed', async () => {
  const storage = memory({ 'spendlens.ledger.guest': JSON.stringify(fixture('Gast', 'file:///guest.jpg')), 'spendlens.ledger.account': '{invalid' });
  const before = [...storage.data.entries()];
  await assert.rejects(loadLocalLedger(storage, uuid));
  assert.deepEqual([...storage.data.entries()], before);
});

test('a new device receives one empty local archive without a ChatGPT session', async () => {
  const storage = memory();
  assert.deepEqual(await loadLocalLedger(storage, uuid), emptyLedger);
  assert.deepEqual([...storage.data.keys()], [localLedgerKey]);
});
