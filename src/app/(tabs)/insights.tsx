import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { blankDraft, categories, categoryLabels, money, monthStats } from '../../../shared/receipt';
import { Body, Card, categoryColors, colors, Label, Loading, Screen, styles, Title } from '../../components/ui';
import { useStore } from '../../state/store';
export default function Insights() {
  const { ledger, loading } = useStore();
  const [month, setMonth] = useState(blankDraft().purchased_at.slice(0, 7));
  if (loading) return <Loading />;
  const stats = monthStats(ledger, month);
  const itemSum = Object.values(stats.totals).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(stats.totals));
  function move(offset: number) { const d = new Date(month + '-01T12:00:00'); d.setMonth(d.getMonth() + offset); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
  return <Screen><View style={{ gap: 8 }}><Label>VERSTEH DEINE AUSGABEN</Label><Title>Ein klareres Bild.</Title><Body>Kleine Einkäufe ergeben das große Ganze.</Body></View><View style={styles.row}><Pressable accessibilityRole="button" accessibilityLabel="Vorheriger Monat" onPress={() => move(-1)} style={{ padding: 12 }}><Ionicons name="chevron-back" size={20} color={colors.green} /></Pressable><Text style={{ fontWeight: '600', color: colors.ink }}>{new Date(month + '-01T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</Text><Pressable accessibilityRole="button" accessibilityLabel="Nächster Monat" onPress={() => move(1)} style={{ padding: 12 }}><Ionicons name="chevron-forward" size={20} color={colors.green} /></Pressable></View><Card><Label>GESAMTAUSGABEN</Label><Text style={{ fontSize: 40, fontWeight: '600', color: colors.ink, letterSpacing: -1 }}>{money(stats.total)}</Text><View style={styles.row}><Body>{stats.purchases.length} Einkäufe</Body><Body>Ø {money(stats.purchases.length ? Math.round(stats.total / stats.purchases.length) : 0)} pro Einkauf</Body></View></Card><Card><Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>Nach Kategorie</Text>{categories.map(category => <View key={category} style={{ gap: 9 }}><View style={styles.row}><Text style={{ fontSize: 13, color: colors.ink }}>{categoryLabels[category]}</Text><Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{money(stats.totals[category])}</Text></View><View style={{ height: 8, backgroundColor: '#F0F3F1', borderRadius: 8 }}><View style={{ height: 8, borderRadius: 8, width: `${Math.max(0, stats.totals[category] / max * 100)}%`, backgroundColor: categoryColors[category] }} /></View></View>)}<Body style={{ fontSize: 11 }}>Kategorien basieren auf Menge × Einzelpreis. Differenz zur Bonsumme: {money(stats.total - itemSum)} (z. B. Rabatte oder Rundung).</Body></Card>{stats.purchases.length === 0 && <Body>Für diesen Monat sind noch keine Einkäufe gespeichert.</Body>}</Screen>;
}
