import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { z } from 'zod';
import type { Session } from './api';

type NativeOpenAI = {
  getSession(): Promise<string | null>;
  signIn(newAccount: boolean): Promise<string | null>;
  signOut(): Promise<void>;
  cancelSignIn(): Promise<void>;
  analyzeReceipt(image: string, schema: string, expectedUserID: string): Promise<string>;
};
const module = Platform.OS === 'ios' ? requireOptionalNativeModule<NativeOpenAI>('SpendLensOpenAI') : null;
export const hasDirectOpenAI = Boolean(module);
export const nativeBuildMessage = 'Die direkte ChatGPT-Anmeldung benötigt den nativen SpendLens-Development-Build. Expo Go enthält dieses iPhone-Modul nicht.';
const sessionSchema = z.object({
  transport: z.literal('ios-direct'), token: z.literal(''),
  user: z.object({ id: z.string().regex(/^[a-f0-9]{64}$/), name: z.string(), email: z.string().optional() }),
  planEnabled: z.boolean(), model: z.string().optional(),
});
function native() { if (!module) throw new Error(nativeBuildMessage); return module; }
function parse(value: string | null): Session | null { return value ? sessionSchema.parse(JSON.parse(value)) : null; }
export async function restoreDirectSession() { return module ? parse(await module.getSession()) : null; }
export async function directSignIn(newAccount = false) { return parse(await native().signIn(newAccount)); }
export async function directSignOut() { await native().signOut(); }
export async function directAnalyze(image: string, schema: string, userID: string) { return JSON.parse(await native().analyzeReceipt(image, schema, userID)); }
