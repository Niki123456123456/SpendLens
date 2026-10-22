import { t, errorText } from '../i18n';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { z } from 'zod';
import { directAnalyze, directSignIn, directSignOut, hasDirectOpenAI, nativeBuildMessage, restoreDirectSession } from './direct-openai';
import { readSecret } from './storage';
import { receiptSchema, ReceiptDraft } from '../../shared/receipt';
WebBrowser.maybeCompleteAuthSession();
export const apiUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
export type Session = { transport?: 'backend' | 'ios-direct'; model?: string; token: string; user: { id: string; name: string; email?: string }; planEnabled: boolean };
export async function request<T>(path: string, token?: string, body?: unknown): Promise<T> {
  const response = await fetch(apiUrl + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error((result.error && errorText(result.error)) || t('Die Anfrage konnte nicht abgeschlossen werden.'));
  return result;
}
export type SignInAttempt = { transport?: 'backend'; url: string; state: string; verifier: string; redirectUri: string } | { transport: 'ios-direct'; newAccount?: boolean };
export async function prepareSignIn(): Promise<SignInAttempt> {
  if (Platform.OS === 'ios') {
    if (!hasDirectOpenAI) throw new Error(nativeBuildMessage);
    return { transport: 'ios-direct' };
  }
  const config = await request<{ mode: string }>('/health');
  if (config.mode === 'local-plan' && Platform.OS !== 'web') throw new Error(t('Die lokale ChatGPT-Abo-Anmeldung funktioniert im Browser auf dem Computer, auf dem der Server läuft. Für diesen mobilen Build bitte einen registrierten OAuth-Client am Server konfigurieren.'));
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'spendlens', path: 'auth-return' });
  const verifier = Crypto.randomUUID() + Crypto.randomUUID();
  const challenge = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
  const attempt = await request<{ url: string; state: string }>('/auth/prepare', undefined, { redirectUri, challenge });
  return { ...attempt, verifier, redirectUri };
}
export async function signIn(attempt: SignInAttempt): Promise<Session | null> {
  if (attempt.transport === 'ios-direct') return directSignIn(attempt.newAccount);
  // Open immediately from the button event; async preparation would lose the browser user gesture.
  const result = await WebBrowser.openAuthSessionAsync(attempt.url, attempt.redirectUri);
  if (result.type !== 'success') return null;
  const params = new URL(result.url).searchParams;
  if (params.get('state') !== attempt.state) throw new Error(t('Die Anmeldung konnte nicht verifiziert werden. Bitte erneut versuchen.'));
  if (params.has('error')) throw new Error(t('Die ChatGPT-Anmeldung wurde nicht abgeschlossen.'));
  const ticket = params.get('ticket');
  if (!ticket) throw new Error(t('Die Anmeldung ist unvollständig.'));
  return request<Session>('/auth/redeem', undefined, { ticket, verifier: attempt.verifier });
}
export async function analyzeReceipt(image: string, session: Session): Promise<ReceiptDraft> {
  if (session.transport === 'ios-direct') return receiptSchema.parse(await directAnalyze(image, JSON.stringify(z.toJSONSchema(receiptSchema)), session.user.id));
  const result = await request<{ receipt: unknown }>('/receipts/analyze', session.token, { image });
  return receiptSchema.parse(result.receipt);
}

export async function restoreSession(): Promise<Session | null> {
  if (Platform.OS === 'ios') return restoreDirectSession();
  const raw = await readSecret('spendlens.session');
  return raw ? JSON.parse(raw) as Session : null;
}
export async function endSession(session: Session) {
  if (session.transport === 'ios-direct') return directSignOut();
  await request('/auth/logout', session.token, {}).catch(() => {});
}
