# SpendLens

Eine lokale Kassenbon-App mit **React Native, Expo SDK 57, TypeScript und Expo Router** für iOS, Android und Web. Nach dem verlinkten [Konzept](https://chatgpt.com/c/6ad90c24-1824-83ed-bc95-ef41a09a4f62): Shop → Branch → Purchase → PurchaseItem. Kein Produktkatalog, kein gespeichertes `line_number` oder `line_total`.

## Sprachen: Deutsch und Englisch

SpendLens übernimmt die bevorzugte App-Sprache aus den Systemeinstellungen. Auf iOS: **Einstellungen → Apps → SpendLens → Sprache / Bevorzugte Sprache → Deutsch oder Englisch**. Im Profil führt „Sprache in den iOS-Einstellungen ändern“ direkt zu den App-Einstellungen. Fehlt die Sprachwahl, zuerst unter Allgemein → Sprache & Region eine zweite Sprache hinzufügen. Android unterstützt ebenfalls die systemeigene App-Sprachwahl; im Web gelten die Browsersprachen. Nicht unterstützte Sprachen verwenden Englisch als Rückfall.

Oberfläche, Kategorien, Händlertypen, Fehlermeldungen und Kamera-/Fotoberechtigungen sind übersetzt. Datums- und Betragsanzeigen folgen der App-Sprache; die Währung bleibt EUR. Gespeicherte Bontexte, Händlernamen, Adressen und Einheiten bleiben unverändert. Übersetzungen liegen in `src/i18n/en.json`, die deutschen Ausgangstexte dienen als Schlüssel. `src/i18n/core.ts` enthält Sprachauflösung, Formatierung und Pluralformen.

**Neuer nativer Build erforderlich:** Die Sprachwahl und übersetzten Systemdialoge sind Bestandteil des installierten Builds. Ein Metro-Neustart oder OTA-Update reicht dafür nicht. Bei einem vorhandenen generierten `ios/`-Ordner vor dem nächsten Build `npx expo prebuild --platform ios` ausführen; mit EAS ohne eingecheckte native Ordner wird die Konfiguration beim Build generiert. Native Ordner nicht von Hand bearbeiten. Expo Go kann die Übersetzungen anzeigen, bietet aber keine eigenen SpendLens-App-Einstellungen.

Manuell auf einem neuen iOS-Build prüfen: Deutsch und Englisch jeweils in den App-Einstellungen auswählen, danach Tabs, manuelle Bonerfassung, Kategorien, Detailansicht und Auswertung öffnen. Auch Datum, EUR-Beträge und Kamera-Berechtigungsdialog prüfen. Sprachwechsel darf vorhandene Einkäufe nicht verändern.

## iPhone: ChatGPT-Anmeldung ohne SpendLens-Backend

Der native iPhone-Build enthält ein eigenes Swift-Modul in `modules/spendlens-openai`. Anmeldung, Token-Erneuerung und KI-Auslesen gehen direkt an OpenAI. Dafür muss kein SpendLens-Server laufen und kein API-Schlüssel hinterlegt werden.

```sh
npm install
npm run ios -- --device
# Entwicklungsserver später erneut starten:
npm run native:start
```

Für die Geräteinstallation muss deine Apple-ID in Xcode eingerichtet und das iPhone gekoppelt sein; gegebenenfalls Entwicklermodus auf dem Gerät aktivieren. `app.json` enthält das vorhandene Apple-Team für diese lokale Installation. Andere Entwickler müssen ihre eigene Team-ID verwenden. EAS-Builds bleiben über `eas.json` möglich.

**Lokale Build-Voraussetzung:** Expo SDK 57 benötigt laut [Expo-Anforderungen](https://docs.expo.dev/versions/v57.0.0/#support-for-android-and-ios-versions) Xcode **26.4 oder neuer**. `npm run ios` prüft diese Voraussetzung vor dem Build. Nach einem Xcode-Update Xcode einmal öffnen und unter Settings → Locations als Command Line Tools auswählen.

Für **Xcode 27 und iOS 27** aktiviert `app.json` außerdem `expo-build-properties` mit `ios.enableSceneSupport: true`. Das ist bei SDK 57 erforderlich, damit der App-Start den von iOS 27 verlangten Scene-Lebenszyklus verwendet. Änderungen daran mit Expo Prebuild generieren; `ios/` nicht von Hand bearbeiten. Siehe [Expo-Anleitung für SDK 57 mit Xcode 27](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md#staying-on-sdk-57-with-xcode-27).

**Geräteprüfung am 22.10.2026:** Release-Build mit Xcode 27.1 erfolgreich signiert, auf dem iPhone 12 Pro mit iOS 27 installiert und gestartet. Der aktive App-Prozess und der sichtbare Überblick-Bildschirm wurden geprüft. JavaScript ist eingebettet; für diesen installierten Build ist kein Metro-Server nötig. Die echte ChatGPT-Anmeldung und das KI-Auslesen bleiben separat auf dem Gerät zu prüfen.

Profil → „Continue with ChatGPT“ öffnet das sichere iOS-Anmeldefenster. Ein kurzlebiger Listener bindet ausschließlich `127.0.0.1` auf dem iPhone und empfängt den dokumentierten OAuth-Callback. Der anschließende App-Rücksprung enthält nur eine zufällige Abschlussmarkierung. PKCE, State, Nonce und die ID-Token-Signatur samt Issuer, Audience, Ablauf und Kontoidentität werden nativ geprüft. Ausgegebene Client-IDs werden vor dem Token-Austausch gespeichert und wiederverwendet. Tokens verlassen das native Modul nicht und liegen im gerätegebundenen iOS-Schlüsselbund; JavaScript erhält nur Kontometadaten. Abmelden entfernt die Tokens, behält aber die lokale Registrierung. Eine OpenAI-Freigabe wird dadurch nicht widerrufen.

Bilder werden erst nach „Mit KI auslesen“ direkt an OpenAI gesendet. Berechtigungen und verfügbare Modelle werden vom verbundenen Konto gelesen. Fehlende Berechtigung, abgebrochene Streams und API-Fehler werden angezeigt. Es gibt keinen automatischen API-Key-Fallback.

**Status:** Experimentelle iOS-Umsetzung des [dokumentierten Loopback-Flows](https://developers.openai.com/siwc/token-sharing-open-source/sign-in). Die Dokumentation bestätigt diesen konkreten iOS-Aufbau nicht ausdrücklich. Native Tests prüfen unter anderem Signaturen, manipulierte Rückgaben, Wiederholung, Token-Rotation und Abbruch; die vollständige Anmeldung mit einem echten Konto muss auf dem iPhone noch geprüft werden. Es wurden keine kostenpflichtigen KI-Anfragen ausgeführt.

## Expo Go auf einem echten iPhone

Das Projekt ist auf **SDK 57** abgestimmt, passend zur vom Nutzer bestätigten Expo-Go-Version auf seinem iPhone. Maßgeblich ist die SDK-Angabe der tatsächlich installierten Expo-Go-App. Die iOS-Version des Telefons ist nicht die Expo-SDK-Version.

```sh
npm run phone
# Bei Netzwerkproblemen:
npm run phone:tunnel
```

Expo Go erlaubt manuelle Erfassung und Beispieldaten. Die direkte ChatGPT-Anmeldung benötigt das eigene native Modul und deshalb einen installierten SpendLens-Development-Build. In Expo Go zeigt das Profil diesen Hinweis ohne Backend-Verbindungsversuch. Expo Go öffnen und den QR-Code des aktuellen Servers scannen. Bei SDK-Upgrades zuerst prüfen, welche SDK-Version die tatsächlich installierte Expo-Go-App unterstützt. Ein erfolgreicher iOS-Bundle-Export belegt nicht die Kompatibilität mit einer beliebigen Expo-Go-Version.

## Starten

Node **22.13+**, empfohlen Node 24. Das Projekt enthält außerdem Node 24 als lokale Entwicklungsabhängigkeit; `npm run` verwendet diesen nach der Installation automatisch. Die projektlokale `.npmrc` nutzt die öffentliche npm-Registry, da die voreingestellte Firmen-Registry Expo hier mit HTTP 403 abgewiesen hat.

```sh
npm install
cp .env.example .env
npm run server
```

In einem zweiten Terminal:

```sh
npm run web
```

Öffne http://localhost:8081. Ohne Server funktionieren die manuelle Erfassung, Beispieldaten, Suche, Detailansicht und Auswertung. Profil → „Continue with ChatGPT“ startet die echte Anmeldung. Der Demo-Modus speichert seine Beispieldaten getrennt von deinen lokalen Einkäufen und deinem verbundenen Konto.

Native Entwicklung:

```sh
npm run ios
npm run android
```

Diese Befehle starten Expo mit dem gewünschten Ziel. Für Kamera und den eigenen Rücksprung-Link einen nativen Development Build verwenden; Expo Go ist kein Test für den produktiven OAuth-Callback. `app.json` definiert `spendlens://auth-return`, Kamera-/Fotoberechtigungen und native Paketnamen. Für signierte Builds die enthaltenen Profile in `eas.json` und eigene App-Store-/Play-Store-Konten konfigurieren. Das Development-Profil verwendet das installierte `expo-dev-client`. Es wurde nichts veröffentlicht.

## Was funktioniert

- Bon fotografieren (nativ) oder ein Bild auswählen (auch Web).
- Optionales Auslesen und Kategorisieren über OpenAI; ein Foto wird erst durch „Mit KI auslesen“ übertragen.
- Händler und Typ, Filialadresse, Datum, Bonsumme, Artikelname, Dezimalmenge, Einheit, Einzelpreis und Kategorie prüfen/korrigieren.
- Artikel hinzufügen/entfernen; negative Einzelpreise für Rabatte; Warnung bei Differenz zwischen Artikelsumme und Bonsumme.
- Lokale Speicherung, Originalbon, Suche über Händler/Adresse/Artikel/Datum, Detailansicht und Löschen nach Bestätigung.
- Monatliche Auswertung für Nahrung, Mobilität, Haushalt, Gesundheit, Freizeit und Sonstiges.
- Validierung von Datum, Menge, Preis, Kategorie und EUR-Währung; keine vorgetäuschten KI-Ergebnisse bei Fehlern.

## ChatGPT-Anmeldung: zwei unterschiedliche Betriebsarten

Die Integration folgt den am 21.10.2026 abgerufenen **official OpenAI documentation**. Zugang und Kontoberechtigung müssen mit einem echten Konto überprüft werden. In dieser Umgebung wurden weder echte Anmeldedaten verwendet noch kostenpflichtige Modellanfragen ausgeführt.

### 1. Optionaler Desktop-/Web-Server

`AUTH_MODE=local-plan` implementiert den Flow aus dem [verlinkten Cookbook](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt) und der [Registrierungsdokumentation](https://developers.openai.com/siwc/token-sharing-open-source/sign-in):

- Server und Browser laufen **auf demselben Computer**. Callback: `http://127.0.0.1:3001/auth/openai/callback`.
- Stabile lokale Host-ID; erste Registrierung mit `dynamic_agent_client` und `agent_name_hint=SpendLens`; ausgegebene Client-ID wird vor dem Code-Austausch gespeichert und bei späteren Anmeldungen wiederverwendet.
- PKCE S256, einmaliges State, Browserbindung über HttpOnly/SameSite-Cookie, Nonce, OIDC-Signaturprüfung über OpenAI JWKS, Issuer-, Audience-, Ablauf- und Identitätsprüfung.
- App erhält nach einem zusätzlichen einmaligen, durch einen App-Verifier geschützten Ticket-Austausch nur eine eigene Sitzung, keine OpenAI-Tokens.
- Abo-Berechtigung wird aus den tatsächlich zurückgegebenen Scopes gelesen. Token-Erneuerung rotiert den Refresh-Token; fehlende Berechtigung führt zu einer Fehlermeldung.
- [Modellkatalog](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) kommt vom angemeldeten Konto. Standardmäßig wird das erste sichtbare Modell mit nicht ausgeschlossener Bildunterstützung benutzt. Mit `OPENAI_MODEL` kann ein verfügbarer, bildfähiger Slug festgelegt werden. Fehlende Bildunterstützung wird als API-Fehler angezeigt, nicht durch erfundene Daten ersetzt.
- Responses API mit `store:false`, `stream:true` und JSON-Schema. Nur ein Stream mit `response.completed` wird übernommen. Fehler, Limits oder ein abgebrochener Stream werden verworfen.

**iPhone:** Der oben beschriebene native Build betreibt den Listener direkt auf dem Gerät. Er verwendet diesen Desktop-Server nicht. Android und Web behalten ihren bisherigen Serverweg.

`.local/host.json` und `.local/registration.json` werden mit restriktiven Dateirechten geschrieben und von Git ausgeschlossen. Der lokale Modus ist für ein verbundenes ChatGPT-Konto pro Serverinstallation ausgelegt. OpenAI-Zugangstokens, Refresh-Tokens und App-Sitzungen bleiben ausschließlich im Arbeitsspeicher des Servers; nach einem Serverneustart erneut anmelden. Abmelden löscht die SpendLens-Sitzung, widerruft aber keine Freigabe in ChatGPT. Diese lässt sich in ChatGPT verwalten.

### 2. Optionaler registrierter OAuth-Client für den Server

`AUTH_MODE=registered` verwendet den [offiziellen Identity-OAuth-Flow](https://developers.openai.com/siwc/website). Dafür benötigst du einen tatsächlich von OpenAI bereitgestellten Client und einen exakt registrierten HTTPS-Callback. Die Dokumentation beschreibt diesen Zugang als begrenzt verfügbar.

```dotenv
AUTH_MODE=registered
SERVER_URL=https://api.example.com
EXPO_PUBLIC_API_URL=https://api.example.com
OPENAI_CLIENT_ID=oaiapp_...
OPENAI_TOKEN_AUTH_METHOD=none
APP_ORIGINS=https://app.example.com
APP_REDIRECT_URIS=spendlens://auth-return,https://app.example.com/auth-return
```

Für vertrauliche Clients zusätzlich `OPENAI_CLIENT_SECRET` und die bereitgestellte Methode `client_secret_basic` oder `client_secret_post` setzen. Secrets gehören ausschließlich auf den Server. Der Reverse Proxy muss TLS terminieren; den Server nur hinter diesem Proxy erreichbar machen. `HOST` ist standardmäßig `127.0.0.1`.

Identity-Login beinhaltet **keine** ChatGPT-Abo-Nutzung. Das KI-Auslesen im registrierten Modus benötigt deshalb separat `OPENAI_API_KEY` und ein bildfähiges `OPENAI_MODEL` auf dem Server; diese Nutzung wird über das API-Projekt abgerechnet. Ohne diese Konfiguration funktioniert die Anmeldung, während das KI-Auslesen eine klare Konfigurationsmeldung ausgibt. Keine automatischen API-Kosten als Fallback des lokalen Abo-Flows.

Für öffentlichen Mehrbenutzerbetrieb sind ein persistenter Sitzungs-/Transaktionsspeicher, serverweite Quoten, Monitoring und Deployment-Konfiguration noch notwendig. Die enthaltene API ist ein Entwicklungs-/persönlicher Server mit begrenzten In-Memory-Stores und einer parallelen Analyse pro Sitzung.

## Speicherung und Datenmodell

### JSON-Export auf dem iPhone

Profil → **Alle Bons als JSON exportieren** öffnet das iOS-Teilen-Menü. Dort **In Dateien sichern** wählen. Die Datei enthält alle Bons des aktuellen Profils, unabhängig von Monat oder Suche, samt Händlern, Filialen, Artikeln, Kategorien und Beträgen. Der Demo-Modus exportiert ausschließlich seine Beispieldaten und kennzeichnet sie als `source: demo`.

Das versionierte Format `spendlens.receipts` enthält Exportzeitpunkt, den normalisierten `ledger` und die Betrags-Einheiten: `total_cents` in Cent und `unit_price_micros` in Millionstel Euro. Bonfotos, gerätegebundene Bildpfade und Anmeldedaten sind nicht enthalten. Nach Schließen des Teilen-Menüs wird die temporäre Exportdatei aus dem App-Cache entfernt; die gewählte gespeicherte oder geteilte Kopie bleibt erhalten. Ein JSON-Import ist derzeit nicht implementiert.

- Händler und Filialen sind normalisiert; jeder Einkauf referenziert eine Filiale. Gleicher Händler/Typ und gleiche Adresse werden wiederverwendet.
- Artikel bleiben historische Bonpositionen mit eigenem Namen/Preis/Kategorie.
- Gesamtbeträge in Integer-Cent; Einzelpreise in Integer-Mikro-Euro, damit z. B. Kraftstoffpreise oder Dezimalmengen nicht vorzeitig auf Cent gerundet werden. Berechnete Positionssummen werden nicht gespeichert.
- Native Bilder werden aus dem Cache in das Dokumentverzeichnis kopiert; Web speichert Bilder als Data-URI. Beim Löschen wird das lokale Bild entfernt.
- Bondaten liegen in AsyncStorage (Web: Browser-Speicher). Sie sind nicht zusätzlich durch die App verschlüsselt. Auf dem iPhone liegen OAuth-Tokens ausschließlich im nativen Schlüsselbund-Modul, andere native Server-Sitzungen in SecureStore und Web-Sitzungen nur in `sessionStorage`.
- Kein Cloud-Sync und keine automatische Sicherung. Löschen der App-/Browserdaten entfernt lokale Einkäufe. Der Browser hat begrenzten Speicher; ein Speicherfehler wird angezeigt und ein Einkauf erst nach erfolgreichem Schreiben als gespeichert behandelt.
- Die aktuelle Version verarbeitet EUR-Kassenbons. Kategorien basieren auf Artikelpreisen und können sich durch Rabatte oder Rundung von der gedruckten Bonsumme unterscheiden.

## Projektstruktur

```text
src/app/          Expo-Router-Screens und Tab-Navigation
src/components/  UI, Bonformular und Einkaufszeilen
src/state/       Lokale Daten und Kontowechsel
src/lib/         API, OAuth-App-Rückgabe, Bilder und Speicherung
shared/receipt.ts  Datenmodell, Zod-Schema und Betragsberechnung
modules/spendlens-openai/  Native iPhone-Anmeldung, Schlüsselbund und direkte OpenAI-Anfragen
server/          Optionaler Web-/Android-Server für OAuth und KI-Auslesen
tests/           Datenmodell-, Sicherheits-, API- und Stream-Tests
```

## Prüfen

```sh
npm run typecheck
npm run lint
npm test
npm run test:native  # macOS mit Swift/Xcode
npm run build:web
npx expo export --platform ios --output-dir /tmp/spendlens-ios
npx expo export --platform android --output-dir /tmp/spendlens-android
```

Die nativen Exports prüfen den JavaScript-Bundle, ersetzen aber keinen echten Geräte-/Kameratest oder einen signierten nativen Build. OAuth- und KI-Live-Tests benötigen ein berechtigtes Konto. Ein erfolgreicher Web-Build allein verifiziert keine OpenAI-Berechtigung.

### Abhängigkeitsprüfung

Die frühere Audit-Auswertung für SDK 58 ist nach der Umstellung auf SDK 57 nicht mehr maßgeblich. Vor einer Veröffentlichung `npm audit` ausführen und Meldungen anhand des aktuellen Lockfiles bewerten. Keine automatischen Major-Downgrades durch `npm audit fix --force` durchführen.
