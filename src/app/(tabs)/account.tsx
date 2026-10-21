import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Body, Button, Card, colors, Label, Loading, Notice, Screen, Title } from '../../components/ui';
import { useStore } from '../../state/store';
import { prepareSignIn, SignInAttempt } from '../../lib/api';
export default function Account() {
  const { session, demo, loading, error: storageError, login, logout, startDemo } = useStore();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState<SignInAttempt>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    if (!session) {
      prepareSignIn().then(value => { if (active) { setAttempt(value); setError(''); } }).catch(e => { if (active) setError(e instanceof TypeError ? 'SpendLens-Server nicht erreichbar. Bitte npm run server starten und die API-Adresse prüfen.' : e instanceof Error ? e.message : 'Anmeldung nicht verfügbar.'); });
    }
    const refresh = setTimeout(() => { if (active && !session) { setAttempt(undefined); setRevision(value => value + 1); } }, 90000);
    return () => { active = false; clearTimeout(refresh); };
  }, [session, revision]);
  async function action(fn: () => Promise<void>) { setError(''); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Aktion fehlgeschlagen.'); } }
  if (loading) return <Loading />;
  return <Screen><View style={{ gap: 8 }}><Label>DEIN SPENDLENS</Label><Title>Schön, dass du da bist.</Title><Body>Deine Bons bleiben bei dir.</Body></View><Card><View style={{ backgroundColor: colors.mint, borderRadius: 22, padding: 20, alignSelf: 'flex-start' }}><Ionicons name="person-outline" color={colors.green} size={30} /></View><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 22 }}>{session?.user.name || (demo ? 'Demo ansehen' : 'Lokal unterwegs')}</Text><Body>{session?.user.email || (demo ? 'Du probierst SpendLens mit Beispieldaten aus.' : 'Du kannst Einkäufe auch ohne Konto erfassen.')}</Body>{session ? <><Notice text={session.planEnabled ? 'ChatGPT verbunden · Abo-Nutzung freigegeben' : 'ChatGPT verbunden · Anmeldung aktiv'} /><Button title="Nutzung bei ChatGPT verwalten" secondary onPress={() => { void Linking.openURL('https://chatgpt.com/#settings'); }} /><Button title="Abmelden" secondary onPress={() => { void action(logout); }} /></> : <><Body>Verbinde ChatGPT, um Kassenbonfotos auslesen und Artikel kategorisieren zu lassen. Bei der lokalen Abo-Anmeldung gibst du die Nutzung deines berechtigten ChatGPT-Plans frei.</Body><Button title="Continue with ChatGPT" disabled={!attempt} onPress={() => { if (attempt) void action(() => login(attempt)).finally(() => { setAttempt(undefined); setRevision(value => value + 1); }); }} />{!attempt && <Button title="Verbindung erneut prüfen" secondary onPress={() => { setAttempt(undefined); setRevision(value => value + 1); }} />}<Button title={demo ? 'Zurück zu meinen lokalen Daten' : 'Mit Beispieldaten ausprobieren'} secondary onPress={() => { void action(demo ? logout : startDemo); }} /></>}</Card>{(error || storageError) ? <Notice text={error || storageError} bad /> : null}<Card><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Ionicons name="shield-checkmark-outline" size={22} color={colors.green} /><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 17 }}>Deine Daten, dein Gerät</Text></View><Body>Einkäufe, Artikel und Bonbilder werden lokal gespeichert. Erst wenn du „Mit KI auslesen“ auswählst, wird das gewählte Foto über deinen SpendLens-Server an OpenAI übertragen.</Body><Body style={{ fontSize: 12 }}>Keine Bankverbindung. Kein automatischer Cloud-Abgleich. Im Browser liegen Bondaten im Browser-Speicher; native Sitzungen werden im sicheren Gerätespeicher abgelegt.</Body></Card><Label style={{ textAlign: 'center' }}>SPENDLENS · VERSION 1.0.0</Label></Screen>;
}
