import { useEffect, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Body, Button, Card, colors, Label, Loading, Notice, Screen, Title } from '../../components/ui';
import { useStore } from '../../state/store';
import { prepareSignIn, SignInAttempt } from '../../lib/api';
import { hasDirectOpenAI, nativeBuildMessage } from '../../lib/direct-openai';
export default function Account() {
  const { session, demo, loading, error: storageError, login, logout, startDemo } = useStore();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState<SignInAttempt>();
  const [revision, setRevision] = useState(0);
  const iPhone = Platform.OS === 'ios';
  const requiresBuild = iPhone && !hasDirectOpenAI;
  useEffect(() => {
    let active = true;
    if (!session && !requiresBuild) {
      prepareSignIn().then(value => { if (active) { setAttempt(value); setError(''); } }).catch(e => { if (active) setError(e instanceof TypeError ? 'Der Anmeldedienst ist gerade nicht erreichbar. Bitte Internetverbindung prüfen.' : e instanceof Error ? e.message : 'Anmeldung nicht verfügbar.'); });
    }
    const refresh = !iPhone ? setTimeout(() => { if (active && !session) { setAttempt(undefined); setRevision(value => value + 1); } }, 90000) : undefined;
    return () => { active = false; if (refresh) clearTimeout(refresh); };
  }, [session, revision, iPhone, requiresBuild]);
  async function action(fn: () => Promise<void>) { setError(''); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Aktion fehlgeschlagen.'); } }
  function connect(value: SignInAttempt) { void action(() => login(value)).finally(() => { setAttempt(undefined); setRevision(value => value + 1); }); }
  if (loading) return <Loading />;
  return <Screen>
    <View style={{ gap: 8 }}><Label>DEIN SPENDLENS</Label><Title>Schön, dass du da bist.</Title><Body>Deine Bons bleiben bei dir.</Body></View>
    <Card>
      <View style={{ backgroundColor: colors.mint, borderRadius: 22, padding: 20, alignSelf: 'flex-start' }}><Ionicons name="person-outline" color={colors.green} size={30} /></View>
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 22 }}>{session?.user.name || (demo ? 'Demo ansehen' : 'Lokal unterwegs')}</Text>
      <Body>{session?.user.email || (demo ? 'Du probierst SpendLens mit Beispieldaten aus.' : 'Du kannst Einkäufe auch ohne Konto erfassen.')}</Body>
      {session ? <>
        <Notice text={session.planEnabled ? 'ChatGPT verbunden · Abo-Nutzung freigegeben' : 'ChatGPT verbunden · Abo-Nutzung nicht freigegeben'} />
        {session.transport === 'ios-direct' && <Body>Direkt auf diesem iPhone verbunden. Deine Zugangstokens bleiben im Schlüsselbund.</Body>}
        <Button title="Nutzung bei ChatGPT verwalten" secondary onPress={() => { void Linking.openURL('https://chatgpt.com/#settings'); }} />
        {iPhone && hasDirectOpenAI && <Button title="ChatGPT-Verbindung erneuern" secondary onPress={() => connect({ transport: 'ios-direct' })} />}
        <Button title="Abmelden" secondary onPress={() => { void action(logout); }} />
      </> : <>
        <Body>{iPhone ? 'Verbinde dein ChatGPT-Konto direkt auf diesem iPhone, um Kassenbonfotos auszulesen. Du entscheidest im Anmeldefenster über die Nutzung deines berechtigten ChatGPT-Plans.' : 'Verbinde ChatGPT, um Kassenbonfotos auslesen und Artikel kategorisieren zu lassen. Im Anmeldefenster entscheidest du über die Nutzung deines berechtigten ChatGPT-Plans.'}</Body>
        {requiresBuild && <Notice text={nativeBuildMessage} />}
        <Button title="Continue with ChatGPT" disabled={!attempt || requiresBuild} onPress={() => { if (attempt) connect(attempt); }} />
        {iPhone && hasDirectOpenAI && <Button title="Anderes ChatGPT-Konto verbinden" secondary onPress={() => connect({ transport: 'ios-direct', newAccount: true })} />}
        {!attempt && !requiresBuild && <Button title="Verbindung erneut prüfen" secondary onPress={() => { setAttempt(undefined); setRevision(value => value + 1); }} />}
        <Button title={demo ? 'Zurück zu meinen lokalen Daten' : 'Mit Beispieldaten ausprobieren'} secondary onPress={() => { void action(demo ? logout : startDemo); }} />
      </>}
    </Card>
    {(error || storageError) ? <Notice text={error || storageError} bad /> : null}
    <Card><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Ionicons name="shield-checkmark-outline" size={22} color={colors.green} /><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 17 }}>Deine Daten, dein Gerät</Text></View>
      <Body>{iPhone ? 'Einkäufe und Bonbilder werden lokal gespeichert. Erst mit „Mit KI auslesen“ wird das ausgewählte Foto direkt vom iPhone an OpenAI übertragen.' : 'Einkäufe und Bonbilder werden lokal gespeichert. Erst mit „Mit KI auslesen“ wird das Foto über deinen SpendLens-Server an OpenAI übertragen.'}</Body>
      <Body style={{ fontSize: 12 }}>Keine Bankverbindung. Kein automatischer Cloud-Abgleich. Deine ChatGPT-Verbindung kannst du jederzeit trennen.</Body>
    </Card><Label style={{ textAlign: 'center' }}>SPENDLENS · VERSION 1.0.0</Label>
  </Screen>;
}
