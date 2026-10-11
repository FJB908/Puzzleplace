// Maakt de taalpakketten van de app (js/i18n/talen/<taal>.js) uit de tekstbestanden en controleert ze.
//
//   node tools/i18n/maak.mjs                    alles maken en controleren (stopt met een foutmelding als er iets niet klopt)
//   node tools/i18n/maak.mjs --controleer <taal> controleert alleen die vertaling en schrijft niets (handig tijdens het vertalen)
//   node tools/i18n/maak.mjs --naast <taal> <bestand>   het Engels en de vertaling onder elkaar (voor de beoordelaar)
//   node tools/i18n/maak.mjs --blad [<taal>]    schrijft het vertaalblad (Engels, met uitleg voor vertalers): tools/i18n/vertaalblad.txt, met een taal
//                                               erbij ook de vormen die die taal nodig heeft voor meervouden
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
    for (const p of heeft) if (!wil.has(p) && !(p === 'n' && vorm)) fouten.push(`onbekende plaatshouder {${p}} in ${k}`);
    // een vorm die ook voor andere getallen geldt (Fransen: 0 en 1, Lets: 21, 31, ...) moet {n} bevatten, ook als het Engels geen getal noemt
    if (vorm && meervoudsdekking(taal)[vorm] > 1 && /\{n\}/.test(bron + v) === false && !heeft.has('n')) fouten.push(`{n} ontbreekt in ${k}: deze vorm geldt voor meer dan één getal`);
  }
  // De woordenlijst voor voorgestelde wachtwoorden: 24 verschillende woorden, alleen letters, kleine letters
  const pw = vertaling['forms.passwordWords'];
  if (pw) {
    const woorden = pw.split(',').map((x) => x.trim());
    if (woorden.length !== 24) fouten.push(`forms.passwordWords: ${woorden.length} woorden in plaats van 24`);
    if (new Set(woorden).size !== woorden.length) fouten.push('forms.passwordWords: dubbele woorden');
    for (const x of woorden) if (!/^\p{L}{3,10}$/u.test(x) || x !== x.toLowerCase()) fouten.push(`forms.passwordWords: "${x}" is geen enkel woord van 3 tot 10 kleine letters`);
    if (taal !== 'en' && pw === en['forms.passwordWords']) fouten.push('forms.passwordWords: dit zijn de Engelse woorden; schrijf 24 eigen woorden');
  }
  for (const k of Object.keys(vertaling)) {
    if (verwacht.has(k)) continue;
    // een vorm die deze taal niet heeft (bijv. _few in het Nederlands) mag er niet in staan
    fouten.push(`onbekende sleutel (of meervoudsvorm die ${taal} niet kent): ${k}`);
  }
  return fouten;
}

const { en, nl, uitleg, volgorde, sectie } = leesBron();
const FORMVOLGORDE = ['zero', 'one', 'two', 'few', 'many', 'other'];

// De sleutels die een taal nodig heeft, in de volgorde van de bron (bij meervouden: de vormen van die taal)
function sleutelsVoor(taal) {
  const uit = [], gedaan = new Set();
  const vormen = meervoudsvormen(taal).sort((a, b) => FORMVOLGORDE.indexOf(a) - FORMVOLGORDE.indexOf(b));
  for (const k of volgorde) {
    if (!isVorm(k)) { uit.push(k); continue; }
    const basis = basisVan(k);
    if (gedaan.has(basis)) continue;
    gedaan.add(basis);
    for (const v of vormen) uit.push(`${basis}_${v}`);
  }
  return uit;
}
const ordenen = (taal, obj) => Object.fromEntries(sleutelsVoor(taal).filter((k) => k in obj).map((k) => [k, obj[k]]));

// ----- Vertaalblad: de Engelse teksten met uitleg -----
const argTaal = (vlag) => { const i = process.argv.indexOf(vlag); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : null; };
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

// ----- Sjabloon voor een vertaling: alle sleutels die deze taal nodig heeft, met de Engelse tekst en de uitleg erboven -----
if (process.argv.includes('--sjabloon')) {
  const taal = argTaal('--sjabloon'), bestand = process.argv[process.argv.indexOf('--sjabloon') + 2];
  if (!taal || !TALEN[taal] || !bestand) { console.error('Gebruik: node tools/i18n/maak.mjs --sjabloon <taal> <uitvoerbestand>'); process.exit(1); }
  const vormen = meervoudsvormen(taal).sort((a, b) => FORMVOLGORDE.indexOf(a) - FORMVOLGORDE.indexOf(b));
  let uit = `# Vertaling in het ${TALEN[taal].english} (${taal}). Per regel:  sleutel | vertaling   (regels met # zijn uitleg en worden genegeerd)\n# Meervouden: ${taal} heeft de vormen ${vormen.join(', ')}; schrijf elke vorm uit en gebruik {n} in elke vorm.\n`;
  let laatste = '', gedaan = new Set();
  for (const k of volgorde) {
    if (sectie[k] !== laatste) { uit += `\n##### ${sectie[k]}\n`; laatste = sectie[k]; }
    if (isVorm(k)) {
      const basis = basisVan(k);
      if (gedaan.has(basis)) continue;
      gedaan.add(basis);
      if (uitleg[k]) uit += `# ${uitleg[k]}\n`;
      for (const [vorm, tekst] of Object.entries(en).filter(([x]) => basisVan(x) === basis && isVorm(x))) uit += `# EN ${vorm.replace(`${basis}_`, '')}: ${tekst}\n`;
      for (const v of vormen) uit += `${basis}_${v} | \n`;
    } else {
      if (uitleg[k]) uit += `# ${uitleg[k]}\n`;
      uit += `# EN: ${en[k]}\n${k} | \n`;
    }
  }
  writeFileSync(bestand, uit);
  console.log(`${bestand}: ${sleutelsVoor(taal).length} regels om te vertalen`);
  process.exit(0);
}

// ----- Naast elkaar: het Engels en de vertaling onder elkaar, voor wie de vertaling nakijkt -----
if (process.argv.includes('--naast')) {
  const taal = argTaal('--naast'), bestand = process.argv[process.argv.indexOf('--naast') + 2];
  const v = taal && TALEN[taal] ? (taal === 'nl' ? nl : leesVertaling(taal)) : null;
  if (!v || !bestand) { console.error('Gebruik: node tools/i18n/maak.mjs --naast <taal> <uitvoerbestand>  (de vertaling moet bestaan)'); process.exit(1); }
  let uit = `# ${TALEN[taal].english} (${taal}): the English source (EN) and the translation (${taal}) under each other. Notes (NOTE) are for the translator. Plural forms: EN has one/other, ${taal} has ${meervoudsvormen(taal).join('/')}.\n`;
  let laatste = '', gedaan = new Set();
  for (const k of volgorde) {
    if (sectie[k] !== laatste) { uit += `\n##### ${sectie[k]}\n`; laatste = sectie[k]; }
    if (isVorm(k)) {
      const basis = basisVan(k);
      if (gedaan.has(basis)) continue;
      gedaan.add(basis);
      if (uitleg[k]) uit += `NOTE: ${uitleg[k]}\n`;
      for (const [vorm, tekst] of Object.entries(en).filter(([x]) => basisVan(x) === basis && isVorm(x))) uit += `EN ${vorm.replace(`${basis}_`, '')}: ${tekst}\n`;
      for (const f of meervoudsvormen(taal).sort((a, b) => FORMVOLGORDE.indexOf(a) - FORMVOLGORDE.indexOf(b))) uit += `${taal} ${f} (${basis}_${f}): ${v[`${basis}_${f}`] ?? '(MISSING)'}\n`;
    } else {
      if (uitleg[k]) uit += `NOTE: ${uitleg[k]}\n`;
      uit += `[${k}]\nEN: ${en[k]}\n${taal}: ${v[k] ?? '(MISSING)'}\n`;
    }
  }
  writeFileSync(bestand, uit);
  console.log(`${bestand}: ${Math.round(uit.length / 1000)} kB`);
  process.exit(0);
}

// ----- Waarschuwingen (geen fouten): dingen die kloppen kunnen maar een blik waard zijn -----
const TOEGESTAAN_GELIJK = new Set(['Sudoku', 'OK', 'Facebook', 'Puzzleplace', 'Puzzelplaats']);
function waarschuwingen(taal, vertaling) {
  const w = [];
  for (const [k, v] of Object.entries(vertaling)) {
    const bron = en[k] ?? en[`${basisVan(k)}_other`] ?? '';
    if (v === bron && !TOEGESTAAN_GELIJK.has(v) && /\p{L}{4,}/u.test(v.replace(/\{\w+\}/g, ''))) w.push(`gelijk aan het Engels: ${k}`);
    if (v !== v.trim() && v.trim() === bron.trim()) w.push(`begin of eind met spatie anders dan het Engels: ${k}`);
    if (/ {2,}/.test(v)) w.push(`dubbele spatie: ${k}`);
    if (bron.length <= 24 && v.length > Math.max(bron.length * 1.8, bron.length + 8)) w.push(`veel langer dan het Engels (${v.length} tegen ${bron.length} tekens, past het op een knop?): ${k}`);
    if (!/\.\.\./.test(bron) && /\.\.\./.test(v)) w.push(`drie punten in plaats van …: ${k}`);
    if (/[\u0000-\u001f]/.test(v)) w.push(`stuurteken: ${k}`);
    if (/^nav\.(home|games|friends|settings)$/.test(k) && [...v].length > 12) w.push(`menuwoord langer dan 12 tekens (${[...v].length}); alleen als het echt het gebruikelijke woord is: ${k}`);
  }
  return w;
}

// ----- Alleen controleren -----
if (process.argv.includes('--controleer')) {
  const taal = argTaal('--controleer');
  if (!taal || !TALEN[taal]) { console.error('Gebruik: node tools/i18n/maak.mjs --controleer <taal>'); process.exit(1); }
  const v = taal === 'en' ? en : taal === 'nl' ? nl : leesVertaling(taal);
  if (!v) { console.error(`${taal}: tools/i18n/vertaling/${taal}.txt bestaat nog niet`); process.exit(1); }
  const fouten = controleer(taal, en, v), waarsch = waarschuwingen(taal, v);
  if (fouten.length) console.error(`${taal}: ${fouten.length} FOUTEN\n  ${fouten.slice(0, 80).join('\n  ')}${fouten.length > 80 ? `\n  ... en nog ${fouten.length - 80}` : ''}`);
  if (waarsch.length) console.log(`${taal}: ${waarsch.length} waarschuwingen (kijk of ze kloppen)\n  ${waarsch.slice(0, 80).join('\n  ')}${waarsch.length > 80 ? `\n  ... en nog ${waarsch.length - 80}` : ''}`);
  console.log(fouten.length ? `${taal}: NIET GOED` : `${taal}: goed (${Object.keys(v).length} teksten)`);
  process.exit(fouten.length ? 1 : 0);
}

const schrijf = (taal, obj, bron) => {
  const gesorteerd = ordenen(taal, obj);
  const regels = Object.keys(gesorteerd).map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(gesorteerd[k])},`).join('\n');
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
