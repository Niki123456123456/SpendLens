import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { receiptSchema, ReceiptDraft } from '../../shared/receipt';
WebBrowser.maybeCompleteAuthSession();
export const apiUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
export type Session = { token: string; user: { id: string; name: string; email?: string }; planEnabled: boolean };
export async function request<T>(path: string, token?: string, body?: unknown): Promise<T> {
  const response = await fetch(apiUrl + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Die Anfrage konnte nicht abgeschlossen werden.');
  return result;
}
export type SignInAttempt = { url: string; state: string; verifier: string; redirectUri: string };
export async function prepareSignIn(): Promise<SignInAttempt> {
  const config = await request<{ mode: string }>('/health');
  if (config.mode === 'local-plan' && Platform.OS !== 'web') throw new Error('Die lokale ChatGPT-Abo-Anmeldung funktioniert im Browser auf dem Computer, auf dem der Server läuft. Für diesen mobilen Build bitte einen registrierten OAuth-Client am Server konfigurieren.');
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'spendlens', path: 'auth-return' });
  const verifier = Crypto.randomUUID() + Crypto.randomUUID();
  const challenge = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
  const attempt = await request<{ url: string; state: string }>('/auth/prepare', undefined, { redirectUri, challenge });
  return { ...attempt, verifier, redirectUri };
}
export async function signIn(attempt: SignInAttempt): Promise<Session | null> {
  // Open immediately from the button event; async preparation would lose the browser user gesture.
  const result = await WebBrowser.openAuthSessionAsync(attempt.url, attempt.redirectUri);
  if (result.type !== 'success') return null;
  const params = new URL(result.url).searchParams;
  if (params.get('state') !== attempt.state) throw new Error('Die Anmeldung konnte nicht verifiziert werden. Bitte erneut versuchen.');
  if (params.has('error')) throw new Error('Die ChatGPT-Anmeldung wurde nicht abgeschlossen.');
  const ticket = params.get('ticket');
  if (!ticket) throw new Error('Die Anmeldung ist unvollständig.');
  return request<Session>('/auth/redeem', undefined, { ticket, verifier: attempt.verifier });
}
export async function analyzeReceipt(image: string, session: Session): Promise<ReceiptDraft> {
  const result = await request<{ receipt: unknown }>('/receipts/analyze', session.token, { image });
  return receiptSchema.parse(result.receipt);
}
