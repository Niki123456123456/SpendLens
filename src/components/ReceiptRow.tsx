import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Ledger, money, Purchase, purchaseInfo } from '../../shared/receipt';
import { colors, Label, styles } from './ui';
export function ReceiptRow({ ledger, purchase }: { ledger: Ledger; purchase: Purchase }) {
  const { shop, branch } = purchaseInfo(ledger, purchase);
  const icon = shop.type === 'gas_station' ? 'car-outline' : shop.type === 'drugstore' ? 'medical-outline' : 'bag-handle-outline';
  return <Pressable accessibilityRole="button" accessibilityLabel={`${shop.name}, ${money(purchase.total_cents)}, ${purchase.purchased_at}`} onPress={() => router.push(`/purchase/${purchase.id}`)} style={[styles.row, { paddingVertical: 15 }]}>
    <View style={{ backgroundColor: shop.type === 'gas_station' ? '#EAF0FB' : '#EEF4EE', borderRadius: 16, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={22} color={colors.green} /></View>
    <View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{shop.name}</Text><Label style={{ fontSize: 11 }} >{new Date(purchase.purchased_at + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} · {purchase.items.length} Artikel</Label><Label style={{ fontSize: 10 }} >{branch.address || 'Keine Filialadresse'}</Label></View>
    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{money(purchase.total_cents)}</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} />
  </Pressable>;
}
