import { emptyLedger, Ledger, parseLedger } from '../../shared/receipt';

export const localLedgerKey = 'spendlens.ledger.local';
export const demoLedgerKey = 'spendlens.ledger.demo';
type LedgerStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  getAllKeys: () => Promise<readonly string[]>;
  multiRemove: (keys: string[]) => Promise<unknown>;
};

/** Combine former device profiles without discarding purchases or changing amounts/photos. */
function combine(ledgers: Ledger[], id: () => string): Ledger {
  const result: Ledger = { version: 1, shops: [], branches: [], purchases: [] };
  const shopIDs = new Set<string>(), branchIDs = new Set<string>(), purchaseIDs = new Set<string>();
  function reserve(original: string, used: Set<string>) {
    let next = original;
    while (used.has(next)) next = id();
    used.add(next);
    return next;
  }
  for (const ledger of ledgers) {
    const shops = new Map<string, string>(), branches = new Map<string, string>();
    for (const shop of ledger.shops) {
      const next = reserve(shop.id, shopIDs);
      shops.set(shop.id, next);
      result.shops.push({ ...shop, id: next });
    }
    for (const branch of ledger.branches) {
      const next = reserve(branch.id, branchIDs);
      branches.set(branch.id, next);
      result.branches.push({ ...branch, id: next, shop_id: shops.get(branch.shop_id)! });
    }
    for (const purchase of ledger.purchases) {
      result.purchases.push({ ...purchase, id: reserve(purchase.id, purchaseIDs), branch_id: branches.get(purchase.branch_id)! });
    }
  }
  return parseLedger(result);
}

/** Persist the complete migration before removing any old keys. A retry never reimports deleted receipts. */
export async function loadLocalLedger(storage: LedgerStorage, id: () => string): Promise<Ledger> {
  const raw = await storage.getItem(localLedgerKey);
  const oldKeys = (await storage.getAllKeys())
    .filter(key => key.startsWith('spendlens.ledger.') && key !== localLedgerKey && key !== demoLedgerKey).sort();
  const ledger = raw !== null ? parseLedger(JSON.parse(raw)) : combine(await Promise.all(oldKeys.map(async key => {
    const value = await storage.getItem(key);
    return value === null ? emptyLedger : parseLedger(JSON.parse(value));
  })), id);
  if (raw === null) await storage.setItem(localLedgerKey, JSON.stringify(ledger));
  if (oldKeys.length) await storage.multiRemove(oldKeys);
  return ledger;
}
