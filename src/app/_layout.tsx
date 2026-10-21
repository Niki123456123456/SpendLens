import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider } from '../state/store';
export default function RootLayout() {
  return <StoreProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /><Stack.Screen name="scan" options={{ presentation: 'modal' }} /><Stack.Screen name="purchase/[id]" /><Stack.Screen name="auth-return" /></Stack></StoreProvider>;
}
