import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { blankDraft, categoryLabels, money, monthStats } from '../../../shared/receipt';
import { Body, Button, Card, categoryColors, colors, Label, Loading, Notice, Screen, styles, Title } from '../../components/ui';
import { ReceiptRow } from '../../components/ReceiptRow';
import { useStore } from '../../state/store';
export default function Home() {
  const { ledger, loading, error, demo, session, startDemo } = useStore();
  if (loading) return <Loading />;
  const month = blankDraft().purchased_at.slice(0, 7);
  const stats = monthStats(ledger, month);
  const recent = [...ledger.purchases].sort((a, b) => b.purchased_at.localeCompare(a.purchased_at)).slice(0, 3);
  const top = Object.entries(stats.totals).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return <Screen>
    <View style={styles.row}><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><View style={{ backgroundColor: colors.green, padding: 8, borderRadius: 12 }}><Ionicons name="scan-outline" size={20} color="white" /></View><Text style={{ fontWeight: '700', fontSize: 21, letterSpacing: -.7, color: colors.ink }}>spendlens<Text style={{ color: colors.green }}>.</Text></Text></View><Pressable accessibilityRole="button" accessibilityLabel="Profil öffnen" onPress={() => router.push('/account')} style={{ backgroundColor: '#E4ECE7', height: 39, width: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}><Ionicons name="person-outline" size={19} color={colors.green} /></Pressable></View>
    <View style={{ gap: 7, marginTop: 8 }}><Label>DEINE AUSGABEN. KLAR IM BLICK.</Label><Title>{'Mehr Überblick.\nWeniger Zettel.'}</Title><Body>Dein Alltag, ein bisschen übersichtlicher.</Body></View>
    {error ? <Notice text={error} bad /> : null}
    {demo && <Notice text="Demo-Modus · Alle angezeigten Einkäufe sind Beispieldaten." />}
    <Card style={{ backgroundColor: colors.green, borderColor: colors.green, padding: 25 }}>
      <View style={styles.row}><Text style={{ color: '#D3E7DE', fontSize: 13 }}>Ausgaben im {new Date(month + '-01T12:00:00').toLocaleDateString('de-DE', { month: 'long' })}</Text><Ionicons name="ellipsis-horizontal" size={22} color="#C1DDD0" /></View>
      <Text style={{ color: 'white', fontSize: 43, letterSpacing: -1.8, fontWeight: '600', marginVertical: 2 }}>{money(stats.total)}</Text>
      <View style={{ height: 1, backgroundColor: '#4C8976', marginVertical: 2 }} />
      <View style={styles.row}><View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}><Ionicons name="receipt-outline" size={16} color="#D0E4DA" /><Text style={{ color: '#D0E4DA', fontSize: 12 }}>{stats.purchases.length} Kassenbons erfasst</Text></View><Text style={{ color: '#D0E4DA', fontSize: 12 }}>{stats.itemCount} Positionen</Text></View>
    </Card>
    <Pressable accessibilityRole="button" accessibilityLabel="Kassenbon scannen" onPress={() => router.push('/scan')} style={[styles.row, { padding: 21, backgroundColor: '#E7EFEA', borderRadius: 20 }]}><View style={{ padding: 12, backgroundColor: 'white', borderRadius: 14 }}><Ionicons name="scan-outline" size={25} color={colors.green} /></View><View style={{ flex: 1, gap: 4 }}><Text style={{ fontWeight: '700', color: colors.ink, fontSize: 16 }}>Bon rein. Überblick raus.</Text><Body style={{ fontSize: 12 }}>Fotografieren, prüfen, fertig.</Body></View><Ionicons name="arrow-forward" size={22} color={colors.green} /></Pressable>
    {ledger.purchases.length === 0 ? <Card><Title>Dein erster Bon?</Title><Body>Scanne einen Kassenbon oder erfasse deinen Einkauf von Hand. Händler, Filiale und Artikel bleiben lokal auf deinem Gerät.</Body><Button title="Ersten Bon hinzufügen" onPress={() => router.push('/scan')} icon="add" /><Button title="Mit Beispieldaten ausprobieren" secondary onPress={() => { void startDemo().catch(() => {}); }} /></Card> : <>
      <View style={styles.row}><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18 }}>Wohin geht dein Geld?</Text><Pressable accessibilityRole="button" onPress={() => router.push('/insights')}><Text style={{ color: colors.green, fontSize: 12, fontWeight: '600' }}>Auswertung ↗</Text></Pressable></View>
      <View style={{ flexDirection: 'row', gap: 10 }}>{top.map(([category, value]) => <View key={category} style={{ flex: 1, padding: 15, gap: 12, borderRadius: 18, backgroundColor: 'white', borderWidth: 1, borderColor: colors.line }}><View style={{ height: 7, width: 26, borderRadius: 4, backgroundColor: categoryColors[category as keyof typeof categoryColors] }} /><Label style={{ fontSize: 10 }}>{categoryLabels[category as keyof typeof categoryLabels]}</Label><Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{money(value)}</Text></View>)}</View>
      <View style={styles.row}><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 18 }}>Letzte Einkäufe</Text><Pressable accessibilityRole="button" onPress={() => router.push('/receipts')}><Text style={{ color: colors.green, fontSize: 12, fontWeight: '600' }}>Alle ansehen</Text></Pressable></View>
      <Card style={{ paddingVertical: 3, paddingHorizontal: 17, gap: 0 }}>{recent.map(purchase => <ReceiptRow key={purchase.id} ledger={ledger} purchase={purchase} />)}</Card>
    </>}
    <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 6, alignItems: 'center' }}><Ionicons name="shield-checkmark-outline" size={13} color={colors.muted} /><Label style={{ fontSize: 10 }}>{session ? 'Mit ChatGPT verbunden · Lokal gespeichert' : 'Lokal gespeichert · Dein Überblick gehört dir'}</Label></View>
  </Screen>;
}
