// Past de verbeteringen van een beoordelaar toe op een vertaling.
//
//   node tools/i18n/pas-toe.mjs <taal> <verbeteringen.txt>
//
// Het verbeterbestand heeft per regel:  sleutel | nieuwe vertaling | korte reden   (regels met # worden genegeerd). Alleen sleutels die in
// tools/i18n/vertaling/<taal>.txt staan worden vervangen; daarna draait de controle (plaatshouders, meervouden).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const [taal, bestand] = process.argv.slice(2);
if (!taal || !bestand) { console.error('Gebruik: node tools/i18n/pas-toe.mjs <taal> <verbeteringen.txt>'); process.exit(1); }
const doel = fileURLToPath(new URL(`./vertaling/${taal}.txt`, import.meta.url));
const regels = readFileSync(doel, 'utf8').split('\n');
const nieuw = new Map();
for (const r of readFileSync(bestand, 'utf8').split('\n')) {
  if (!r.trim() || r.trim().startsWith('#')) continue;
  const d = r.split(' | ');
  if (d.length < 2) { console.error(`overgeslagen (geen "sleutel | vertaling"): ${r.slice(0, 80)}`); continue; }
  nieuw.set(d[0].trim(), d[1].trim());
}
let gedaan = 0; const onbekend = new Set(nieuw.keys());
const uit = regels.map((r) => {
  const p = r.indexOf(' | ');
  if (p < 0 || r.startsWith('#')) return r;
  const k = r.slice(0, p).trim();
  if (!nieuw.has(k)) return r;
  onbekend.delete(k); gedaan++;
  return `${k} | ${nieuw.get(k)}`;
});
writeFileSync(doel, uit.join('\n'));
console.log(`${taal}: ${gedaan} teksten vervangen${onbekend.size ? `, onbekende sleutels: ${[...onbekend].join(', ')}` : ''}`);
const r = spawnSync('node', [fileURLToPath(new URL('./maak.mjs', import.meta.url)), '--controleer', taal], { encoding: 'utf8' });
process.stdout.write(r.stdout); process.stderr.write(r.stderr);
process.exit(r.status || 0);
