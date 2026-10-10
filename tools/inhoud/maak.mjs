// Maakt de puzzelinhoud van de spellen per taal (Woordzoeker en Kruiswoord) uit de tekstbestanden in tools/inhoud/<taal>/ en controleert die.
//
//   node tools/inhoud/maak.mjs                         alle talen maken en controleren (stopt met een foutmelding als er iets niet klopt)
//   node tools/inhoud/maak.mjs --controleer <taal>     één taal: maken, controleren, en de generatoren proefdraaien
//   node tools/inhoud/maak.mjs --controleer <taal> --spelling     idem, en elk woord naar het spellingswoordenboek van de taal sturen
//                                                      (WOORDENBRON=map met de woordenboeken, zie tools/woordenlijst/haal-bronnen.sh)
//
// Bronbestanden (per taal, in de gewone schrijfwijze van de taal, mét accenten; het spel vouwt ze zelf, zie js/shared/talen.js):
//   woordzoeker.txt   blokken:  "## thema-id | Titel"  gevolgd door de woorden van het thema, gescheiden door spaties of regeleinden
//   kruiswoord.txt    per regel:  antwoord | omschrijving | niveau   (niveau 1 = bekend woord, 2 = iets minder bekend, 3 = uitdagend)
//   eigennamen.txt    (optioneel) woorden die het spellingswoordenboek niet kent maar wel kloppen (landen, steden, rivieren), met uitleg na #
// Uitvoer: js/games/woordzoeker/talen/<taal>.js en js/games/kruiswoord/talen/<taal>.js (niet met de hand aanpassen).

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TALEN, vouw, isAlfabet } from '../../js/shared/talen.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const inDir = (taal) => join(ROOT, 'tools/inhoud', taal);
const THEMA_IDS = ['bloemen', 'tuin', 'dieren', 'keuken', 'eten', 'weer', 'reizen', 'land', 'familie', 'huis', 'natuur', 'muziek', 'hobby', 'kleding', 'feest'];
const WZ_WOORD = { min: 3, max: 11 };                 // lengte van een woord (na vouwen), zie LEVELS in js/games/woordzoeker/engine.js
const WZ_PER_THEMA = { min: 20, max: 32 };
const KW_WOORD = { min: 3, max: 12 };
const KW_MIN_ENTRIES = 300;
const KW_NIVEAUS = { 1: 0.5, 2: 0.2, 3: 0.03 };       // minimaal aandeel per niveau (van alle woorden)

const hoofd = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const regelsVan = (f) => readFileSync(f, 'utf8').split('\n');

// ----- Lezen -----
function leesWoordzoeker(taal) {
  const f = join(inDir(taal), 'woordzoeker.txt');
  if (!existsSync(f)) return null;
  const themas = []; let cur = null;
  regelsVan(f).forEach((regel, i) => {
    const r = regel.trim();
    if (!r || (r.startsWith('#') && !r.startsWith('##'))) return;                 // lege regel of uitleg
    if (r.startsWith('##')) {
      const [id, titel] = r.slice(2).split('|').map((x) => x.trim());
      if (!id || !titel) throw new Error(`woordzoeker.txt:${i + 1}: verwacht "## thema-id | Titel"`);
      cur = { id, title: titel, bron: [] }; themas.push(cur);
    } else {
      if (!cur) throw new Error(`woordzoeker.txt:${i + 1}: woorden vóór het eerste "## thema | Titel"`);
      cur.bron.push(...r.replace(/\s#.*$/, '').split(/\s+/));
    }
  });
  return themas;
}

function leesKruiswoord(taal) {
  const f = join(inDir(taal), 'kruiswoord.txt');
  if (!existsSync(f)) return null;
  const uit = [];
  regelsVan(f).forEach((regel, i) => {
    if (!regel.trim() || regel.trim().startsWith('#')) return;
    const d = regel.split('|').map((x) => x.trim());
    if (d.length !== 3) throw new Error(`kruiswoord.txt:${i + 1}: verwacht "antwoord | omschrijving | niveau", kreeg: ${regel.slice(0, 80)}`);
    uit.push({ bron: d[0], clue: d[1], level: Number(d[2]), regel: i + 1 });
  });
  return uit;
}

function leesEigennamen(taal) {
  const f = join(inDir(taal), 'eigennamen.txt');
  return new Set(existsSync(f) ? regelsVan(f).flatMap((l) => l.replace(/#.*/, '').trim().split(/\s+/)).filter(Boolean) : []);
}

// ----- Controleren -----
const LETTERS = /^\p{L}+$/u;

function controleerWoordzoeker(taal, themas, fouten, waarsch) {
  const f = (m) => fouten.push(`woordzoeker: ${m}`), w = (m) => waarsch.push(`woordzoeker: ${m}`);
  const ids = themas.map((t) => t.id);
  for (const id of THEMA_IDS) if (!ids.includes(id)) f(`het thema "${id}" ontbreekt (alle talen hebben dezelfde 15 thema's: ${THEMA_IDS.join(', ')})`);
  for (const id of ids) if (!THEMA_IDS.includes(id)) f(`onbekend thema "${id}"`);
  if (new Set(ids).size !== ids.length) f('een thema staat er twee keer in');
  for (const t of themas) {
    t.words = [];
    const gezien = new Map();
    for (const bron of t.bron) {
      if (!LETTERS.test(bron)) { f(`${t.id}: "${bron}" bestaat niet alleen uit letters (geen streepjes, spaties of cijfers)`); continue; }
      const gevouwen = vouw(bron, taal).toUpperCase();
      if (!isAlfabet(gevouwen.toLowerCase(), taal)) { f(`${t.id}: "${bron}" bevat een letter die niet in het alfabet van de taal zit`); continue; }
      if (gevouwen.length < WZ_WOORD.min || gevouwen.length > WZ_WOORD.max) { f(`${t.id}: "${bron}" is ${gevouwen.length} letters, moet ${WZ_WOORD.min} tot ${WZ_WOORD.max} zijn`); continue; }
      if (gezien.has(gevouwen)) { f(`${t.id}: "${bron}" en "${gezien.get(gevouwen)}" worden na het vouwen hetzelfde woord (${gevouwen})`); continue; }
      gezien.set(gevouwen, bron);
      t.words.push(gevouwen);
    }
    if (t.words.length < WZ_PER_THEMA.min || t.words.length > WZ_PER_THEMA.max) f(`${t.id}: ${t.words.length} woorden, moet ${WZ_PER_THEMA.min} tot ${WZ_PER_THEMA.max} zijn`);
    // woorden die in elkaar zitten (ook achterstevoren) kunnen niet samen in een puzzel
    const omgekeerd = (s) => [...s].reverse().join('');
    let botsend = 0;
    for (const a of t.words) for (const b of t.words) if (a < b && (a.includes(b) || b.includes(a) || a.includes(omgekeerd(b)) || b.includes(omgekeerd(a)))) botsend++;
    if (botsend > 6) w(`${t.id}: ${botsend} paren woorden zitten in elkaar (ze komen dan niet samen in een puzzel)`);
  }
  return themas;
}

function controleerKruiswoord(taal, entries, fouten, waarsch) {
  const f = (m) => fouten.push(`kruiswoord: ${m}`), w = (m) => waarsch.push(`kruiswoord: ${m}`);
  const gezien = new Map(), clues = new Map();
  const uit = [];
  for (const e of entries) {
    const p = `regel ${e.regel} (${e.bron})`;
    if (!LETTERS.test(e.bron)) { f(`${p}: het antwoord bestaat niet alleen uit letters`); continue; }
    const answer = vouw(e.bron, taal).toUpperCase();
    if (!isAlfabet(answer.toLowerCase(), taal)) { f(`${p}: het antwoord bevat een letter die niet in het alfabet van de taal zit`); continue; }
    if (answer.length < KW_WOORD.min || answer.length > KW_WOORD.max) { f(`${p}: ${answer.length} letters, moet ${KW_WOORD.min} tot ${KW_WOORD.max} zijn`); continue; }
    if (![1, 2, 3].includes(e.level)) { f(`${p}: niveau moet 1, 2 of 3 zijn`); continue; }
    if (gezien.has(answer)) { f(`${p}: hetzelfde antwoord (na vouwen ${answer}) staat al op regel ${gezien.get(answer)}`); continue; }
    gezien.set(answer, e.regel);
    const clue = e.clue;
    if (clue.length < 8 || clue.length > 70) f(`${p}: omschrijving van ${clue.length} tekens, moet 8 tot 70 zijn`);
    if (/[.!]$/.test(clue)) w(`${p}: omschrijving eindigt op een punt of uitroepteken (liever zonder)`);
    if (clues.has(clue.toLowerCase())) f(`${p}: dezelfde omschrijving als regel ${clues.get(clue.toLowerCase())}`);
    clues.set(clue.toLowerCase(), e.regel);
    // het antwoord mag niet in de omschrijving staan (ook niet als begin van een woord: "schilder" in "schildert")
    const woorden = clue.split(/[^\p{L}]+/u).filter(Boolean).map((x) => vouw(x, taal).toUpperCase());
    if (woorden.includes(answer)) f(`${p}: het antwoord staat in de omschrijving`);
    else if (answer.length >= 4 && woorden.some((x) => x.includes(answer))) w(`${p}: een woord in de omschrijving bevat het antwoord ("${clue}")`);
    uit.push({ answer, clue, level: e.level });
  }
  if (uit.length < KW_MIN_ENTRIES) f(`${uit.length} woorden, minimaal ${KW_MIN_ENTRIES}`);
  const perNiveau = { 1: 0, 2: 0, 3: 0 };
  for (const e of uit) perNiveau[e.level]++;
  for (const [n, aandeel] of Object.entries(KW_NIVEAUS)) if (perNiveau[n] < Math.ceil(uit.length * aandeel)) f(`te weinig woorden van niveau ${n}: ${perNiveau[n]} (minimaal ${Math.ceil(uit.length * aandeel)})`);
  // genoeg van elke lengte, anders kan de generator geen rooster bouwen
  const perLengte = {};
  for (const e of uit) perLengte[e.answer.length] = (perLengte[e.answer.length] || 0) + 1;
  for (const [min, max, aantal] of [[3, 4, 40], [5, 7, 80], [8, 12, 30]]) {
    let n = 0; for (let l = min; l <= max; l++) n += perLengte[l] || 0;
    if (n < aantal) f(`te weinig antwoorden van ${min} tot ${max} letters: ${n} (minimaal ${aantal})`);
  }
  return uit;
}

// Spelling: elk woord naar het woordenboek van de taal (alleen als erom gevraagd is)
async function controleerSpelling(taal, themas, entries, fouten, waarsch) {
  const { onbekend } = await import('../woordenlijst/spelling.mjs');
  const eigen = leesEigennamen(taal);
  const woorden = [...new Set([...themas.flatMap((t) => t.bron), ...entries.map((e) => e.bron)])];
  const fout = [...onbekend(taal, woorden)].filter((x) => !eigen.has(x) && !eigen.has(x.toLowerCase()));
  if (fout.length) fouten.push(`spelling: het woordenboek van de taal kent deze woorden niet (typfout, verkeerde accenten of geen gewoon woord?): ${fout.join(', ')}. Zijn het eigennamen die kloppen? Zet ze dan in tools/inhoud/${taal}/eigennamen.txt (met uitleg).`);
  const aandeel = eigen.size / woorden.length;
  if (aandeel > 0.08) waarsch.push(`spelling: ${eigen.size} eigennamen is meer dan 8% van de woorden`);
}

// ----- Schrijven -----
const js = (x) => JSON.stringify(x);
function schrijfWoordzoeker(taal, themas) {
  const regels = themas.map((t) => `  { id: ${js(t.id)}, title: ${js(t.title)}, words: [${t.words.map(js).join(', ')}] },`).join('\n');
  writeFileSync(join(ROOT, 'js/games/woordzoeker/talen', `${taal}.js`),
    `// Woorden voor Woordzoeker in het ${TALEN[taal].english}, per thema. Alleen hoofdletters van het alfabet van de taal (gevouwen, zie js/shared/talen.js).\n// GEGENEREERD door tools/inhoud/maak.mjs uit tools/inhoud/${taal}/woordzoeker.txt: niet met de hand aanpassen.\n\nexport const THEMES = [\n${regels}\n];\n`);
}
function schrijfKruiswoord(taal, entries) {
  const regels = entries.map((e) => `  { answer: ${js(e.answer)}, clue: ${js(e.clue)}, level: ${e.level} },`).join('\n');
  writeFileSync(join(ROOT, 'js/games/kruiswoord/talen', `${taal}.js`),
    `// Woorden en omschrijvingen voor de kruiswoordpuzzel in het ${TALEN[taal].english}. level: 1 = bekend, 2 = iets minder bekend, 3 = uitdagend.\n// GEGENEREERD door tools/inhoud/maak.mjs uit tools/inhoud/${taal}/kruiswoord.txt: niet met de hand aanpassen.\n\nexport const ENTRIES = [\n${regels}\n];\n`);
}

// ----- De generatoren proefdraaien -----
async function proefdraaien(taal, fouten, waarsch) {
  const stamp = `?${Date.now()}`;
  const [{ laadThemas, themas }, { laadWoorden }, wz, kw] = await Promise.all([
    import(pathToFileURL(join(ROOT, 'js/games/woordzoeker/themas.js')).href), import(pathToFileURL(join(ROOT, 'js/games/kruiswoord/woorden.js')).href),
    import(pathToFileURL(join(ROOT, 'js/games/woordzoeker/engine.js')).href), import(pathToFileURL(join(ROOT, 'js/games/kruiswoord/engine.js')).href)]);
  await laadThemas(taal); await laadWoorden(taal);
  // Woordzoeker: elk niveau, veel zaden, en elk thema moet op elk niveau kunnen
  for (const level of Object.keys(wz.LEVELS)) {
    const spec = wz.LEVELS[level];
    for (const t of themas(taal).THEMES) {
      const n = t.words.filter((x) => x.length >= spec.minLen && x.length <= Math.min(spec.maxLen, spec.size)).length;
      if (n < spec.count) fouten.push(`woordzoeker: thema "${t.id}" heeft op niveau ${level} maar ${n} bruikbare woorden van ${spec.minLen} tot ${Math.min(spec.maxLen, spec.size)} letters (nodig: ${spec.count}); voeg woorden van die lengte toe`);
    }
    let mislukt = 0;
    for (let i = 0; i < 40; i++) { try { wz.generate(`proef${i}`, level, taal); } catch { mislukt++; } }
    if (mislukt) fouten.push(`woordzoeker: ${mislukt} van 40 puzzels op niveau ${level} konden niet gemaakt worden`);
  }
  // Kruiswoord
  for (const level of Object.keys(kw.LEVELS)) {
    let mislukt = 0, kort = 0;
    const spec = kw.LEVELS[level];
    for (let i = 0; i < 30; i++) {
      try { const p = kw.generate(`proef${i}`, level, taal); if (p.entries.length < Math.ceil(spec.words * 0.8)) kort++; } catch (e) { mislukt++; if (mislukt === 1) waarsch.push(`kruiswoord ${level}: ${e.message}`); }
    }
    if (mislukt) fouten.push(`kruiswoord: ${mislukt} van 30 puzzels op niveau ${level} konden niet gemaakt worden`);
    if (kort) fouten.push(`kruiswoord: ${kort} van 30 puzzels op niveau ${level} hadden te weinig woorden (minder dan 80% van ${spec.words}): meer woorden die goed kruisen (veel klinkers en gewone medeklinkers) toevoegen`);
  }
  void stamp;
}

// ----- Per taal -----
async function doeTaal(taal, { spelling = false, schrijven = true } = {}) {
  const fouten = [], waarsch = [];
  const wz = leesWoordzoeker(taal), kw = leesKruiswoord(taal);
  if (!wz) fouten.push(`tools/inhoud/${taal}/woordzoeker.txt ontbreekt`);
  if (!kw) fouten.push(`tools/inhoud/${taal}/kruiswoord.txt ontbreekt`);
  if (!wz || !kw) return { fouten, waarsch };
  const themas = controleerWoordzoeker(taal, wz, fouten, waarsch);
  const entries = controleerKruiswoord(taal, kw, fouten, waarsch);
  if (spelling) await controleerSpelling(taal, wz, kw, fouten, waarsch);
  if (schrijven) { schrijfWoordzoeker(taal, themas); schrijfKruiswoord(taal, entries); await proefdraaien(taal, fouten, waarsch); }
  return { fouten, waarsch, themas, entries };
}

const args = process.argv.slice(2);
const i = args.indexOf('--controleer');
const taalArg = i >= 0 ? args[i + 1] : null;
const spelling = args.includes('--spelling');
const talen = taalArg ? [taalArg] : Object.keys(TALEN).filter((t) => existsSync(inDir(t)));
if (taalArg && !TALEN[taalArg]) { console.error(`Onbekende taal: ${taalArg}`); process.exit(1); }
let totaal = 0;
for (const taal of talen) {
  const { fouten, waarsch, themas, entries } = await doeTaal(taal, { spelling });
  const per = entries ? [1, 2, 3].map((n) => entries.filter((e) => e.level === n).length).join('/') : '-';
  if (waarsch.length) console.log(`${taal}: ${waarsch.length} waarschuwingen\n  ${waarsch.slice(0, 60).join('\n  ')}`);
  if (fouten.length) { console.error(`${taal}: ${fouten.length} FOUTEN\n  ${fouten.slice(0, 60).join('\n  ')}`); totaal += fouten.length; }
  console.log(`${taal}: ${fouten.length ? 'NIET GOED' : 'goed'} (woordzoeker: ${themas ? themas.reduce((a, t) => a + t.words.length, 0) : 0} woorden in ${themas?.length ?? 0} thema's; kruiswoord: ${entries?.length ?? 0} woorden, niveau 1/2/3: ${per})`);
}
process.exit(totaal ? 1 : 0);
