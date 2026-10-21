import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { purchaseInfo } from '../../../shared/receipt';
import { Body, Button, Card, Field, Label, Loading, Screen, Title } from '../../components/ui';
import { ReceiptRow } from '../../components/ReceiptRow';
import { useStore } from '../../state/store';
export default function Receipts() {
  const { ledger, loading } = useStore();
  const [query, setQuery] = useState('');
  if (loading) return <Loading />;
  const purchases = [...ledger.purchases].sort((a, b) => b.purchased_at.localeCompare(a.purchased_at)).filter(p => {
    const { branch, shop } = purchaseInfo(ledger, p);
    return [shop.name, branch.address, p.purchased_at, ...p.items.map(i => i.receipt_item_name)].join(' ').toLowerCase().includes(query.toLowerCase());
  });
  return <Screen><View style={{ gap: 8 }}><Label>DEIN EINKAUFSARCHIV</Label><Title>Alle Kassenbons</Title><Body>Jeder Einkauf. Jedes kleine Detail.</Body></View><Button title="Kassenbon hinzufügen" icon="add" onPress={() => router.push('/scan')} /><Field label="Suchen" placeholder="Händler, Artikel oder Datum" value={query} onChangeText={setQuery} /><Label>{purchases.length} EINKÄUFE</Label><Card style={{ paddingVertical: 3, gap: 0 }}>{purchases.length ? purchases.map(p => <ReceiptRow ledger={ledger} purchase={p} key={p.id} />) : <Body style={{ paddingVertical: 20 }}>{query ? 'Keine passenden Einkäufe gefunden.' : 'Hier ist Platz für deinen ersten Kassenbon.'}</Body>}</Card></Screen>;
}
