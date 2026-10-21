# SpendLens

Eine lokale Kassenbon-App mit **React Native, Expo 58, TypeScript und Expo Router** für iOS, Android und Web. Nach dem verlinkten [Konzept](https://chatgpt.com/c/6ad90c24-1824-83ed-bc95-ef41a09a4f62): Shop → Branch → Purchase → PurchaseItem. Kein Produktkatalog, kein gespeichertes `line_number` oder `line_total`.

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

### 1. Lokaler Open-Source-/ChatGPT-Abo-Flow (Standard)

`AUTH_MODE=local-plan` implementiert den Flow aus dem [verlinkten Cookbook](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt) und der [Registrierungsdokumentation](https://developers.openai.com/siwc/token-sharing-open-source/sign-in):

- Server und Browser laufen **auf demselben Computer**. Callback: `http://127.0.0.1:3001/auth/openai/callback`.
- Stabile lokale Host-ID; erste Registrierung mit `dynamic_agent_client` und `agent_name_hint=SpendLens`; ausgegebene Client-ID wird vor dem Code-Austausch gespeichert und bei späteren Anmeldungen wiederverwendet.
- PKCE S256, einmaliges State, Browserbindung über HttpOnly/SameSite-Cookie, Nonce, OIDC-Signaturprüfung über OpenAI JWKS, Issuer-, Audience-, Ablauf- und Identitätsprüfung.
- App erhält nach einem zusätzlichen einmaligen, durch einen App-Verifier geschützten Ticket-Austausch nur eine eigene Sitzung, keine OpenAI-Tokens.
- Abo-Berechtigung wird aus den tatsächlich zurückgegebenen Scopes gelesen. Token-Erneuerung rotiert den Refresh-Token; fehlende Berechtigung führt zu einer Fehlermeldung.
- [Modellkatalog](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) kommt vom angemeldeten Konto. Standardmäßig wird das erste sichtbare Modell mit nicht ausgeschlossener Bildunterstützung benutzt. Mit `OPENAI_MODEL` kann ein verfügbarer, bildfähiger Slug festgelegt werden. Fehlende Bildunterstützung wird als API-Fehler angezeigt, nicht durch erfundene Daten ersetzt.
- Responses API mit `store:false`, `stream:true` und JSON-Schema. Nur ein Stream mit `response.completed` wird übernommen. Fehler, Limits oder ein abgebrochener Stream werden verworfen.

**Mobile Grenze:** Die dokumentierte dynamische Registrierung verlangt einen HTTP-Loopback-Callback auf `127.0.0.1`. Ein iPhone/Android-Gerät kann diesen Server auf deinem Computer nicht über seine eigene Loopback-Adresse erreichen. Deshalb startet die native App diesen lokalen Flow nicht. Diese Implementierung ist keine Behauptung, dass der Desktop-Flow unverändert für eine eigenständige App-Store-App unterstützt wird.

`.local/host.json` und `.local/registration.json` werden mit restriktiven Dateirechten geschrieben und von Git ausgeschlossen. Der lokale Modus ist für ein verbundenes ChatGPT-Konto pro Serverinstallation ausgelegt. OpenAI-Zugangstokens, Refresh-Tokens und App-Sitzungen bleiben ausschließlich im Arbeitsspeicher des Servers; nach einem Serverneustart erneut anmelden. Abmelden löscht die SpendLens-Sitzung, widerruft aber keine Freigabe in ChatGPT. Diese lässt sich in ChatGPT verwalten.

### 2. Registrierter OAuth-Client für native/hosted Builds

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

- Händler und Filialen sind normalisiert; jeder Einkauf referenziert eine Filiale. Gleicher Händler/Typ und gleiche Adresse werden wiederverwendet.
- Artikel bleiben historische Bonpositionen mit eigenem Namen/Preis/Kategorie.
- Gesamtbeträge in Integer-Cent; Einzelpreise in Integer-Mikro-Euro, damit z. B. Kraftstoffpreise oder Dezimalmengen nicht vorzeitig auf Cent gerundet werden. Berechnete Positionssummen werden nicht gespeichert.
- Native Bilder werden aus dem Cache in das Dokumentverzeichnis kopiert; Web speichert Bilder als Data-URI. Beim Löschen wird das lokale Bild entfernt.
- Bondaten liegen in AsyncStorage (Web: Browser-Speicher). Sie sind nicht zusätzlich durch die App verschlüsselt. Die App-Sitzung liegt nativ in SecureStore, im Web nur in `sessionStorage`.
- Kein Cloud-Sync und keine automatische Sicherung. Löschen der App-/Browserdaten entfernt lokale Einkäufe. Der Browser hat begrenzten Speicher; ein Speicherfehler wird angezeigt und ein Einkauf erst nach erfolgreichem Schreiben als gespeichert behandelt.
- Die aktuelle Version verarbeitet EUR-Kassenbons. Kategorien basieren auf Artikelpreisen und können sich durch Rabatte oder Rundung von der gedruckten Bonsumme unterscheiden.

## Projektstruktur

```text
src/app/          Expo-Router-Screens und Tab-Navigation
src/components/  UI, Bonformular und Einkaufszeilen
src/state/       Lokale Daten und Kontowechsel
src/lib/         API, OAuth-App-Rückgabe, Bilder und Speicherung
shared/receipt.ts  Datenmodell, Zod-Schema und Betragsberechnung
server/          OAuth, Sitzungen, Token-Erneuerung und KI-Auslesen
tests/           Datenmodell-, Sicherheits-, API- und Stream-Tests
```

## Prüfen

```sh
npm run typecheck
npm run lint
npm test
npm run build:web
npx expo export --platform ios --output-dir /tmp/spendlens-ios
npx expo export --platform android --output-dir /tmp/spendlens-android
```

Die nativen Exports prüfen den JavaScript-Bundle, ersetzen aber keinen echten Geräte-/Kameratest oder einen signierten nativen Build. OAuth- und KI-Live-Tests benötigen ein berechtigtes Konto. Ein erfolgreicher Web-Build allein verifiziert keine OpenAI-Berechtigung.

### Bekannte Abhängigkeitsmeldungen

`npm audit --omit=dev` meldet im installierten Expo-58-/React-Native-0.88-Abhängigkeitsbaum 19 als „high“ eingestufte Einträge, überwiegend durch weitergereichte Meldungen aus `braces` und `node-forge`. Die am 21.10.2026 verfügbaren Registry-Versionen `braces@3.0.3` und `node-forge@1.4.0` sind bereits installiert. Der vorgeschlagene automatische Fix würde unter anderem Expo auf 44 bzw. React Native auf 0.72 zurückstufen und wurde deshalb nicht angewendet. Vor einer öffentlichen Veröffentlichung müssen diese Meldungen erneut bewertet und durch kompatible Upstream-Updates behoben werden. Den Entwicklungsserver nicht öffentlich exponieren.
