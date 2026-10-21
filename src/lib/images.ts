import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
export async function persistImage(dataUri: string) {
  if (Platform.OS === 'web') return dataUri;
  const file = new File(Paths.document, `receipt-${Crypto.randomUUID()}.jpg`);
  file.create();
  file.write(dataUri.split(',')[1], { encoding: 'base64' });
  return file.uri;
}
export function deleteImage(uri?: string) {
  if (uri && Platform.OS !== 'web' && uri.startsWith(Paths.document.uri)) {
    const file = new File(uri); if (file.exists) file.delete();
  }
}
