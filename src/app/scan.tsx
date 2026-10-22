import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { blankDraft, ReceiptDraft } from '../../shared/receipt';
import { Body, Button, Card, colors, Label, Notice, Screen, Title } from '../components/ui';
import { ReceiptForm } from '../components/ReceiptForm';
import { analyzeReceipt } from '../lib/api';
import { demoReceipt } from '../lib/demo';
import { deleteImage, persistImage } from '../lib/images';
import { useStore } from '../state/store';
export default function Scan() {
  const { save, session, demo } = useStore();
  const [image, setImage] = useState<string>();
  const [draft, setDraft] = useState<ReceiptDraft>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function pick(camera: boolean) {
    setError('');
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('Bitte erlaube den Kamerazugriff in den Geräteeinstellungen oder wähle ein Foto.');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: .7, allowsEditing: false };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const base64 = result.assets[0].base64;
      if (!base64) throw new Error('Das Bild konnte nicht gelesen werden. Bitte ein JPEG-Foto verwenden.');
      if (base64.length > 8_000_000) throw new Error('Das Foto ist zu groß. Bitte einen kleineren Ausschnitt verwenden (max. 6 MB).');
      setImage(`data:image/jpeg;base64,${base64}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Foto konnte nicht geöffnet werden.'); }
  }
  async function analyze() {
    if (!image || !session) return;
    setBusy(true); setError('');
    try { setDraft(await analyzeReceipt(image, session)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Der Bon konnte nicht gelesen werden. Du kannst ihn von Hand erfassen.'); }
    finally { setBusy(false); }
  }
  async function saveDraft(value: ReceiptDraft) {
    let uri: string | undefined;
    try { uri = image ? await persistImage(image) : undefined; const id = await save(value, uri); router.replace(`/purchase/${id}`); }
    catch (e) { deleteImage(uri); throw e; }
  }
  return <Screen><Button title="Schließen" secondary onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /><View style={{ gap: 8 }}><Label>VOM ZETTEL ZUM ÜBERBLICK</Label><Title>{draft ? 'Alles richtig erkannt?' : 'Dein nächster Kassenbon.'}</Title><Body>{draft ? 'Prüfe Händler, Filiale und jeden Artikel.' : 'Ein Foto. Alle Artikel an einem Ort.'}</Body></View>
    {!draft ? <><Card style={{ gap: 18 }}>{image ? <Image source={{ uri: image }} style={{ width: '100%', height: 240, borderRadius: 12 }} resizeMode="contain" /> : <View style={{ borderRadius: 16, minHeight: 200, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#A9C9BB', backgroundColor: '#F3F8F5', justifyContent: 'center', alignItems: 'center', gap: 12 }}><Text style={{ fontSize: 46 }}>▤</Text><Body>Mach Platz für einen klaren Blick.</Body></View>}
    {Platform.OS !== 'web' && <Button title="Kassenbon fotografieren" icon="camera-outline" onPress={() => { void pick(true); }} disabled={busy} />}<Button title={image ? 'Anderes Foto wählen' : 'Foto auswählen'} icon="images-outline" secondary onPress={() => { void pick(false); }} disabled={busy} />
    {image && <><Notice text={session?.transport === 'ios-direct' ? 'Beim Auslesen wird dieses Bonfoto direkt vom iPhone an OpenAI gesendet. Prüfe vorher, ob persönliche Angaben sichtbar sind.' : 'Beim Auslesen wird dieses Bonfoto über deinen SpendLens-Server an OpenAI gesendet. Prüfe vorher, ob persönliche Angaben sichtbar sind.'} />{session ? <Button title={busy ? 'Bon wird ausgelesen …' : 'Mit KI auslesen'} onPress={() => { void analyze(); }} disabled={busy} icon="sparkles-outline" /> : <Button title="ChatGPT im Profil verbinden" onPress={() => router.push('/account')} secondary />}</>}{busy && <ActivityIndicator color={colors.green} />}</Card>
    <Button title="Einkauf von Hand erfassen" secondary icon="create-outline" disabled={busy} onPress={() => setDraft(blankDraft())} />{demo && <Button title="Beispielbon prüfen" secondary disabled={busy} onPress={() => setDraft(demoReceipt())} />}</> : <ReceiptForm initial={draft} onSave={saveDraft} />}{Boolean(error) && <Notice text={error} bad />}</Screen>;
}
