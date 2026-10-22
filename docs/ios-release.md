# iOS-Auslieferung mit GitHub Actions und EAS

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
- GitHub-Lauf nach Korrektur des Runner-Kontexts: `validate` erfolgreich; der Release-Schritt stoppt vor EAS mit fehlenden `ASC_KEY_ID`/`ASC_ISSUER_ID`. `EXPO_TOKEN` und `ASC_APP_ID` sind als Repository-Secrets gespeichert. Der `.p8`-Schlüssel fehlt ebenfalls noch. Apple verlangt zunächst die Freischaltung unter Benutzer und Zugriffsrechte → Integration → App Store Connect-API → Zugriff anfordern.
- Der erste signierte Build wartet auf die persönliche Apple-Anmeldung des Herausgebers im EAS-CLI. Noch kein Store-Build hochgeladen und noch keine App-Review-Einreichung erfolgt. Der Screenshot-Upload im Browser wartet auf die Chrome-Erweiterungsberechtigung „Zugriff auf Datei-URLs zulassen“.
- Der Altersfreigabe-Fragebogen wurde anhand der vorhandenen Funktionen ausgefüllt und gespeichert: Apple berechnet 4+ (mit regionalen Äquivalenten); keine Einstufung als Kinder-App. Inhaltsrechte, Preis/Verfügbarkeit und die endgültige App-Datenschutzerklärung bei Apple sind vor der Einreichung noch zu vervollständigen.

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
