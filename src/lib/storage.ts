import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
export async function readSecret(key: string) {
  return Platform.OS === 'web' ? sessionStorage.getItem(key) : SecureStore.getItemAsync(key);
}
export async function writeSecret(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value);
  } else if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}
export { AsyncStorage };
