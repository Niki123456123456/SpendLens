import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { formatCount, formatMoney, localeFor, resolveLanguage, translate, translateError } from '../src/i18n/core';
import english from '../src/i18n/en.json';

test('language preferences respect supported regional variants and preference order', () => {
  assert.equal(resolveLanguage(['de-AT', 'en-US']), 'de');
  assert.equal(resolveLanguage(['en-US', 'de-DE']), 'en');
  assert.equal(resolveLanguage(['fr-FR', 'de-CH']), 'de');
  assert.equal(resolveLanguage(['EN_gb']), 'en');
  assert.equal(resolveLanguage(['fr-FR']), 'en');
  assert.equal(resolveLanguage([]), 'en');
});

test('translations preserve interpolation, original receipt text and fallback', () => {
  assert.equal(translate('de', 'Artikel {0} entfernen', [2]), 'Artikel 2 entfernen');
  assert.equal(translate('en', 'Artikel {0} entfernen', [2]), 'Remove item 2');
  assert.equal(translate('en', 'Bio-Vollmilch vom Hof'), 'Bio-Vollmilch vom Hof');
  assert.equal(translate('en', 'constructor'), 'constructor');
  assert.equal(translate('en', 'Mehr Überblick.\nWeniger Zettel.'), 'More clarity.\nLess paper.');
  for (const [key, value] of Object.entries(english)) {
    assert.ok(value.trim(), `Empty translation: ${key}`);
    assert.deepEqual(value.match(/\{\d+\}/g) ?? [], key.match(/\{\d+\}/g) ?? [], `Interpolation mismatch: ${key}`);
  }
});

test('counts and formatting follow the app language and retain EUR', () => {
  assert.equal(formatCount('en', 'items', 1), '1 item');
  assert.equal(formatCount('en', 'items', 0), '0 items');
  assert.equal(formatCount('de', 'purchases', 1), '1 Einkauf');
  assert.equal(formatCount('de', 'purchases', 2), '2 Einkäufe');
  assert.match(formatMoney('de', 123456), /1\.234,56\s*€/);
  assert.equal(formatMoney('en', 123456), '€1,234.56');
  assert.equal(new Date('2026-10-21T12:00:00Z').toLocaleDateString(localeFor('en'), { month: 'long', timeZone: 'UTC' }), 'October');
  assert.equal(new Date('2026-10-21T12:00:00Z').toLocaleDateString(localeFor('de'), { month: 'long', timeZone: 'UTC' }), 'Oktober');
});

test('native and server errors are translated without losing status codes', () => {
  assert.equal(translateError('en', "Call to function 'signIn' has been rejected.\n→ Caused by: Eine ChatGPT-Anmeldung läuft bereits."), 'ChatGPT sign-in is already in progress.');
  assert.equal(translateError('en', 'OpenAI konnte die Anfrage nicht abschließen (HTTP 503). Bitte erneut versuchen.'), 'OpenAI could not complete the request (HTTP 503). Please try again.');
  assert.equal(translateError('de', 'ChatGPT-Sitzung abgelaufen. Bitte erneut anmelden.'), 'ChatGPT-Sitzung abgelaufen. Bitte erneut anmelden.');
  assert.equal(translateError('en', 'Unknown external error'), 'Unknown external error');
});

test('every literal translation key in the app has an English translation', () => {
  function check(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { check(file); continue; }
      if (!/\.tsx?$/.test(file)) continue;
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      function visit(node: ts.Node) {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
          const key = node.arguments[0];
          if (key && ts.isStringLiteral(key)) assert.ok(Object.hasOwn(english, key.text), `Missing English translation in ${file}: ${key.text}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  check('src');
});

test('both native languages and permission translations are declared once', () => {
  const config = JSON.parse(readFileSync('app.json', 'utf8')).expo;
  const plugins = config.plugins.filter((plugin: unknown) => plugin === 'expo-localization' || Array.isArray(plugin) && plugin[0] === 'expo-localization');
  assert.equal(plugins.length, 1);
  assert.deepEqual(plugins[0][1].supportedLocales, { ios: ['de', 'en'], android: ['de', 'en'] });
  for (const language of ['de', 'en']) {
    const locale = JSON.parse(readFileSync(config.locales[language], 'utf8'));
    assert.ok(locale.ios.NSCameraUsageDescription);
    assert.ok(locale.ios.NSPhotoLibraryUsageDescription);
  }
});
