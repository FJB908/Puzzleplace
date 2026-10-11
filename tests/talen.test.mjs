import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TALEN, TAAL_IDS, KLAAR, vouw, typInvoer, isAlfabet, herkenTaal, isTaal, isKlaar } from '../js/shared/talen.js';
import { zoek, invullen, meervoudsvormen, meervoudsdekking } from '../js/shared/opmaak.js';

const pad = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));

test('vouwen: accenten tellen niet mee, en een paar letters worden de gebruikelijke spelling', () => {
  const geval = [
    ['nl', 'Café', 'cafe'], ['nl', 'coöperatie', 'cooperatie'], ['nl', 'ĳs', 'ijs'],
    ['de', 'Straße', 'strasse'], ['de', 'Ärger', 'arger'], ['de', 'Übung', 'ubung'], ['de', 'Größe', 'grosse'],
    ['fr', 'élève', 'eleve'], ['fr', 'œuf', 'oeuf'], ['fr', 'garçon', 'garcon'], ['fr', 'Noël', 'noel'],
    ['es', 'año', 'ano'], ['es', 'pingüino', 'pinguino'], ['it', 'città', 'citta'], ['pt', 'coração', 'coracao'], ['pt', 'avó', 'avo'],
    ['ca', 'caçar', 'cacar'], ['ca', 'veïna', 'veina'],
    ['pl', 'łódź', 'lodz'], ['pl', 'żółć', 'zolc'], ['pl', 'wąż', 'waz'],
    ['cs', 'příliš', 'prilis'], ['cs', 'ďábel', 'dabel'], ['sk', 'ľad', 'lad'], ['sk', 'ôsmy', 'osmy'],
    ['sl', 'čaj', 'caj'], ['sl', 'šola', 'sola'], ['hr', 'đak', 'dak'], ['hr', 'ćevapi', 'cevapi'],
    ['hu', 'őz', 'oz'], ['hu', 'tűz', 'tuz'], ['ro', 'școală', 'scoala'], ['ro', 'țară', 'tara'], ['ro', 'ţară', 'tara'],
    ['sv', 'åska', 'aska'], ['sv', 'skärgård', 'skargard'], ['da', 'blåbær', 'blabaer'], ['da', 'øl', 'ol'], ['nb', 'bjørn', 'bjorn'], ['nb', 'sæter', 'saeter'],
    ['fi', 'käärme', 'kaarme'], ['fi', 'yö', 'yo'], ['et', 'õun', 'oun'], ['et', 'jää', 'jaa'], ['lv', 'ābols', 'abols'], ['lv', 'ķēms', 'kems'], ['lt', 'ąžuolas', 'azuolas'], ['lt', 'šuo', 'suo'],
    ['el', 'λουλούδι', 'λουλουδι'], ['el', 'Ελλάδα', 'ελλαδα'], ['el', 'ΟΔΟΣ', 'οδοσ'], ['el', 'δρόμος', 'δρομοσ'], ['el', 'ϊ', 'ι'],
    ['bg', 'Цвете', 'цвете'], ['bg', 'Йод', 'йод'], ['bg', 'ѝ', 'и'],
    ['en', 'naïve', 'naive'], ['en', 'Æsop', 'aesop'],
  ];
  for (const [taal, invoer, uit] of geval) assert.equal(vouw(invoer, taal), uit, `${taal}: ${invoer}`);
});

test('vouwen: in het Bulgaars blijven "й" en "и" verschillende letters, en in elke taal blijft het resultaat binnen het alfabet', () => {
  assert.notEqual(vouw('й', 'bg'), vouw('и', 'bg'));
  for (const taal of TAAL_IDS) for (const letter of TALEN[taal].alfabet) assert.equal(vouw(letter, taal), letter, `${taal}: ${letter} verandert bij het vouwen`);
});

test('typen: wat je typt wordt de letters voor het bord, de rest valt weg', () => {
  assert.equal(typInvoer('Straße!', 'de'), 'strasse');
  assert.equal(typInvoer(' ro-os ', 'nl'), 'roos');
  assert.equal(typInvoer('12 ab', 'nl'), 'ab');
  assert.equal(typInvoer('ΟΔΟΣ', 'el'), 'οδοσ');
  assert.equal(typInvoer('цвете', 'bg'), 'цвете');
  assert.equal(typInvoer('цвете', 'nl'), '', 'letters van een ander schrift tellen niet');
  assert.ok(isAlfabet('abc', 'nl') && !isAlfabet('abç', 'nl') && !isAlfabet('', 'nl'));
});

test('taal herkennen: de eerste voorkeur die we hebben, anders niets (dan vraagt de app het)', () => {
  const g = [
    [['nl-BE'], 'nl'], [['nl'], 'nl'], [['en-US', 'nl'], 'en'], [['ja-JP', 'de-AT'], 'de'], [['ja', 'zh-CN'], null], [[], null], [undefined, null],
    [['no'], 'nb'], [['nb-NO'], 'nb'], [['nn-NO'], 'nb'], [['pt-BR'], 'pt'], [['pt-PT'], 'pt'], [['ca-ES-valencia'], 'ca'], [['EL'], 'el'], [['bg-BG'], 'bg'],
    [['sr-Latn'], null], [['gsw-CH'], null], [['sv_SE'], 'sv'], [['fil', 'pl'], 'pl'], [[''], null], [[null, 'fr'], 'fr'], [['fi-FI'], 'fi'], [['et'], 'et'],
  ];
  for (const [voorkeur, verwacht] of g) assert.equal(herkenTaal(voorkeur, TAAL_IDS), verwacht, JSON.stringify(voorkeur));
  assert.ok(isTaal('de') && !isTaal('xx') && !isTaal('toString') && !isTaal('__proto__'));
});

test('taal herkennen: alleen talen die klaar zijn worden aangeboden', () => {
  assert.ok(KLAAR.includes('en') && KLAAR.includes('nl') && KLAAR.every(isTaal));
  assert.equal(herkenTaal(['nl-NL']), 'nl');
  assert.equal(herkenTaal(['xx', 'en-GB']), 'en');
  assert.equal(herkenTaal(['ja']), null);
  assert.equal(herkenTaal(['de-DE', 'nl'], ['nl', 'en']), 'nl', 'een taal die nog niet klaar is wordt overgeslagen');
  assert.equal(herkenTaal(['de-DE'], ['nl', 'en']), null);
  assert.ok(isKlaar('nl') && !isKlaar('xx'));
});

test('elke taal: alfabet, klinkers en toetsenbord kloppen met elkaar', () => {
  assert.equal(TAAL_IDS.length, 24);
  for (const id of TAAL_IDS) {
    const t = TALEN[id];
    assert.ok(t.native && t.english && t.locale, id);
    const alfabet = [...t.alfabet];
    assert.equal(new Set(alfabet).size, alfabet.length, `${id}: dubbele letter in het alfabet`);
    for (const k of t.klinkers) assert.ok(alfabet.includes(k), `${id}: klinker ${k} staat niet in het alfabet`);
    for (const k of t.klinkerachtig || '') assert.ok(alfabet.includes(k), `${id}: klinkerachtige ${k} staat niet in het alfabet`);
    // het toetsenbord van het kruiswoord bevat elke letter van het alfabet precies één keer (in hoofdletters), en niets anders
    const toetsen = t.toetsenbord.join('');
    assert.equal(toetsen.length, alfabet.length, `${id}: toetsenbord heeft ${toetsen.length} letters, alfabet ${alfabet.length}`);
    assert.deepEqual([...toetsen].map((c) => c.toLowerCase()).sort(), [...alfabet].sort(), `${id}: toetsenbord en alfabet verschillen`);
    for (const rij of t.toetsenbord) assert.ok(rij.length >= 6 && rij.length <= 11, `${id}: toetsenbordrij van ${rij.length} toetsen`);
    // de woordenlijstbron is bekend (voor de verantwoording in de Help)
    assert.ok(t.woordenlijst.naam && t.woordenlijst.licentie, id);
  }
});

test('meervouden: de vormen die elke taal voor hele getallen nodig heeft, en de juiste vorm bij een getal', () => {
  const vormen = (id) => meervoudsvormen(id).sort().join(',');
  assert.equal(vormen('en'), 'one,other'); assert.equal(vormen('nl'), 'one,other'); assert.equal(vormen('de'), 'one,other');
  assert.equal(vormen('fr'), 'one,other', 'Frans: "many" geldt pas vanaf een miljoen');
  assert.equal(vormen('pl'), 'few,many,one');
  assert.equal(vormen('cs'), 'few,one,other'); assert.equal(vormen('sk'), 'few,one,other');
  assert.equal(vormen('sl'), 'few,one,other,two');
  assert.equal(vormen('hr'), 'few,one,other');
  assert.equal(vormen('ro'), 'few,one,other');
  assert.equal(vormen('lv'), 'one,other,zero');
  assert.equal(vormen('lt'), 'few,one,other');
  assert.equal(meervoudsdekking('en').one, 1, 'Engels "one" is alleen 1');
  assert.ok(meervoudsdekking('lv').one > 1, 'Lets "one" geldt ook voor 21, 31, ...');
  const pakket = { 'x_one': 'een', 'x_few': 'paar', 'x_many': 'veel', 'x_other': 'rest', 'y': 'enkel' };
  const kies = (n, taal) => zoek(pakket, 'x', { n }, taal);
  assert.equal(kies(1, 'pl'), 'een'); assert.equal(kies(2, 'pl'), 'paar'); assert.equal(kies(5, 'pl'), 'veel'); assert.equal(kies(22, 'pl'), 'paar'); assert.equal(kies(12, 'pl'), 'veel');
  assert.equal(kies(21, 'lv'), 'een'); assert.equal(kies(3, 'sl'), 'paar'); assert.equal(kies(101, 'sl'), 'een');
  assert.equal(zoek(pakket, 'y', { n: 3 }, 'nl'), 'enkel', 'een tekst zonder meervoudsvormen blijft gewoon staan');
  assert.equal(zoek(pakket, 'z', { n: 3 }, 'nl'), undefined);
  assert.equal(invullen('{a} en {b}{c}', { a: 'x', b: 2 }), 'x en 2{c}', 'een onbekende plaatshouder blijft staan');
});

// De teksten van de app: elke taal die er is heeft alle sleutels, de juiste plaatshouders en de juiste meervoudsvormen
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const VORMEN = /_(zero|one|two|few|many|other)$/;
test('taalpakketten: alle teksten aanwezig, plaatshouders gelijk aan het Engels, geen lege teksten', async () => {
  const en = (await import('../js/i18n/talen/en.js')).default;
  const basis = (k) => k.replace(VORMEN, '');
  const basisSleutels = new Set(Object.keys(en).map(basis));
  for (const id of TAAL_IDS) {
    if (!existsSync(pad(`js/i18n/talen/${id}.js`))) continue;
    const pakket = (await import(`../js/i18n/talen/${id}.js`)).default;
    const vormen = meervoudsvormen(id);
    for (const b of basisSleutels) {
      const meervoud = Object.keys(en).some((k) => k !== b && basis(k) === b && VORMEN.test(k));
      const nodig = meervoud ? vormen.map((v) => `${b}_${v}`) : [b];
      for (const k of nodig) {
        const v = pakket[k];
        assert.ok(typeof v === 'string' && v.trim() !== '', `${id}: ${k} ontbreekt of is leeg`);
        const bron = en[k] ?? en[`${b}_other`];
        const wil = placeholders(bron).split(',').filter(Boolean), heeft = placeholders(v).split(',').filter(Boolean);
        for (const p of new Set(wil)) if (p !== 'n' || !meervoud) assert.ok(heeft.includes(p), `${id}: {${p}} mist in ${k}`);
        for (const p of new Set(heeft)) assert.ok(wil.includes(p), `${id}: onbekende plaatshouder {${p}} in ${k}`);
        if (meervoud && meervoudsdekking(id)[k.match(VORMEN)[1]] > 1) assert.ok(heeft.includes('n'), `${id}: ${k} moet {n} bevatten`);
        assert.ok(!/[<>]/.test(v) || /^</.test(bron) || /[<>]/.test(bron), `${id}: ${k} bevat HTML-tekens`);
      }
    }
    for (const k of Object.keys(pakket)) assert.ok(basisSleutels.has(basis(k)), `${id}: onbekende sleutel ${k}`);
  }
});

test('taalpakketten: links in de hulp staan er in elke taal precies zo in', async () => {
  const en = (await import('../js/i18n/talen/en.js')).default;
  const links = (s) => [...s.matchAll(/\]\((#\/[^)]*)\)/g)].map((m) => m[1]).join(' ');
  for (const id of TAAL_IDS) {
    if (!existsSync(pad(`js/i18n/talen/${id}.js`))) continue;
    const pakket = (await import(`../js/i18n/talen/${id}.js`)).default;
    for (const [k, v] of Object.entries(en)) if (v.includes('](#/')) assert.equal(links(pakket[k]), links(v), `${id}: de link in ${k} is veranderd`);
  }
});

test('elke taal die klaar is heeft alles wat nodig is (dit is de poort voor de oplevering)', () => {
  const ontbreekt = [];
  for (const id of KLAAR) {
    for (const [wat, p] of [['teksten', `js/i18n/talen/${id}.js`], ['woordtuin', `js/games/woordtuin/talen/${id}.js`], ['woordzoeker', `js/games/woordzoeker/talen/${id}.js`], ['kruiswoord', `js/games/kruiswoord/talen/${id}.js`]]) {
      if (!existsSync(pad(p))) ontbreekt.push(`${id}: ${wat}`);
    }
  }
  assert.deepEqual(ontbreekt, [], `er ontbreekt nog: ${ontbreekt.join(', ')}`);
  const schaal = readFileSync(pad('js/games/woordtuin/schaal.js'), 'utf8');
  for (const id of KLAAR) assert.match(schaal, new RegExp(`"${id}":`), `schaal.js mist ${id}: draai tools/woordenlijst/kalibreer.mjs`);
});
