import { execFileSync } from 'node:child_process';

if (process.platform !== 'darwin') {
  console.error('Der lokale iPhone-Build benötigt macOS mit Xcode. Alternativ einen EAS Development Build verwenden.');
  process.exit(1);
}
let version;
try {
  version = execFileSync('xcodebuild', ['-version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).match(/Xcode (\d+)\.(\d+)/);
} catch {
  console.error('Xcode ist nicht verfügbar. Xcode installieren, einmal öffnen und unter Settings → Locations auswählen.');
  process.exit(1);
}
if (!version || Number(version[1]) < 26 || (Number(version[1]) === 26 && Number(version[2]) < 4)) {
  console.error(`Expo SDK 57 benötigt Xcode 26.4 oder neuer. Ausgewählt: ${version?.[0] || 'unbekannt'}.\nXcode aktualisieren, öffnen und unter Settings → Locations als Command Line Tools auswählen. Danach npm run ios -- --device erneut starten.\nhttps://docs.expo.dev/versions/v57.0.0/#support-for-android-and-ios-versions`);
  process.exit(1);
}
