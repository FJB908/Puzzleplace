// De woordenlijsten van Letterhof (js/games/letterhof/talen/<taal>.js, gemaakt door tools/scrabble/): grootte, tweeletterwoorden, wat er wel en niet in hoort te staan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { laadWoordenboek, ALFABET, TALEN } from '../js/games/letterhof/woordenboek.js';

const GROOTTE = { nl: [250e3, 350e3], en: [150e3, 200e3], de: [220e3, 320e3], fr: [350e3, 450e3], es: [400e3, 600e3], it: [150e3, 260e3], pt: [120e3, 220e3], pl: [380e3, 520e3] };
// woorden die erin horen (zoals op de stenen: kleine letters, accenten weg behalve de eigen letters van de taal) en die er niet in horen (afkortingen, namen, vreemde woorden)
const ERIN = {
  nl: ['huis', 'water', 'kinderen', 'fiets', 'gezellig', 'boterham', 'tafel', 'aanbod', 'jazz'],
  en: ['house', 'water', 'quiz', 'zebra', 'jazz', 'email', 'colour', 'color'],
  de: ['haus', 'häuser', 'schön', 'wochenende', 'krankenhaus', 'strasse', 'äh'],
  fr: ['maison', 'chat', 'ete', 'coeur', 'bon'],
  es: ['casa', 'niño', 'español', 'cantabamos'],
  it: ['casa', 'ciao', 'mangiare', 'perche', 'citta'],
  pt: ['casa', 'açao', 'irma', 'cao', 'esporte', 'mamae'],
  pl: ['dom', 'łódź', 'kot', 'zagrał', 'słowo', 'słońce', 'że'],
};
const ERNIET = {
  nl: ['mbo', 'vwo', 'berlijn', 'xyz'],
  en: ['xyz', 'nigger'],
  de: ['berlin', 'zitterns'],
  fr: ['kcal', 'avr'],
  es: ['hazlo', 'dametelo'],
  it: ['assumigliele', 'jazz', 'taxi'],
  pt: ['wifi'],
  pl: ['kg', 'http', 'adidas'],
};

for (const taal of TALEN) {
  test(`lijst ${taal}: grootte, woorden die erin horen en niet`, async () => {
    const wb = await laadWoordenboek(taal);
    const [min, max] = GROOTTE[taal];
    assert.ok(wb.aantal >= min && wb.aantal <= max, `${taal}: ${wb.aantal} woorden`);
    for (const w of ERIN[taal]) assert.ok(wb.heeft(w), `${taal}: "${w}" hoort erin`);
    for (const w of ERNIET[taal]) assert.ok(!wb.heeft(w), `${taal}: "${w}" hoort er niet in`);
  });

  test(`lijst ${taal}: de tweeletterwoorden zijn precies die van kort.txt`, async () => {
    const wb = await laadWoordenboek(taal);
    const tekst = readFileSync(new URL(`../tools/scrabble/lijst/${taal}/kort.txt`, import.meta.url), 'utf8');
    const kort = new Set(tekst.split('\n').filter((r) => !r.startsWith('#')).join(' ').split(/\s+/).filter(Boolean).map((w) => [...w.toLowerCase()].map((c) => (ALFABET[taal].includes(c) ? c : c.normalize('NFD').replace(/\p{Mn}/gu, '').replace('ß', 'ss'))).join('')));
    const hier = new Set();
    for (const a of ALFABET[taal]) for (const b of ALFABET[taal]) if (wb.heeft(a + b)) hier.add(a + b);
    const ontbreekt = [...kort].filter((w) => [...w].every((c) => ALFABET[taal].includes(c)) && !hier.has(w));
    const teveel = [...hier].filter((w) => !kort.has(w));
    assert.deepEqual(teveel, [], `${taal}: tweeletterwoorden die niet in kort.txt staan`);
    assert.deepEqual(ontbreekt, [], `${taal}: tweeletterwoorden uit kort.txt die ontbreken`);
  });

  test(`lijst ${taal}: de lagen kloppen (kern en gangbaar zijn een kleine kern, grove woorden zijn grof)`, async () => {
    const wb = await laadWoordenboek(taal);
    let kern = 0, gangbaar = 0, ruw = 0, totaal = 0;
    for (let k = 1; k < wb.vlag.length; k++) if (wb.isEind(k)) { totaal++; const l = wb.laag(k); if (l === 2) kern++; else if (l === 1) gangbaar++; if (wb.isRuw(k)) ruw++; }
    assert.equal(totaal, wb.aantal);
    assert.ok(kern > 8000 && kern < 30000, `${taal}: ${kern} kernwoorden`);
    assert.ok(gangbaar > 15000 && gangbaar < 70000, `${taal}: ${gangbaar} gangbare woorden`);
    assert.ok(ruw >= 20 && ruw <= 200, `${taal}: ${ruw} grove woorden`);
  });
}
