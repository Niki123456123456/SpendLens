import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../components/ui';
export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: '#93A19D', tabBarStyle: { backgroundColor: 'white', borderTopColor: colors.line, paddingTop: 9, height: 80, paddingBottom: 20 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 4 } }}>
    <Tabs.Screen name="index" options={{ title: 'Überblick', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={typeof color === 'string' ? color : colors.green} size={size} /> }} />
    <Tabs.Screen name="receipts" options={{ title: 'Kassenbons', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={typeof color === 'string' ? color : colors.green} size={size} /> }} />
    <Tabs.Screen name="insights" options={{ title: 'Auswertung', tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" color={typeof color === 'string' ? color : colors.green} size={size} /> }} />
    <Tabs.Screen name="account" options={{ title: 'Profil', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={typeof color === 'string' ? color : colors.green} size={size} /> }} />
  </Tabs>;
}
