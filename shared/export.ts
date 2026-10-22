import { Ledger, parseLedger } from './receipt';

/** A portable snapshot of the selected ledger, without device-only photo paths. */
export function receiptExport(ledger: Ledger, demo: boolean, now = new Date()) {
  const snapshot = parseLedger(ledger);
  return {
    format: 'spendlens.receipts',
    version: 1,
    exported_at: now.toISOString(),
    source: demo ? 'demo' : 'local',
    includes_photos: false,
    monetary_units: { total_cents: 'EUR / 100', unit_price_micros: 'EUR / 1000000' },
    ledger: {
      ...snapshot,
      purchases: snapshot.purchases.map(purchase => ({
        id: purchase.id, branch_id: purchase.branch_id, purchased_at: purchase.purchased_at,
        currency: purchase.currency, total_cents: purchase.total_cents, items: purchase.items,
      })),
    },
  };
}
