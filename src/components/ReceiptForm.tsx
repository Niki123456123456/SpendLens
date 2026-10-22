import { useTranslation } from '../i18n';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { categories, receiptSchema, ReceiptDraft, shopTypes } from '../../shared/receipt';
import { Body, Button, Card, colors, Field, Label, Notice, styles } from './ui';
const number = (text: string) => text.trim() === '' ? NaN : Number(text.replace(',', '.'));
export function ReceiptForm({ initial, onSave }: { initial: ReceiptDraft; onSave: (draft: ReceiptDraft) => Promise<void> }) {
  const { t, errorText, money, categoryLabels, count, locale } = useTranslation();
  const typeLabels = { supermarket: t('Supermarkt'), gas_station: t('Tankstelle'), drugstore: t('Drogerie'), restaurant: t('Restaurant'), other: t('Sonstiges') };
  const [draft, setDraft] = useState(initial);
  const [total, setTotal] = useState(String(initial.total));
  const [items, setItems] = useState(initial.items.map(i => ({ ...i, key: Crypto.randomUUID(), quantity: String(i.quantity), unit_price: String(i.unit_price) })));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const sum = items.reduce((s, i) => s + Math.round(number(i.quantity) * number(i.unit_price) * 100), 0);
  const diff = Math.round(number(total) * 100) - sum;
  async function save() {
    setError('');
    const parsed = receiptSchema.safeParse({ ...draft, total: number(total), items: items.map(({ key, quantity, unit_price, ...i }) => ({ ...i, quantity: number(quantity), unit_price: number(unit_price) })) });
    if (!parsed.success) { setError(t('Bitte Händler, gültiges Datum (JJJJ-MM-TT), Bonsumme und alle Artikel mit Bezeichnung, positiver Menge und gültigem Preis ausfüllen.')); return; }
    setSaving(true);
    try { await onSave(parsed.data); } catch (e) { setError(e instanceof Error ? errorText(e.message) : t('Speichern fehlgeschlagen.')); } finally { setSaving(false); }
  }
  return <View style={{ gap: 20 }}><Card><Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{t('Einkauf prüfen')}</Text><Field label={t('Händler')} value={draft.shop_name} onChangeText={shop_name => setDraft({ ...draft, shop_name })} placeholder={t('z. B. REWE')} /><Label>{t('HÄNDLERTYP')}</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{shopTypes.map(type => <Pressable accessibilityRole="button" accessibilityState={{ selected: draft.shop_type === type }} key={type} onPress={() => setDraft({ ...draft, shop_type: type })} style={{ padding: 10, borderRadius: 10, backgroundColor: draft.shop_type === type ? colors.mint : colors.bg }}><Text style={{ color: colors.ink, fontSize: 12 }}>{typeLabels[type]}</Text></Pressable>)}</View><Field label={t('Filialadresse')} value={draft.branch_address} onChangeText={branch_address => setDraft({ ...draft, branch_address })} placeholder={t('Straße, Hausnummer, PLZ und Ort')} /><Field label={t('Datum (JJJJ-MM-TT)')} value={draft.purchased_at} onChangeText={purchased_at => setDraft({ ...draft, purchased_at })} placeholder="2026-10-21" /><Field label={t('Bonsumme in EUR')} value={total} keyboardType="decimal-pad" onChangeText={setTotal} /></Card>
    <View style={styles.row}><Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{t('Artikel')}</Text><Label>{count('lines', items.length).toLocaleUpperCase(locale)}</Label></View>
    {items.map((item, index) => {
      const update = (patch: Partial<typeof item>) => setItems(items.map((i, n) => n === index ? { ...i, ...patch } : i));
      return <Card key={item.key}><View style={styles.row}><Label>{t('ARTIKEL')} {index + 1}</Label><Pressable accessibilityRole="button" accessibilityLabel={t('Artikel {0} entfernen', [index + 1])} onPress={() => setItems(items.filter((_, n) => n !== index))}><Text style={{ color: '#AE6756', fontSize: 12, padding: 5 }}>{t('Entfernen')}</Text></Pressable></View><Field label={t('Artikelname {0}', [index + 1])} value={item.receipt_item_name} onChangeText={receipt_item_name => update({ receipt_item_name })} placeholder={t('Artikelbezeichnung')} /><View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label={t('Menge {0}', [index + 1])} keyboardType="decimal-pad" value={item.quantity} onChangeText={quantity => update({ quantity })} /></View><View style={{ flex: 1 }}><Field label={t('Einheit {0}', [index + 1])} value={item.quantity_unit} onChangeText={quantity_unit => update({ quantity_unit })} /></View><View style={{ flex: 1 }}><Field label={t('Preis EUR {0}', [index + 1])} keyboardType="decimal-pad" value={item.unit_price} onChangeText={unit_price => update({ unit_price })} /></View></View><Label>{t('KATEGORIE')}</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{categories.map(category => <Pressable accessibilityRole="button" accessibilityLabel={t('{0} für Artikel {1}', [categoryLabels[category], index + 1])} accessibilityState={{ selected: category === item.category }} key={category} onPress={() => update({ category })} style={{ padding: 9, backgroundColor: category === item.category ? colors.mint : colors.bg, borderRadius: 9 }}><Text style={{ color: colors.ink, fontSize: 11 }}>{categoryLabels[category]}</Text></Pressable>)}</View></Card>;
    })}
    <Button title={t('Artikel hinzufügen')} secondary icon="add" onPress={() => setItems([...items, { key: Crypto.randomUUID(), receipt_item_name: '', category: 'other', quantity: '1', quantity_unit: t('Stk.'), unit_price: '0' }])} />
    <Card><View style={styles.row}><Body>{t('Summe der Artikel')}</Body><Text style={{ fontWeight: '700', color: colors.ink }}>{Number.isFinite(sum) ? money(sum) : '–'}</Text></View>{Number.isFinite(diff) && Math.abs(diff) > 1 && <Notice text={t('Die Artikelsumme weicht um {0} von der Bonsumme ab. Bitte prüfe Rabatte, Pfand und Rundungen. Du kannst den Bon nach Prüfung trotzdem speichern.', [money(diff)])} />}<Body style={{ fontSize: 12 }}>{t('Alle Angaben prüfen. Die KI kann insbesondere Mengen, Rabatte und Preise falsch erkennen.')}</Body></Card>
    {Boolean(error) && <Notice text={error} bad />}<Button title={saving ? t('Wird gespeichert …') : t('Einkauf lokal speichern')} disabled={saving} icon="checkmark" onPress={() => { void save(); }} />
  </View>;
}
