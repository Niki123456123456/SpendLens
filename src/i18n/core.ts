import english from './en.json';

export type Language = 'de' | 'en';
export const supportedLanguages = ['de', 'en'] as const;

/** Use the first supported preference; English is the fallback for other languages. */
export function resolveLanguage(preferences: readonly string[]): Language {
  for (const preference of preferences) {
    const language = preference.toLowerCase().split(/[-_]/)[0];
    if (language === 'de' || language === 'en') return language;
  }
  return 'en';
}

export const localeFor = (language: Language) => language === 'de' ? 'de-DE' : 'en-GB';

// German source strings are translation keys. Receipt content is never translated.
export function translate(language: Language, key: string, values: readonly (string | number)[] = []): string {
  const text = language === 'en' && Object.hasOwn(english, key) ? (english as Record<string, string>)[key] : key;
  return text.replace(/\{(\d+)\}/g, (placeholder, index: string) => String(values[Number(index)] ?? placeholder));
}

export function formatMoney(language: Language, cents: number): string {
  return new Intl.NumberFormat(localeFor(language), { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

const countLabels = {
  de: {
    items: ['{0} Artikel', '{0} Artikel'],
    lines: ['{0} Position', '{0} Positionen'],
    purchases: ['{0} Einkauf', '{0} Einkäufe'],
    receipts: ['{0} Kassenbon', '{0} Kassenbons'],
    recorded: ['{0} Kassenbon erfasst', '{0} Kassenbons erfasst'],
  },
  en: {
    items: ['{0} item', '{0} items'],
    lines: ['{0} line item', '{0} line items'],
    purchases: ['{0} purchase', '{0} purchases'],
    receipts: ['{0} receipt', '{0} receipts'],
    recorded: ['{0} receipt recorded', '{0} receipts recorded'],
  },
};
export function formatCount(language: Language, kind: keyof typeof countLabels.en, count: number): string {
  return countLabels[language][kind][count === 1 ? 0 : 1].replace('{0}', new Intl.NumberFormat(localeFor(language)).format(count));
}

/** Native Expo errors can wrap the app's message in a “Caused by” prefix. */
export function translateError(language: Language, message: string): string {
  const detail = message.split(/\n(?:→\s*)?Caused by:\s*/i).at(-1)!.trim();
  const known = translate(language, detail);
  if (known !== detail || Object.hasOwn(english, detail)) return known;
  for (const key of [
    'OpenAI konnte die Anfrage nicht abschließen (HTTP {0}). Bitte erneut versuchen.',
    'OpenAI konnte den Bon nicht auslesen (HTTP {0}). Bitte Konto, Modellzugang und Nutzungslimit prüfen.',
  ]) {
    const [before, after] = key.split('{0}');
    if (detail.startsWith(before) && detail.endsWith(after)) {
      const status = detail.slice(before.length, -after.length);
      if (/^\d{3}$/.test(status)) return translate(language, key, [status]);
    }
  }
  return message;
}
