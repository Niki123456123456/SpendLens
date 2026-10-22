import { getLocales, useLocales } from 'expo-localization';
import type { Category } from '../../shared/receipt';
import { formatCount, formatMoney, Language, localeFor, resolveLanguage, translate, translateError } from './core';

export const getLanguage = () => resolveLanguage(getLocales().map(locale => locale.languageTag));
export const t = (key: string, values?: readonly (string | number)[]) => translate(getLanguage(), key, values);
export const errorText = (message: string) => translateError(getLanguage(), message);

function createTranslation(language: Language) {
  const t = (key: string, values?: readonly (string | number)[]) => translate(language, key, values);
  const categoryLabels: Record<Category, string> = {
    food: t('Nahrung'), mobility: t('Mobilität'), household: t('Haushalt'),
    health: t('Gesundheit'), leisure: t('Freizeit'), other: t('Sonstiges'),
  };
  return {
    language, locale: localeFor(language), t, categoryLabels,
    errorText: (message: string) => translateError(language, message),
    money: (cents: number) => formatMoney(language, cents),
    count: (kind: Parameters<typeof formatCount>[1], count: number) => formatCount(language, kind, count),
  };
}

const translations = { de: createTranslation('de'), en: createTranslation('en') };

export function useTranslation() {
  const language = resolveLanguage(useLocales().map(locale => locale.languageTag));
  return translations[language];
}
