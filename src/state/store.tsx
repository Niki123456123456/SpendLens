import { t, errorText } from '../i18n';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { addReceipt, emptyLedger, Ledger, parseLedger, ReceiptDraft } from '../../shared/receipt';
import { AsyncStorage, writeSecret } from '../lib/storage';
import { demoLedger } from '../lib/demo';
import { endSession, restoreSession, Session, SignInAttempt, signIn } from '../lib/api';

type Store = { ledger: Ledger; loading: boolean; error: string; session: Session | null; demo: boolean;
  login: (attempt: SignInAttempt) => Promise<void>; logout: () => Promise<void>; startDemo: () => Promise<void>;
  save: (draft: ReceiptDraft, image?: string) => Promise<string>; remove: (id: string) => Promise<void> };
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ledger, setLedger] = useState<Ledger>(emptyLedger);
  const [session, setSession] = useState<Session | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const key = useRef('spendlens.ledger.guest');
  const busy = useRef(false);
  const writable = useRef(false);
  async function load(account: Session | null, isDemo = false) {
    const nextKey = `spendlens.ledger.${isDemo ? 'demo' : account?.user.id || 'guest'}`;
    const raw = await AsyncStorage.getItem(nextKey);
    const data: Ledger = raw ? parseLedger(JSON.parse(raw)) : isDemo ? demoLedger() : emptyLedger;
    if (isDemo && !raw) await AsyncStorage.setItem(nextKey, JSON.stringify(data));
    await AsyncStorage.setItem('spendlens.demo', String(isDemo));
    writable.current = true; key.current = nextKey; setLedger(data); setSession(account); setDemo(isDemo);
  }
  useEffect(() => { (async () => {
    try {
      const saved = await restoreSession();
      const isDemo = !saved && await AsyncStorage.getItem('spendlens.demo') === 'true';
      await load(saved, isDemo);
    } catch { setError(t('Lokale Daten konnten nicht geladen werden. Bitte die App neu starten.')); }
    finally { setLoading(false); }
  })(); }, []);
  async function transition(work: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try { await work(); } catch (e) { setError(e instanceof Error ? errorText(e.message) : t('Aktion konnte nicht abgeschlossen werden.')); throw e; } finally { setLoading(false); busy.current = false; }
  }
  async function commit(next: Ledger) {
    if (busy.current || !writable.current) throw new Error(t('Die lokalen Daten sind gerade nicht verfügbar.'));
    busy.current = true;
    try { await AsyncStorage.setItem(key.current, JSON.stringify(next)); setLedger(next); }
    finally { busy.current = false; }
  }
  const value: Store = { ledger, loading, error, session, demo,
    login: attempt => transition(async () => { const next = await signIn(attempt); if (next) { await load(next); if (next.transport !== 'ios-direct') await writeSecret('spendlens.session', JSON.stringify(next)); } }),
    logout: () => transition(async () => {
      if (session) await endSession(session);
      await load(null); await writeSecret('spendlens.session', null);
    }),
    startDemo: () => transition(() => load(null, true)),
    save: async (draft, image) => { const next = addReceipt(ledger, draft, Crypto.randomUUID, image); await commit(next); return next.purchases[0].id; },
    remove: async id => { await commit({ ...ledger, purchases: ledger.purchases.filter(p => p.id !== id) }); },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStore() { const value = useContext(Context); if (!value) throw new Error('StoreProvider fehlt'); return value; }
