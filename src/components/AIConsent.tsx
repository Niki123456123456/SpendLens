import { useState } from 'react';
import { Linking, Modal, Text } from 'react-native';
import { useTranslation } from '../i18n';
import { Body, Button, Card, colors, Notice, Screen, Title } from './ui';

/** Every analysis needs a fresh decision; opening or dismissing this sheet sends nothing. */
export function AIConsent({ visible, direct, onCancel, onConfirm }: {
  visible: boolean; direct: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const { t, language } = useTranslation();
  const [linkError, setLinkError] = useState(false);
  async function open(url: string) {
    setLinkError(false);
    try { await Linking.openURL(url); } catch { setLinkError(true); }
  }
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
    <Screen>
      <Title>{t('Dieses Bonfoto an OpenAI senden?')}</Title>
      <Card>
        <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '700' }}>{t('Empfänger: OpenAI (ChatGPT)')}</Text>
        <Body>{t('Gesendet werden das vollständige ausgewählte Bonfoto und Anweisungen zur Erkennung von Händler, Datum, Artikeln, Preisen und Kategorien. Sichtbare Namen, Adressen, Kunden- oder Zahlungsdaten und dein Einkaufsverlauf auf diesem Bon werden ebenfalls übertragen.')}</Body>
        <Body>{direct ? t('Die Übertragung erfolgt direkt von deinem iPhone an OpenAI mit deinem verbundenen ChatGPT-Konto.') : t('Die Übertragung erfolgt über deinen konfigurierten SpendLens-Server an OpenAI mit der verbundenen Sitzung.')}</Body>
        <Body>{t('OpenAI verarbeitet das Foto, um die Bondaten auszulesen. Aufbewahrung und weitere Nutzung richten sich nach den OpenAI-Bedingungen und deinen Kontoeinstellungen. Verdecke persönliche Angaben vor dem Auswählen des Fotos, wenn du sie nicht teilen möchtest.')}</Body>
        <Body>{t('Deine anderen gespeicherten Bons werden nicht gesendet. Du kannst abbrechen und den Einkauf ohne KI von Hand erfassen. Diese Zustimmung gilt nur für dieses Auslesen.')}</Body>
        <Button title={t('OpenAI-Datenschutz lesen')} secondary onPress={() => { void open('https://openai.com/policies/privacy-policy/'); }} />
        <Button title={t('Datenschutzerklärung öffnen')} secondary onPress={() => { void open(`https://niki123456123456.github.io/SpendLens/${language === 'en' ? 'en/' : ''}privacy.html`); }} />
        {linkError && <Notice text={t('Der Link konnte nicht geöffnet werden. Bitte Internetverbindung prüfen.')} bad />}
      </Card>
      <Button title={t('Zustimmen und dieses Foto senden')} onPress={onConfirm} />
      <Button title={t('Abbrechen – nichts senden')} secondary onPress={onCancel} />
    </Screen>
  </Modal>;
}
