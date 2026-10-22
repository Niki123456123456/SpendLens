import { t } from '../i18n';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { receiptExport } from '../../shared/export';
import { Ledger } from '../../shared/receipt';

export async function shareReceiptExport(ledger: Ledger, demo: boolean) {
  if (!await Sharing.isAvailableAsync()) throw new Error(t('Das Teilen von Dateien ist auf diesem Gerät nicht verfügbar.'));
  const now = new Date();
  const json = JSON.stringify(receiptExport(ledger, demo, now), null, 2);
  const directory = new Directory(Paths.cache, 'spendlens-exports');
  const file = new File(directory, `spendlens-${demo ? 'demo-' : ''}bons-${now.toISOString().replace(/[:.]/g, '-')}.json`);
  try {
    directory.create({ intermediates: true, idempotent: true });
    file.create();
    file.write(json);
    await Sharing.shareAsync(file.uri, { UTI: 'public.json', mimeType: 'application/json', dialogTitle: t('Kassenbons als JSON exportieren') });
  } catch {
    throw new Error(t('Die JSON-Datei konnte nicht exportiert werden. Bitte freien Speicherplatz prüfen und erneut versuchen.'));
  } finally {
    // The system has finished sharing (or was dismissed). Never report cleanup as an export failure.
    try { if (file.exists) file.delete(); } catch { /* iOS can reclaim cached files later. */ }
  }
}
