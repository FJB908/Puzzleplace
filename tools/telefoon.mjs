// Start de server zo dat je telefoon erbij kan (zelfde wifi), op elk systeem:   npm run telefoon
// Het laat de adressen zien die je op je telefoon intikt. Gebruik een andere poort met:  PORT=3000 npm run telefoon
// (Windows cmd:  set PORT=3000&& npm run telefoon)

import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const port = process.env.PORT || '8000';
const adressen = Object.values(networkInterfaces()).flat().filter((a) => a && a.family === 'IPv4' && !a.internal).map((a) => a.address);

console.log('\nOpen dit adres op je telefoon (die moet op hetzelfde wifi zitten als deze computer):\n');
for (const a of adressen) console.log(`    http://${a}:${port}`);
if (!adressen.length) console.log('    (geen netwerkadres gevonden: ben je met wifi verbonden?)');
console.log('\nWerkt het niet? Klik "Toestaan" als Windows vraagt of Node.js het netwerk op mag, en zet VPN uit.\n');

const kind = spawn(process.execPath, [fileURLToPath(new URL('../server/index.mjs', import.meta.url))], { stdio: 'inherit', env: { ...process.env, HOST: '0.0.0.0', PORT: port } });
kind.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => kind.kill('SIGINT'));
