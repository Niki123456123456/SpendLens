import { useTranslation } from '../../i18n';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Body, Button, Card, colors, Label, Loading, Notice, Screen, Title } from '../../components/ui';
import { useStore } from '../../state/store';
import { prepareSignIn, SignInAttempt } from '../../lib/api';
import { hasDirectOpenAI, nativeBuildMessage } from '../../lib/direct-openai';
import { shareReceiptExport } from '../../lib/export';
export default function Account() {
  const { t, errorText, count, language } = useTranslation();
  const { ledger, session, demo, loading, error: storageError, login, logout, startDemo } = useStore();
  const [exporting, setExporting] = useState(false);
  const exportBusy = useRef(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState<SignInAttempt>();
  const [revision, setRevision] = useState(0);
  const iPhone = Platform.OS === 'ios';
  const requiresBuild = iPhone && !hasDirectOpenAI;
  useEffect(() => {
    let active = true;
    if (!session && !requiresBuild) {
      prepareSignIn().then(value => { if (active) { setAttempt(value); setError(''); } }).catch(e => { if (active) setError(e instanceof TypeError ? t('Der Anmeldedienst ist gerade nicht erreichbar. Bitte Internetverbindung prüfen.') : e instanceof Error ? errorText(e.message) : t('Anmeldung nicht verfügbar.')); });
    }
    const refresh = !iPhone ? setTimeout(() => { if (active && !session) { setAttempt(undefined); setRevision(value => value + 1); } }, 90000) : undefined;
    return () => { active = false; if (refresh) clearTimeout(refresh); };
  }, [session, revision, iPhone, requiresBuild, t, errorText]);
  async function action(fn: () => Promise<void>) { setError(''); try { await fn(); } catch (e) { setError(e instanceof Error ? errorText(e.message) : t('Aktion fehlgeschlagen.')); } }
  function connect(value: SignInAttempt) { void action(() => login(value)).finally(() => { setAttempt(undefined); setRevision(value => value + 1); }); }
  async function exportBons() {
    if (exportBusy.current) return;
    exportBusy.current = true; setExporting(true);
    try { await action(() => shareReceiptExport(ledger, demo)); }
    finally { exportBusy.current = false; setExporting(false); }
  }
  if (loading) return <Loading />;
  return <Screen>
    <View style={{ gap: 8 }}><Label>{t('DEIN SPENDLENS')}</Label><Title>{t('Schön, dass du da bist.')}</Title><Body>{t('Deine Bons bleiben bei dir.')}</Body></View>
    {(error || storageError) ? <Notice text={error || storageError} bad /> : null}
    {iPhone && <Card>
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 20 }}>{t('Sprache')}</Text>
      <Body>{t('Wähle unter „Bevorzugte Sprache“ Deutsch oder Englisch aus.')}</Body>
      <Button title={t('Sprache in den iOS-Einstellungen ändern')} secondary icon="language-outline" onPress={() => { void Linking.openSettings().catch(() => setError(t('Die Einstellungen konnten nicht geöffnet werden.'))); }} />
    </Card>}
    {iPhone && <Card>
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 20 }}>{t('Deine Bons exportieren')}</Text>
      <Body>{count('receipts', ledger.purchases.length)} · {demo ? t('Beispieldaten') : t('Alle Bons im aktuellen Profil')}{t(', einschließlich Händler, Filialen, Artikel, Kategorien und Beträge. Ohne Bonfotos.')}</Body>
      <Button title={exporting ? t('Export läuft …') : t('Alle Bons als JSON exportieren')} icon="download-outline" disabled={exporting} onPress={() => { void exportBons(); }} />
      <Body>{t('Im Teilen-Menü „In Dateien sichern“ auswählen, um die JSON-Datei auf deinem iPhone zu speichern.')}</Body>
    </Card>}
    <Card>
      <View style={{ backgroundColor: colors.mint, borderRadius: 22, padding: 20, alignSelf: 'flex-start' }}><Ionicons name="person-outline" color={colors.green} size={30} /></View>
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 22 }}>{session?.user.name || (demo ? t('Demo ansehen') : t('Lokal unterwegs'))}</Text>
      <Body>{session?.user.email || (demo ? t('Du probierst SpendLens mit Beispieldaten aus.') : t('Du kannst Einkäufe auch ohne Konto erfassen.'))}</Body>
      {session ? <>
        <Notice text={session.planEnabled ? t('ChatGPT verbunden · Abo-Nutzung freigegeben') : t('ChatGPT verbunden · Abo-Nutzung nicht freigegeben')} />
        {session.transport === 'ios-direct' && <Body>{t('Direkt auf diesem iPhone verbunden. Deine Zugangstokens bleiben im Schlüsselbund.')}</Body>}
        <Button title={t('Nutzung bei ChatGPT verwalten')} secondary onPress={() => { void Linking.openURL('https://chatgpt.com/#settings'); }} />
        {iPhone && hasDirectOpenAI && <Button title={t('ChatGPT-Verbindung erneuern')} secondary onPress={() => connect({ transport: 'ios-direct' })} />}
        <Button title={t('Abmelden')} secondary onPress={() => { void action(logout); }} />
      </> : <>
        <Body>{iPhone ? t('Verbinde dein ChatGPT-Konto direkt auf diesem iPhone, um Kassenbonfotos auszulesen. Du entscheidest im Anmeldefenster über die Nutzung deines berechtigten ChatGPT-Plans.') : t('Verbinde ChatGPT, um Kassenbonfotos auslesen und Artikel kategorisieren zu lassen. Im Anmeldefenster entscheidest du über die Nutzung deines berechtigten ChatGPT-Plans.')}</Body>
        {requiresBuild && <Notice text={nativeBuildMessage} />}
        <Button title={t('Continue with ChatGPT')} disabled={!attempt || requiresBuild} onPress={() => { if (attempt) connect(attempt); }} />
        {iPhone && hasDirectOpenAI && <Button title={t('Anderes ChatGPT-Konto verbinden')} secondary onPress={() => connect({ transport: 'ios-direct', newAccount: true })} />}
        {!attempt && !requiresBuild && <Button title={t('Verbindung erneut prüfen')} secondary onPress={() => { setAttempt(undefined); setRevision(value => value + 1); }} />}
        <Button title={demo ? t('Zurück zu meinen lokalen Daten') : t('Mit Beispieldaten ausprobieren')} secondary onPress={() => { void action(demo ? logout : startDemo); }} />
      </>}
    </Card>
    <Card>
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 20 }}>{t('Hilfe und Datenschutz')}</Text>
      <Button title={t('Support öffnen')} secondary icon="help-circle-outline" onPress={() => { void action(async () => { await Linking.openURL(`https://niki123456123456.github.io/SpendLens/${language === 'en' ? 'en/' : ''}#support`); }); }} />
      <Button title={t('Datenschutzerklärung öffnen')} secondary icon="document-text-outline" onPress={() => { void action(async () => { await Linking.openURL(`https://niki123456123456.github.io/SpendLens/${language === 'en' ? 'en/' : ''}privacy.html`); }); }} />
    </Card>
    <Card><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Ionicons name="shield-checkmark-outline" size={22} color={colors.green} /><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 17 }}>{t('Deine Daten, dein Gerät')}</Text></View>
      <Body>{iPhone ? t('Einkäufe und Bonbilder werden lokal gespeichert. Erst mit „Mit KI auslesen“ wird das ausgewählte Foto direkt vom iPhone an OpenAI übertragen.') : t('Einkäufe und Bonbilder werden lokal gespeichert. Erst mit „Mit KI auslesen“ wird das Foto über deinen SpendLens-Server an OpenAI übertragen.')}</Body>
      <Body style={{ fontSize: 12 }}>{t('Keine Bankverbindung. Kein automatischer Cloud-Abgleich. Deine ChatGPT-Verbindung kannst du jederzeit trennen.')}</Body>
    </Card><Label style={{ textAlign: 'center' }}>{t('SPENDLENS · VERSION 1.0.0')}</Label>
  </Screen>;
}
