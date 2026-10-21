import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { categoryLabels, itemTotal, money, purchaseInfo } from '../../../shared/receipt';
import { Body, Button, Card, colors, Label, Loading, Notice, Screen, styles, Title } from '../../components/ui';
import { deleteImage } from '../../lib/images';
import { useStore } from '../../state/store';
export default function PurchaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ledger, loading, remove } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  if (loading) return <Loading />;
  const purchase = ledger.purchases.find(p => p.id === id);
  if (!purchase) return <Screen><Title>Bon nicht gefunden</Title><Button title="Zum Überblick" onPress={() => router.replace('/')} /></Screen>;
  const { shop, branch } = purchaseInfo(ledger, purchase);
  async function erase() {
    try { await remove(purchase!.id); deleteImage(purchase!.image_uri); router.replace('/receipts'); }
    catch { setError('Der Bon konnte nicht vollständig gelöscht werden. Bitte erneut versuchen.'); }
  }
  return <Screen><Button title="Zurück zu den Kassenbons" secondary onPress={() => router.replace('/receipts')} /><View style={{ gap: 8 }}><Label>EINKAUF · {new Date(purchase.purchased_at + 'T12:00:00').toLocaleDateString('de-DE')}</Label><Title>{shop.name}</Title><Body>{branch.address || 'Keine Filialadresse gespeichert'}</Body></View><Card><Label>BONSUMME</Label><Text style={{ fontSize: 42, fontWeight: '600', letterSpacing: -1, color: colors.ink }}>{money(purchase.total_cents)}</Text><Body>{purchase.items.length} Artikel · EUR</Body></Card><Card><Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>Das steckt in deinem Einkauf</Text>{purchase.items.map(i => <View key={i.id} style={[styles.row, { borderBottomWidth: 1, borderColor: colors.line, paddingBottom: 14 }]}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: colors.ink, fontWeight: '600', fontSize: 14 }}>{i.receipt_item_name}</Text><Body style={{ fontSize: 12 }}>{i.quantity} {i.quantity_unit} × {(i.unit_price_micros / 1000000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} €</Body><Label style={{ fontSize: 10 }}>{categoryLabels[i.category]}</Label></View><Text style={{ color: colors.ink, fontWeight: '600' }}>{money(itemTotal(i))}</Text></View>)}</Card>{purchase.image_uri && <Card><Label>ORIGINALBON</Label><Image source={{ uri: purchase.image_uri }} style={{ height: 400, width: '100%' }} resizeMode="contain" /></Card>}{Boolean(error) && <Notice text={error} bad />}{confirm ? <Card><Body>Diesen Einkauf und sein Bonbild dauerhaft von diesem Gerät entfernen?</Body><Button title="Ja, Einkauf löschen" onPress={() => { void erase(); }} /><Button title="Abbrechen" secondary onPress={() => setConfirm(false)} /></Card> : <Button title="Einkauf löschen" secondary onPress={() => setConfirm(true)} />}</Screen>;
}
