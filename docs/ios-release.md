# iOS-Auslieferung mit GitHub Actions und EAS

## Review-Rückmeldung vom 30.10.2026

Apple hat Version 1.0.0 (Build 4) wegen 4.8 (Login Services) und 5.1.1(i)/5.1.2(i) (Einwilligung zur Datenübertragung an einen KI-Dienst) abgelehnt. Die manuelle Nutzung ohne Konto war bereits möglich. Die zusätzlich angebotene ChatGPT-Anmeldung wurde trotzdem beanstandet; sie wählte im abgelehnten Build auch das lokale Kontoprofil aus.

Der lokale Quellstand enthält jetzt vor jedem KI-Auslesen einen ausdrücklichen Einwilligungsdialog auf Deutsch und Englisch. Erst die Zustimmung sendet das Bonfoto; Abbrechen und Schließen senden nichts. Die lokalen Datenschutzseiten und Review-Hinweise beschreiben den Ablauf. Diese Änderungen sind mit Build 6 hochgeladen und erneut zur App-Prüfung eingereicht; die aktualisierten Datenschutzseiten sind auf Deutsch und Englisch live. Die Profilkopplung ist im lokalen Quellstand entfernt: ein gerätegebundener Bonbestand, unabhängig von der optionalen KI-Verbindung. Vorhandene Gast- und Kontobons werden einmalig zusammengeführt, Demo-Daten bleiben getrennt. Die Oberfläche bezeichnet ChatGPT ausdrücklich als KI-Verbindung. Apple muss diese Abgrenzung beim erneuten Review bewerten; eine Annahme wird nicht vorausgesetzt. Die Aussage zum gleichwertigen Schutz durch einen Drittanbieter muss vor Einreichung anhand der tatsächlich geltenden Anbieterbedingungen geprüft werden; eine unbelegte Zusicherung wird nicht hinzugefügt.

## Erneute Einreichung am 31.10.2026

- Änderungen nach `main` gepusht: Commit `3d49d8c1ba880eb8298c8604ca936946b36db8f6` (Bonverwaltung unabhängig von ChatGPT, ausdrückliche Einwilligung vor jedem KI-Auslesen).
- Lint, Typecheck und alle 24 Tests erfolgreich; [GitHub-Actions-Lauf 5](https://github.com/Niki123456123456/SpendLens/actions/runs/41180938305) vollständig erfolgreich, einschließlich Build und Apple-Upload.
- Version **1.0.0 (6)**, [EAS-Build `ca027afb-fd03-493e-abf4-eec4185097ce`](https://expo.dev/accounts/niki123456123456/projects/spendlens/builds/ca027afb-fd03-493e-abf4-eec4185097ce), signiert gebaut. [Upload `785ef54e-1a5b-412c-9d38-db5536b4ca11`](https://expo.dev/accounts/niki123456123456/projects/spendlens/submissions/785ef54e-1a5b-412c-9d38-db5536b4ca11) von EAS als „Succeeded“ bestätigt.
- Apple-Build-ID `5433e869-08a4-4f8d-b616-1a5f13c2c6be`; nach Apples Verarbeitung als Ersatz für Build 4 ausgewählt. Aktualisierte Review-Hinweise gespeichert; Anmeldung für die lokalen Funktionen weiterhin nicht erforderlich.
- Erneut zur App-Prüfung übermittelt am **31.10.2026 um 08:42 Uhr (Europe/Berlin)**. [Einreichung](https://appstoreconnect.apple.com/apps/6825931058/distribution/reviewsubmissions/details/bd50f2f7-4967-43d2-9521-c10a65f2121d): **„Warten auf Prüfung“**, Version **1.0.0 (6)** sichtbar bestätigt. Die App ist damit noch nicht genehmigt oder im Store veröffentlicht.
- Die bei Apple bereits ausgewählte Einstellung **automatische Veröffentlichung nach Genehmigung** wurde beibehalten. Sie unterscheidet sich von der weiter unten historisch dokumentierten manuellen Veröffentlichung vom 22.10.2026.
- Deutsche und englische Datenschutzseiten am 31.10.2026 live geprüft. Der produktive ChatGPT-/KI-Ablauf wurde weiterhin nicht mit einem echten Konto live getestet. Ob Apple die Abgrenzung der optionalen KI-Verbindung unter 4.8 akzeptiert, entscheidet der erneute Review.

## Bereits im Repository

- `.github/workflows/ios-release.yml`: prüft Pushes und Pull Requests auf `main`. Nach einem erfolgreichen Push auf `main` (oder manuellem Start auf `main`) baut EAS die signierte iOS-Produktions-App und lädt genau diesen Build zu App Store Connect / TestFlight hoch.
- `scripts/ci/ios-release.mjs`: prüft nötige Variablen, wartet auf den fertigen Build, übergibt seine ID an EAS Submit und stellt danach die ursprüngliche `eas.json` wieder her. Es wird nie `--latest` verwendet.
- EAS-Projekt: https://expo.dev/accounts/niki123456123456/projects/spendlens (`b49cf5cf-eecb-46ed-ae72-c2b986b2361a`).
- Bundle-ID: `app.spendlens.mobile`, Apple-Team: `JKD484739B`.
- App Store Connect: [SpendLens](https://appstoreconnect.apple.com/apps/6825931058/distribution), numerische Apple-ID `6825931058`, primäre Sprache Deutsch, SKU `spendlens-ios`. Deutsche und englische Versionstexte, Untertitel, Support- und Datenschutz-URLs sind gespeichert; Kategorie Finanzen. Der englische Name lautet „SpendLens: Receipt Organizer“, weil „SpendLens“ für diese Sprache bereits vergeben ist.
- `eas.json`: Store-Distribution, remote verwaltete fortlaufende Buildnummern, Produktionsumgebung und remote verwaltete Signierdaten.
- `assets/icon.svg` und `assets/icon.png`: SpendLens-Logo, 1024 × 1024, PNG ohne Alphakanal.
- `store/metadata/`: deutsche und englische Store-Texte. `store/review-notes.txt` und `store/privacy-data-inventory.txt`: Vorbereitungen für die Einreichung.
- `site/`: statische deutsche/englische Support- und Datenschutzseite. `.github/workflows/pages.yml` veröffentlicht nur diesen Ordner über GitHub Pages.
- Expo-Robot „SpendLens GitHub Actions“ mit Developer-Rolle eingerichtet; sein Token ist ausschließlich als verschlüsseltes Repository-Secret `EXPO_TOKEN` gespeichert. Die Rolle gilt für alle Projekte des Expo-Kontos und der Zugang bleibt bis zum Widerruf aktiv.
- 18 echte native Store-Screenshots unter `store/screenshots/`: Deutsch/Englisch, iPhone groß/mittel und iPad, jeweils Übersicht, Auswertung und Bon. Der lokale iOS-Release-Simulator-Build sowie die Sprachwahl in den iOS-App-Einstellungen wurden erfolgreich geprüft. Lint, Typecheck und 19 Tests sind erfolgreich.
- Alle fünf Repository-Secrets sind eingerichtet: `EXPO_TOKEN`, `ASC_APP_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_API_KEY_P8`. Apple-Teamschlüssel „SpendLens GitHub Actions“, Rolle Entwickler, bis zum Widerruf gültig. Der private Schlüssel bleibt außerhalb des Repositorys.
- Signierdaten sind bei EAS eingerichtet. Produktionsbuild 4 (`856ef118-ffcc-48b2-bd46-9505f2bde806`) wurde erfolgreich gebaut und am 22.10.2026 mit EAS Submit zu Apple hochgeladen. Apple hat ihn verarbeitet und für die Einreichung bereitgestellt.
- [GitHub-Actions-Lauf 4](https://github.com/Niki123456123456/SpendLens/actions/runs/39847853726): Validierung und signierter Produktionsbuild 5 erfolgreich; der Upload scheiterte beim Commit der vollständig übertragenen IPA-Datei an Apples HTTP 500 (`UNEXPECTED_ERROR`, Fehler auf Apples Serverseite). Build-ID `4c13de7b-ff1e-44cb-8f70-46aaa33a5f58`. Der gesamte Lauf ist deshalb nicht erfolgreich. Nach ausdrücklicher Freigabe wurde derselbe Build ohne Neubau erfolgreich erneut hochgeladen: [erfolgreicher Upload](https://expo.dev/accounts/niki123456123456/projects/spendlens/submissions/3ae947d7-683a-434a-aa8a-af21fb4ad5ea), abgeschlossen am 22.10.2026 um 22:54 Uhr (Berlin), von Expo als „Succeeded“ bestätigt. Apple verarbeitet den Build anschließend. Der ursprüngliche GitHub-Lauf bleibt als fehlgeschlagen dokumentiert; der erfolgreiche Wiederholungsupload wurde separat per EAS Submit gestartet. Build 4 wurde unabhängig davon erfolgreich zu Apple hochgeladen und eingereicht.
- Alle 18 Screenshots sind bei Apple vollständig verarbeitet und per MD5 mit den lokalen Originalen verglichen. Deutsche und englische Bilder sind separat zugeordnet.
- Altersfreigabe 4+ mit regionalen Äquivalenten, erforderliche Inhaltsrechte, Preis 0,00 und weltweite Verfügbarkeit in 175 Regionen sind gespeichert. Der private Review-Kontakt und die Review-Anleitung sind hinterlegt. Manuelle Veröffentlichung nach Apples Genehmigung ist ausgewählt.
- App-Datenschutz ist nach ausdrücklicher Bestätigung des Herausgebers veröffentlicht: Zahlungsdaten, Fotos/Videos, Einkaufsverlauf, Benutzer-ID und Geräte-ID; für App-Funktionalität, mit der Identität verknüpft, ohne Tracking.
- **App Review eingereicht am 22.10.2026 um 22:36 Uhr (Berlin)**: Version 1.0.0, Build 4, Status „Warten auf Prüfung“. [Einreichung öffnen](https://appstoreconnect.apple.com/apps/6825931058/distribution/reviewsubmissions/details/bd50f2f7-4967-43d2-9521-c10a65f2121d). Die App ist noch nicht von Apple genehmigt oder im Store veröffentlicht. Der optionale produktive ChatGPT-Anmelde-/KI-Leseablauf wurde bisher nicht live verifiziert.

## Einmalige Einrichtung

1. Apple-Developer-Mitgliedschaft: Die bestätigte Verlängerung ist inzwischen freigeschaltet; die App-Anlage war am 22.10.2026 erfolgreich.
2. App ist angelegt. `ASC_APP_ID` auf `6825931058` setzen.
3. Einen ersten Produktionsbuild interaktiv konfigurieren: `npx eas-cli@latest build --platform ios --profile production`. Dabei die Distribution-Zertifikate und Provisioning-Profile bei EAS einrichten. Keine Zertifikate oder privaten Schlüssel committen.
4. Einen passenden App Store Connect API-Schlüssel einrichten. Schlüssel-ID, Issuer-ID und den `.p8`-Schlüssel sicher aufbewahren. Für EAS Build vorhandene Signierdaten verwenden; für EAS Submit muss der Schlüssel zur App berechtigen.
5. Unter Repository → Settings → Secrets and variables → Actions folgende Repository-Secrets setzen:

| Secret | Inhalt |
| --- | --- |
| `EXPO_TOKEN` | Bereits eingerichtet: Token des Expo-Robots für GitHub Actions |
| `ASC_APP_ID` | Bereits eingerichtet: `6825931058` |
| `ASC_KEY_ID` | Schlüssel-ID des App Store Connect API-Schlüssels |
| `ASC_ISSUER_ID` | Issuer-ID des App Store Connect Teams |
| `ASC_API_KEY_P8` | Vollständiger Inhalt der `.p8`-Datei, einschließlich BEGIN/END-Zeilen |

Der Workflow schreibt den privaten Apple-Schlüssel mit eingeschränkten Dateirechten in das temporäre Runner-Verzeichnis und entfernt ihn immer am Ende. Das Artefakt `ios-build-…` enthält nur Build-ID, Version, Commit und Uploadstatus, keine Schlüssel und keinen IPA-Downloadlink. Fork-Pull-Requests erhalten keine Release-Secrets. EAS-Credentials müssen vor einem unbeaufsichtigten Lauf fertig eingerichtet sein. Ein abgelaufenes Profil kann einen erneuten interaktiven Credentials-Lauf erfordern.

## GitHub Pages

Unter Settings → Pages als Quelle **GitHub Actions** wählen. Danach den Pages-Workflow auf `main` starten oder Änderungen unter `site/` pushen.

Live-URLs (Pages-Deployment am 22.10.2026 erfolgreich geprüft):

- Deutsch / Support: https://niki123456123456.github.io/SpendLens/
- Deutsch / Datenschutz: https://niki123456123456.github.io/SpendLens/privacy.html
- Englisch / Support: https://niki123456123456.github.io/SpendLens/en/
- Englisch / Datenschutz: https://niki123456123456.github.io/SpendLens/en/privacy.html

Die Seite nennt Niklas Nordkamp als Betreiber und verwendet öffentliche GitHub-Issues als Kontaktweg. Auf Wunsch des Herausgebers wird keine Kontakt-E-Mail veröffentlicht. Keine privaten Bonfotos in Issues veröffentlichen. Vor App Review müssen die Datenschutzangaben zur tatsächlichen Produktion und den geltenden OpenAI-Kontobedingungen passen.

## Erster App Review

EAS Submit lädt zu App Store Connect / TestFlight hoch. Das reicht noch nicht für App Review.

Nach Apples Build-Verarbeitung im Store-Eintrag den konkreten Build auswählen, Store-Texte und echte iPhone-/iPad-Screenshots hochladen, funktionierende Support-/Datenschutz-URLs eintragen und App-Datenschutz, Altersfreigabe, Preis/Verfügbarkeit, Exportkontrolle sowie Review-Kontakt vervollständigen. Fragen zu Händlerstatus, Verträgen und persönlichen Angaben muss der Accountinhaber anhand seiner tatsächlichen Situation beantworten. Die optionalen ChatGPT-Anmelde- und KI-Funktionen müssen im Produktionsbuild getestet sein. Dann die Version zur Überprüfung einreichen; für die erste Veröffentlichung kann eine manuelle Freigabe nach Apples Genehmigung gewählt werden.

## Quellen

- [Expo: CI-Builds](https://docs.expo.dev/build/building-on-ci/)
- [Expo: iOS-Upload](https://docs.expo.dev/submit/ios/)
- [Expo: automatische Einreichungen und TestFlight](https://docs.expo.dev/build/automate-submissions/)
- [GitHub: Pages-Workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Apple: Screenshot-Anforderungen](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
