// Kent het spellingswoordenboek van de taal dit woord? Voor de controle van woorden die iemand voor de puzzels heeft opgeschreven.
//
//   import { onbekend } from './spelling.mjs';
//   onbekend('de', ['Haus', 'Hauss'])  ->  Set { 'Hauss' }
//
// De woordenboeken staan in de map uit de omgevingsvariabele WOORDENBRON (standaard ./.woordenbron): per taal <taal>.aff en <taal>.dic
// (Hunspell, bij en en pt ook <taal>2), voor het Nederlands wordlist.txt (OpenTaal) en voor het Fins gebruiken we Voikko.
// Zie tools/woordenlijst/haal-bronnen.sh en tools/woordenlijst/bronnen.md.
//
// Een woord telt als bekend als het woordenboek het kent zoals het er staat, in kleine letters of met een hoofdletter (zo hoeft een
// eigennaam als "Rome" of een Duits zelfstandig naamwoord niet in een bepaalde schrijfwijze te staan).

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const bronMap = () => resolve(process.env.WOORDENBRON || '.woordenbron');

const hoofd = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const vormen = (w) => [...new Set([w, w.toLowerCase(), hoofd(w.toLowerCase())])];

let openTaal = null;
function openTaalSet() {
  if (!openTaal) openTaal = new Set(readFileSync(join(bronMap(), 'wordlist.txt'), 'utf8').split('\n').map((x) => x.trim()).filter(Boolean));
  return openTaal;
}

// Welke van deze vormen kent het woordenboek? (geeft de bekende terug)
function bekendeVormen(taal, lijst) {
  if (taal === 'nl') { const s = openTaalSet(); return new Set(lijst.filter((w) => s.has(w))); }
  if (taal === 'fi') {
    const r = spawnSync('python3', ['-I', '-c', 'import sys,libvoikko\nv=libvoikko.Voikko("fi")\nfor w in sys.stdin.read().split("\\n"):\n    if w and v.spell(w): print(w)'], { input: lijst.join('\n'), encoding: 'utf8', maxBuffer: 1e8 });
    if (r.status !== 0) throw new Error(`Voikko werkt niet: ${r.stderr}`);
    return new Set(r.stdout.split('\n').filter(Boolean));
  }
  const bekend = new Set();
  let rest = lijst;
  for (const naam of [taal, `${taal}2`]) {
    const dic = join(bronMap(), naam);
    if (!existsSync(`${dic}.dic`)) continue;
    const r = spawnSync('hunspell', ['-d', dic, '-i', 'UTF-8', '-l'], { input: `${rest.join('\n')}\n`, encoding: 'utf8', maxBuffer: 1e8 });
    if (r.error) throw new Error(`Hunspell werkt niet: ${r.error.message}`);
    const fout = new Set(r.stdout.split('\n').filter(Boolean));
    for (const w of rest) if (!fout.has(w)) bekend.add(w);
    rest = rest.filter((w) => fout.has(w));
  }
  if (bekend.size === 0 && rest.length === lijst.length && !existsSync(join(bronMap(), `${taal}.dic`))) throw new Error(`Geen woordenboek voor ${taal} in ${bronMap()} (zie tools/woordenlijst/haal-bronnen.sh)`);
  return bekend;
}

export function onbekend(taal, woorden) {
  const alle = [...new Set(woorden.flatMap(vormen))];
  const bekend = bekendeVormen(taal, alle);
  return new Set(woorden.filter((w) => !vormen(w).some((v) => bekend.has(v))));
}
