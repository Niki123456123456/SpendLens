import { addReceipt, blankDraft, emptyLedger, Ledger, ReceiptDraft } from '../../shared/receipt';
export function demoReceipt(): ReceiptDraft {
  return { ...blankDraft(), shop_name: 'REWE', branch_address: 'Hauptstraße 42, 45879 Gelsenkirchen', total: 17.47,
    items: [
      { receipt_item_name: 'Bio Bananen', quantity: 1.2, quantity_unit: 'kg', unit_price: 1.99, category: 'food' },
      { receipt_item_name: 'Haferdrink', quantity: 2, quantity_unit: 'Stk.', unit_price: 2.29, category: 'food' },
      { receipt_item_name: 'Vollkornbrot', quantity: 1, quantity_unit: 'Stk.', unit_price: 3.49, category: 'food' },
      { receipt_item_name: 'Spülmittel', quantity: 1, quantity_unit: 'Stk.', unit_price: 2.49, category: 'household' },
      { receipt_item_name: 'Tomaten', quantity: 1, quantity_unit: 'Stk.', unit_price: 4.52, category: 'food' },
    ] };
}
export function demoLedger(): Ledger {
  let sequence = 0;
  let ledger = addReceipt(emptyLedger, demoReceipt(), () => `demo-${++sequence}`);
  const date = blankDraft().purchased_at;
  const receipts: ReceiptDraft[] = [
    { ...blankDraft(), shop_name: 'dm', shop_type: 'drugstore', branch_address: 'Bahnhofstraße 10, Gelsenkirchen', purchased_at: date.slice(0, 8) + '03', total: 12.9, items: [{ receipt_item_name: 'Pflege & Haushalt', quantity: 1, quantity_unit: 'Stk.', unit_price: 12.9, category: 'health' }] },
    { ...blankDraft(), shop_name: 'Aral', shop_type: 'gas_station', branch_address: 'Bochumer Straße 120, Gelsenkirchen', purchased_at: date.slice(0, 8) + '02', total: 54.32, items: [{ receipt_item_name: 'Super E10', quantity: 32, quantity_unit: 'l', unit_price: 1.6975, category: 'mobility' }] },
  ];
  for (const r of receipts) ledger = addReceipt(ledger, r, () => `demo-${++sequence}`);
  return ledger;
}
