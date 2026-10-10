// Maakt de taalpakketten van de app (js/i18n/talen/<taal>.js) uit de tekstbestanden en controleert ze.
//
//   node tools/i18n/maak.mjs            alles maken en controleren (stopt met een foutmelding als er iets niet klopt)
//   node tools/i18n/maak.mjs --blad     schrijft per sectie een vertaalblad voor vertalers: tools/i18n/vertaalblad.txt
//
// Bronnen:
//   tools/i18n/bron/*.txt        per regel   sleutel | Engels | Nederlands      (Engels is de officiële bron; regels met # zijn uitleg voor vertalers)
//   tools/i18n/vertaling/<taal>.txt   per regel   sleutel | vertaling              (alle andere talen)
//
// Meervouden: een tekst met een getal heeft vormen sleutel_one, sleutel_other (en per taal zero/two/few/many, zie Intl.PluralRules).
// Controles per taal: elke sleutel is vertaald, de {plaatshouders} kloppen, alle meervoudsvormen van de taal zijn er, niets is leeg.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALEN } from '../../js/shared/talen.js';
import { meervoudsvormen, meervoudsdekking } from '../../js/shared/opmaak.js';

const hier = fileURLToPath(new URL('./', import.meta.url));
const uitDir = fileURLToPath(new URL('../../js/i18n/talen/', import.meta.url));
const VORMEN = ['zero', 'one', 'two', 'few', 'many', 'other'];

function leesBron() {
  const en = {}, nl = {}, uitleg = {}, volgorde = [], sectie = {};
  for (const f of readdirSync(join(hier, 'bron')).filter((x) => x.endsWith('.txt')).sort()) {
    let notitie = [];
    readFileSync(join(hier, 'bron', f), 'utf8').split('\n').forEach((regel, i) => {
      if (!regel.trim()) { notitie = []; return; }
      if (regel.startsWith('#')) { notitie.push(regel.replace(/^#\s?/, '')); return; }
      const d = regel.split(' | ');
      if (d.length !== 3) throw new Error(`${f}:${i + 1}: verwacht "sleutel | Engels | Nederlands", kreeg: ${regel.slice(0, 80)}`);
      const [k, e, n] = d.map((x) => x.trim());
      if (k in en) throw new Error(`${f}:${i + 1}: dubbele sleutel ${k}`);
      en[k] = e; nl[k] = n; volgorde.push(k); sectie[k] = f.replace('.txt', '');
      if (notitie.length) uitleg[k] = notitie.join(' ');
      notitie = [];
    });
  }
  return { en, nl, uitleg, volgorde, sectie };
}

function leesVertaling(taal) {
  const uit = {}, f = join(hier, 'vertaling', `${taal}.txt`);
  if (!existsSync(f)) return null;
  readFileSync(f, 'utf8').split('\n').forEach((regel, i) => {
    if (!regel.trim() || regel.startsWith('#')) return;
    const p = regel.indexOf(' | ');
    if (p < 0) throw new Error(`${taal}.txt:${i + 1}: verwacht "sleutel | vertaling": ${regel.slice(0, 80)}`);
    const k = regel.slice(0, p).trim(), v = regel.slice(p + 3).trim();
    if (k in uit) throw new Error(`${taal}.txt:${i + 1}: dubbele sleutel ${k}`);
    uit[k] = v;
  });
  return uit;
}

const plaatshouders = (s) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
const basisVan = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');
const isVorm = (k) => /_(zero|one|two|few|many|other)$/.test(k);

function controleer(taal, en, vertaling) {
  const fouten = [];
  const enBasis = new Map();                                        // basissleutel -> vormen in het Engels
  for (const k of Object.keys(en)) if (isVorm(k)) (enBasis.get(basisVan(k)) || enBasis.set(basisVan(k), []).get(basisVan(k))).push(k);
  const verwacht = new Set();
  for (const k of Object.keys(en)) {
    if (isVorm(k)) continue;
    verwacht.add(k);
  }
  for (const [basis] of enBasis) for (const vorm of meervoudsvormen(taal)) verwacht.add(`${basis}_${vorm}`);
  for (const k of verwacht) {
    const v = vertaling[k];
    if (v === undefined || v === '') { fouten.push(`ontbreekt: ${k}`); continue; }
    const bron = en[k] ?? en[`${basisVan(k)}_other`];
    const wil = plaatshouders(bron), heeft = plaatshouders(v);
    const vorm = isVorm(k) ? k.match(/_([a-z]+)$/)[1] : null;
    // {n} mag alleen ontbreken in een vorm die precies één getal dekt (Engels "one" = 1); anders zou "21" als "1" worden getoond
    const enkel = vorm && meervoudsdekking(taal)[vorm] === 1;
    for (const p of wil) if (!heeft.has(p) && !(p === 'n' && enkel)) fouten.push(`plaatshouder {${p}} mist in ${k}`);
    for (const p of heeft) if (!wil.has(p)) fouten.push(`onbekende plaatshouder {${p}} in ${k}`);
  }
  for (const k of Object.keys(vertaling)) {
    if (verwacht.has(k)) continue;
    // een vorm die deze taal niet heeft (bijv. _few in het Nederlands) mag er niet in staan
    fouten.push(`onbekende sleutel (of meervoudsvorm die ${taal} niet kent): ${k}`);
  }
  return fouten;
}

const { en, nl, uitleg, volgorde, sectie } = leesBron();

if (process.argv.includes('--blad')) {
  let uit = '';
  let laatste = '';
  for (const k of volgorde) {
    if (sectie[k] !== laatste) { uit += `\n## ${sectie[k]}\n`; laatste = sectie[k]; }
    if (uitleg[k]) uit += `# ${uitleg[k]}\n`;
    uit += `${k} | ${en[k]}\n`;
  }
  writeFileSync(join(hier, 'vertaalblad.txt'), uit.trim() + '\n');
  console.log(`vertaalblad.txt: ${volgorde.length} teksten`);
  process.exit(0);
}

const schrijf = (taal, obj, bron) => {
  const volg = Object.keys(obj);
  const regels = volg.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(obj[k])},`).join('\n');
  writeFileSync(join(uitDir, `${taal}.js`), `// GEGENEREERD door tools/i18n/maak.mjs uit ${bron}: niet met de hand aanpassen.\nexport default {\n${regels}\n};\n`);
};

// Engels (bron) en Nederlands (de eerste vertaling, dezelfde sleutels)
schrijf('en', en, 'tools/i18n/bron');
let totaalFouten = 0;
const nlFouten = controleer('nl', en, nl);
if (nlFouten.length) { console.error(`nl: ${nlFouten.length} fouten\n  ${nlFouten.slice(0, 30).join('\n  ')}`); totaalFouten += nlFouten.length; }
schrijf('nl', nl, 'tools/i18n/bron');

const samenvatting = [`en: ${Object.keys(en).length} sleutels`, `nl: ok`];
for (const taal of Object.keys(TALEN)) {
  if (taal === 'en' || taal === 'nl') continue;
  const v = leesVertaling(taal);
  if (!v) { samenvatting.push(`${taal}: (nog geen vertaling)`); continue; }
  const fouten = controleer(taal, en, v);
  if (fouten.length) { console.error(`${taal}: ${fouten.length} fouten\n  ${fouten.slice(0, 40).join('\n  ')}`); totaalFouten += fouten.length; samenvatting.push(`${taal}: ${fouten.length} fouten`); }
  else { schrijf(taal, v, `tools/i18n/vertaling/${taal}.txt`); samenvatting.push(`${taal}: ok`); }
}
console.log(samenvatting.join(' · '));
process.exit(totaalFouten ? 1 : 0);
