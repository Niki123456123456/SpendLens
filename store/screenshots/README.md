# Store-Screenshots

Unveränderte Bildschirmaufnahmen der laufenden nativen SpendLens-App mit den integrierten Beispieldaten. Keine nachgebauten Oberflächen und keine KI-generierten Screenshots.

- `de-DE/iphone` und `en-GB/iphone`: iPhone 17 Pro Max, 1320 × 2868 Pixel.
- `de-DE/iphone-medium` und `en-GB/iphone-medium`: iPhone 17 Pro, 1206 × 2622 Pixel; zusätzlich aufgenommen, weil App Store Connect inzwischen diese mittlere Displayklasse als erforderlich ausweist.
- `de-DE/ipad` und `en-GB/ipad`: iPad Pro 13 Zoll (M5), 2064 × 2752 Pixel.
- Motive: `01-overview`, `02-insights`, `03-receipt`.
- Aufgenommen am 22.10.2026 mit iOS 26.0, App-Version 1.0.0, aus einem lokalen nativen Release-Simulator-Build mit Xcode 27.1.
- Die Übersetzungen wurden mit `-AppleLanguages '(de)'` / `'(en)'` und passender `-AppleLocale` geprüft. `CFBundleLocalizations` sowie beide `InfoPlist.strings`-Dateien wurden im gebauten App-Bundle kontrolliert. Zusätzlich wurde auf dem iPhone-Simulator die echte Sprachwahl unter Einstellungen → Apps → SpendLens → Sprache geöffnet und Deutsch ausgewählt; die App übernahm diese Einstellung bei unveränderten Beispieldaten. Der Nachweis liegt unter `../qa/ios-language-settings.png`.
- Die PNGs werden für den Upload verlustfrei als RGB ohne Alphakanal gespeichert; Auflösung und Bildinhalt bleiben gleich.

Vor dem Hochladen prüfen, ob die Screenshots zum endgültigen signierten Produktionsbuild passen. Apple benötigt bei einer Universal-App iPhone- und iPad-Screenshots. Die passenden Upload-Felder sind aktuell „iPhone mit Dynamic Island (mittleres Display)“, optional „iPhone mit Dynamic Island (großes Display)“ und „iPad 13 Zoll“. Die Grenzen richten sich nach Apples jeweils aktueller [Screenshot-Spezifikation](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
