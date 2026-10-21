import { z } from 'zod';

export const categories = ['food', 'mobility', 'household', 'health', 'leisure', 'other'] as const;
export const shopTypes = ['supermarket', 'gas_station', 'drugstore', 'restaurant', 'other'] as const;
export const categoryLabels: Record<Category, string> = { food: 'Nahrung', mobility: 'Mobilität', household: 'Haushalt', health: 'Gesundheit', leisure: 'Freizeit', other: 'Sonstiges' };
export type Category = typeof categories[number];
export const itemSchema = z.object({
  receipt_item_name: z.string().trim().min(1).max(200),
  category: z.enum(categories),
  quantity: z.number().positive().max(100000),
  quantity_unit: z.string().trim().min(1).max(20),
  unit_price: z.number().finite().min(-100000).max(100000),
});
export const receiptSchema = z.object({
  shop_name: z.string().trim().min(1).max(120),
  shop_type: z.enum(shopTypes),
  branch_address: z.string().trim().max(300),
  purchased_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Bitte ein gültiges Datum eingeben.'),
  currency: z.literal('EUR'),
  total: z.number().finite().min(0).max(1000000),
  items: z.array(itemSchema).min(1).max(200),
});
export type ReceiptDraft = z.infer<typeof receiptSchema>;
export type PurchaseItem = Omit<z.infer<typeof itemSchema>, 'unit_price'> & { id: string; unit_price_micros: number };
export type Shop = { id: string; name: string; type: typeof shopTypes[number] };
export type Branch = { id: string; shop_id: string; address: string };
export type Purchase = { id: string; branch_id: string; purchased_at: string; currency: 'EUR'; total_cents: number; image_uri?: string; items: PurchaseItem[] };
export type Ledger = { version: 1; shops: Shop[]; branches: Branch[]; purchases: Purchase[] };
export const emptyLedger: Ledger = { version: 1, shops: [], branches: [], purchases: [] };
export const cents = (amount: number) => Math.round((amount + Number.EPSILON) * 100);
export const itemTotal = (item: PurchaseItem) => Math.round(item.quantity * item.unit_price_micros / 10000);
export const draftTotal = (draft: ReceiptDraft) => draft.items.reduce((sum, item) => sum + Math.round(item.quantity * Math.round(item.unit_price * 1000000) / 10000), 0);
export const money = (value: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value / 100);
export function addReceipt(ledger: Ledger, input: ReceiptDraft, id: () => string, image_uri?: string): Ledger {
  const draft = receiptSchema.parse(input);
  const normalize = (value: string) => value.trim().toLocaleLowerCase('de-DE');
  const shop = ledger.shops.find(s => normalize(s.name) === normalize(draft.shop_name) && s.type === draft.shop_type)
    ?? { id: id(), name: draft.shop_name, type: draft.shop_type };
  const branch = ledger.branches.find(b => b.shop_id === shop.id && normalize(b.address) === normalize(draft.branch_address))
    ?? { id: id(), shop_id: shop.id, address: draft.branch_address };
  const purchase: Purchase = {
    id: id(), branch_id: branch.id, purchased_at: draft.purchased_at, currency: draft.currency,
    total_cents: cents(draft.total), image_uri,
    items: draft.items.map(({ unit_price, ...item }) => ({ ...item, id: id(), unit_price_micros: Math.round(unit_price * 1000000) })),
  };
  return { version: 1,
    shops: ledger.shops.some(s => s.id === shop.id) ? ledger.shops : [...ledger.shops, shop],
    branches: ledger.branches.some(b => b.id === branch.id) ? ledger.branches : [...ledger.branches, branch],
    purchases: [purchase, ...ledger.purchases],
  };
}
export function purchaseInfo(ledger: Ledger, purchase: Purchase) {
  const branch = ledger.branches.find(b => b.id === purchase.branch_id)!;
  const shop = ledger.shops.find(s => s.id === branch.shop_id)!;
  return { branch, shop };
}
export function monthStats(ledger: Ledger, month: string) {
  const purchases = ledger.purchases.filter(p => p.purchased_at.startsWith(month));
  const totals = Object.fromEntries(categories.map(c => [c, 0])) as Record<Category, number>;
  for (const p of purchases) for (const i of p.items) totals[i.category] += itemTotal(i);
  return { purchases, total: purchases.reduce((s, p) => s + p.total_cents, 0), totals, itemCount: purchases.reduce((s, p) => s + p.items.length, 0) };
}
export function blankDraft(): ReceiptDraft {
  const date = new Date();
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { shop_name: '', shop_type: 'supermarket', branch_address: '', purchased_at: today, currency: 'EUR', total: 0,
    items: [{ receipt_item_name: '', quantity: 1, quantity_unit: 'Stk.', unit_price: 0, category: 'food' }] };
}

const idSchema = z.string().min(1);
const ledgerSchema = z.object({
  version: z.literal(1),
  shops: z.array(z.object({ id: idSchema, name: z.string().min(1), type: z.enum(shopTypes) })),
  branches: z.array(z.object({ id: idSchema, shop_id: idSchema, address: z.string() })),
  purchases: z.array(z.object({ id: idSchema, branch_id: idSchema, purchased_at: receiptSchema.shape.purchased_at, currency: z.literal('EUR'),
    total_cents: z.number().int().nonnegative(), image_uri: z.string().optional(),
    items: z.array(itemSchema.omit({ unit_price: true }).extend({ id: idSchema, unit_price_micros: z.number().int() })).min(1),
  })),
});
export function parseLedger(value: unknown): Ledger {
  const ledger = ledgerSchema.parse(value);
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  if (!unique(ledger.shops.map(s => s.id)) || !unique(ledger.branches.map(b => b.id)) || !unique(ledger.purchases.map(p => p.id)) ||
    ledger.branches.some(b => !ledger.shops.some(s => s.id === b.shop_id)) ||
    ledger.purchases.some(p => !ledger.branches.some(b => b.id === p.branch_id) || !unique(p.items.map(i => i.id)))) {
    throw new Error('Die lokalen Einkaufsdaten enthalten ungültige Verknüpfungen.');
  }
  return ledger;
}
