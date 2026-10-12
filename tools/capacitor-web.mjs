// Zet de app klaar voor Capacitor: kopieert wat de app nodig heeft naar www/ (de webDir in capacitor.config.json).
//   npm run web      daarna:  npx cap sync android
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url), uit = new URL('www/', root);
rmSync(uit, { recursive: true, force: true });
mkdirSync(uit, { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'assets', 'icons']) cpSync(fileURLToPath(new URL(f, root)), fileURLToPath(new URL(f, uit)), { recursive: true });
console.log('www/ is klaar. Volgende stap: npx cap sync android');
