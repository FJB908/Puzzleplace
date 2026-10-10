import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WOORDEN, ALLEDAAGS } from '../js/games/woordtuin/woorden.js';
import {
  SIZE, newGame, makeBoard, checkMove, applyMove, legalMoves, hasMove, isProtected, counts, result, pathsFor, botMove, tip,
  geefDoor, isWord, MoveError, makeRng, NIVEAUS,
} from '../js/games/woordtuin/engine.js';

// Een klein bord waar we de woorden van kennen:  roos / kat / hond liggen op rij 0, 1 en 2
const LETTERS = 'roosbq' + 'katzzz' + 'hondxx' + 'zzzzzz'.repeat(3);
const bord = (owner = new Array(36).fill(0), extra = {}) => ({ size: 6, letters: LETTERS, owner, played: [], turn: 1, over: false, passed: false, last: null, ...extra });
const code = (fn) => { try { fn(); } catch (e) { return e instanceof MoveError ? e.code : `fout:${e.message}`; } return null; };

test('woordenlijst: gewoon Nederlands, ruim genoeg, en geen rommel', () => {
  assert.ok(WOORDEN.length > 12000 && WOORDEN.length < 25000, `aantal: ${WOORDEN.length}`);
  assert.equal(new Set(WOORDEN).size, WOORDEN.length, 'geen dubbele woorden');
  for (const w of WOORDEN) assert.match(w, /^[a-z]{3,7}$/, w);
  // Gewone woorden in alle vormen: stam, werkwoordsvorm, verleden tijd, deelwoord, meervoud, verkleinwoord, buiging
  const moet = ['hoer', 'zeg', 'zegt', 'zeggen', 'zei', 'doorn', 'hoes', 'moed', 'hoor', 'hoort', 'smit', 'smid', 'zegen', 'liep', 'lopen', 'gelopen', 'dacht',
    'gebouwd', 'rozen', 'roos', 'katten', 'kat', 'koeien', 'huizen', 'huisje', 'bokje', 'sterke', 'sterk', 'mooie', 'mooi', 'goed', 'beter', 'best', 'stoel', 'tafel',
    'fiets', 'koffie', 'vriend', 'familie', 'zomer', 'water', 'jas', 'dak', 'ijs', 'tuin', 'tuinen', 'bloemen', 'mensen', 'vrouwen', 'mannen', 'geloof', 'hoeden', 'woon',
    'weet', 'zit', 'zat', 'ben', 'bent', 'heb', 'hebt', 'wonen', 'werkt', 'loopt', 'blijft', 'vraagt', 'schudde', 'game', 'box', 'data', 'bad', 'bij', 'ook', 'nee', 'ja'];
  for (const w of moet.filter((x) => x.length >= 3)) assert.ok(isWord(w), `${w} hoort erin`);
  // Geen namen, Engelse woorden, onzin of beledigingen
  const weg = ['neger', 'nikker', 'mongool', 'amanda', 'rachel', 'choice', 'airport', 'device', 'mayor', 'naoogde', 'vimmen', 'ropij', 'tuftuf', 'joe', 'jan', 'kees',
    'small', 'battle', 'ecg', 'tbc', 'aids', 'wow', 'brr', 'the', 'with', 'love'];
  for (const w of weg) assert.ok(!isWord(w), `${w} hoort er niet in`);
});

test('woordenlijst: de computer speelt alleen alledaagse, nette woorden', () => {
  assert.ok(ALLEDAAGS.size > 4000, `alledaags: ${ALLEDAAGS.size}`);
  for (const w of ALLEDAAGS) assert.ok(isWord(w), `${w} is alledaags maar telt niet mee`);
  for (const w of ['zeg', 'zegt', 'hoor', 'moed', 'doorn', 'tuin', 'bloemen', 'lopen', 'liep', 'water', 'kat', 'katten', 'huis']) assert.ok(ALLEDAAGS.has(w), `${w} is alledaags`);
  // Grove woorden tellen mee als een speler ze speelt, maar de computer speelt ze nooit en ze komen niet in een tip
  for (const w of ['hoer', 'kut', 'lul', 'kloot', 'neuken', 'pik', 'penis', 'poep', 'slet']) { assert.ok(isWord(w), `${w} telt mee`); assert.ok(!ALLEDAAGS.has(w), `${w} is niet alledaags`); }
  // Zeldzame woorden evenmin
  for (const w of ['hoes', 'smit']) assert.ok(isWord(w));
});

test('bord: zelfde zaad is zelfde bord, en het is speelbaar', () => {
  assert.equal(makeBoard('abc'), makeBoard('abc'));
  assert.notEqual(makeBoard('abc'), makeBoard('abd'));
  for (let i = 0; i < 12; i++) {
    const g = newGame('q' + i);
    assert.equal(g.letters.length, SIZE * SIZE);
    assert.match(g.letters, /^[a-z]+$/);
    assert.ok(legalMoves(g, 1, false, true).length >= 100, 'genoeg alledaagse woorden op het bord');
    assert.ok(legalMoves(g, 1).length >= legalMoves(g, 1, false, true).length, 'alles wat de computer speelt telt ook mee');
    const klinkers = [...g.letters].filter((c) => 'aeiou'.includes(c)).length;
    assert.ok(klinkers >= 10 && klinkers <= 18, `klinkers ${klinkers}`);
  }
});

test('zet controleren: foutmeldingen in gewone taal', () => {
  const g = bord();
  assert.equal(code(() => checkMove(g, 2, [0, 1, 2, 3])), 'beurt');
  assert.equal(code(() => checkMove(g, 1, [0, 1])), 'lengte');
  assert.equal(code(() => checkMove(g, 1, [0, 1, 2, 3, 4, 5, 11, 10])), 'lengte');
  assert.equal(code(() => checkMove(g, 1, [0, 2, 3])), 'pad', 'niet aaneengesloten');
  assert.equal(code(() => checkMove(g, 1, [0, 1, 0])), 'pad', 'dubbel gebruikt');
  assert.equal(code(() => checkMove(g, 1, [0, 1, 99])), 'pad');
  assert.equal(code(() => checkMove(g, 1, [0, 1, 'x'])), 'pad');
  assert.equal(code(() => checkMove(g, 1, [3, 4, 5])), 'onbekend', 'sbq is geen woord');
  assert.equal(code(() => checkMove(g, 1, [0, 1, 2, 3])), null, 'roos mag');
  assert.equal(code(() => checkMove(bord(undefined, { played: ['roos'] }), 1, [0, 1, 2, 3])), 'gespeeld');
  const vol = new Array(36).fill(1);
  assert.equal(code(() => checkMove(bord(vol), 1, [0, 1, 2, 3])), 'open', 'elk woord moet een open vakje kleuren');
  assert.equal(code(() => checkMove(bord(undefined, { over: true }), 1, [0, 1, 2, 3])), 'klaar');
});

test('beschermen: een vakje met alleen eigen buren kan niet worden afgepakt', () => {
  // Speler 2 heeft de hoek (0, 1, 6, 7) en dus is vakje 0 beschermd (buren 1 en 6), vakje 1 niet (buur 2 is open)
  const owner = new Array(36).fill(0); [0, 1, 6, 7].forEach((i) => { owner[i] = 2; });
  assert.ok(isProtected(owner, 0)); assert.ok(!isProtected(owner, 1)); assert.ok(!isProtected(owner, 7));
  // Een vakje midden op het bord is pas beschermd met vier buren
  const mid = new Array(36).fill(2); assert.ok(isProtected(mid, 14)); mid[15] = 1; assert.ok(!isProtected(mid, 14)); assert.ok(isProtected(mid, 0));
  // "roos" over de vakjes 0..3: o (1) is van 2 en niet beschermd => wordt gepakt; r (0) is beschermd => blijft
  const c = checkMove(bord(owner), 1, [0, 1, 2, 3]);
  assert.deepEqual(c.kept, [0]); assert.deepEqual(c.took, [1]); assert.deepEqual(c.fresh, [2, 3]);
  const na = applyMove(bord(owner), 1, [0, 1, 2, 3]);
  assert.deepEqual(na.owner.slice(0, 4), [2, 1, 1, 1]);
  assert.deepEqual(na.last, { player: 1, word: 'roos', path: [0, 1, 2, 3], took: [1], fresh: [2, 3] });
});

test('zet uitvoeren: beurt wisselt, woord telt als gespeeld, oude toestand blijft heel', () => {
  const g = bord();
  const na = applyMove(g, 1, [6, 7, 8]);                         // kat
  assert.deepEqual(counts(na), { 0: 33, 1: 3, 2: 0 });
  assert.equal(na.turn, 2); assert.deepEqual(na.played, ['kat']);
  assert.deepEqual(counts(g), { 0: 36, 1: 0, 2: 0 }); assert.equal(g.turn, 1);
  assert.equal(code(() => checkMove(na, 2, [6, 7, 8])), 'gespeeld');
  assert.equal(code(() => applyMove(na, 1, [12, 13, 14, 15])), 'beurt');
});

test('typen: waar ligt een woord op het bord?', () => {
  const g = bord();
  assert.deepEqual(pathsFor(g, 1, 'roos'), [[0, 1, 2, 3]]);
  assert.deepEqual(pathsFor(g, 1, 'kat'), [[6, 7, 8]]);
  assert.deepEqual(pathsFor(g, 1, 'olifant'), []);
  assert.deepEqual(pathsFor(g, 1, 'ha'), []);
});

test('einde: alles gekleurd, uitslag en beschermde vakjes bij gelijk', () => {
  // 18 - 18, in twee helften: allebei hetzelfde aantal beschermde vakjes -> gelijkspel
  const half = [...new Array(18).fill(1), ...new Array(18).fill(2)];
  assert.deepEqual(result(bord(half)).scores, { 1: 18, 2: 18 });
  assert.equal(result(bord(half)).winner, 0);
  const meer = [...new Array(19).fill(1), ...new Array(17).fill(2)];
  assert.equal(result(bord(meer)).winner, 1);
  // gelijk aantal, maar speler 2 heeft meer beschermde vakjes (rijen 0-2 voor 1 in strepen, 2 in blokken)
  const o = new Array(36).fill(0);
  for (let i = 0; i < 36; i++) o[i] = (i % 6) % 2 === 0 ? 1 : 2;      // kolomstrepen: elk vakje heeft buren van de andere kleur => niets beschermd
  assert.equal(result(bord(o)).tiebreak, false);
  const blok = new Array(36).fill(0); for (let i = 0; i < 36; i++) blok[i] = i < 18 ? 2 : 1; blok[17] = 1; blok[18] = 2;   // 18 - 18, verschillende randen
  const r = result(bord(blok));
  assert.equal(r.scores[1] + r.scores[2], 36);
});

test('een hele partij: bots spelen tot het einde, de beurt wisselt, niets gaat mis', () => {
  for (const [seed, a, b] of [['p1', 'extreem', 'gemiddeld'], ['p2', 'makkelijk', 'makkelijk'], ['p3', 'moeilijk', 'extreem'], ['p4', 'gemiddeld', 'makkelijk']]) {
    let s = newGame(seed, { first: 1 }); const rng = makeRng('rng' + seed); let n = 0, last = 0;
    while (!s.over) {
      assert.ok(n++ < 80, 'partij duurt te lang');
      const m = botMove(s, s.turn, s.turn === 1 ? a : b, rng);
      const was = s.turn;
      // Heeft de computer alleen nog zeldzame woorden (die hij niet speelt), dan neemt een mens het over: hier het eerste woord dat mag
      const zet = m || legalMoves(s, was)[0];
      assert.ok(zet, 'wie aan de beurt is, heeft een zet (anders is het afgelopen)');
      s = applyMove(s, was, zet.path);
      if (!s.over && !s.passed) assert.notEqual(s.turn, was, 'beurt wisselt');
      last = was;
    }
    const c = counts(s), r = result(s);
    assert.equal(c[0] + c[1] + c[2], 36);
    assert.equal(r.scores[1] + r.scores[2] + r.open, 36);
    assert.ok(n >= 8 && n <= 50, `aantal zetten ${n}`);
    assert.equal(new Set(s.played).size, s.played.length, 'geen woord twee keer');
    assert.ok(s.turn === null && !hasMove(s, 1) || c[0] === 0, 'afgelopen betekent: alles gekleurd of niemand kan meer');
  }
});

test('de computer wordt sterker per niveau', () => {
  const speel = (seed, a, b) => {
    let s = newGame(seed, { first: 1 }); const rng = makeRng('t' + seed);
    while (!s.over) { const m = botMove(s, s.turn, s.turn === 1 ? a : b, rng) || legalMoves(s, s.turn)[0]; s = applyMove(s, s.turn, m.path); }
    return result(s).winner;
  };
  const tegen = (sterk, zwak, n = 10) => { let w = 0; for (let i = 0; i < n; i++) { const flip = i % 2; const win = speel('s' + i, flip ? zwak : sterk, flip ? sterk : zwak); if (win === (flip ? 2 : 1)) w++; } return w; };
  assert.ok(tegen('extreem', 'makkelijk') >= 8, 'extreem verslaat makkelijk');
  assert.ok(tegen('gemiddeld', 'makkelijk') >= 6, 'gemiddeld verslaat makkelijk meestal');
  assert.deepEqual(Object.keys(NIVEAUS), ['makkelijk', 'gemiddeld', 'moeilijk', 'extreem']);
});

test('tip: wijst een beginvakje en een lengte aan van een woord dat kan', () => {
  const g = newGame('tip1');
  const t = tip(g, 1, makeRng('x'));
  assert.ok(t.start >= 0 && t.start < 36 && t.length >= 3 && t.length <= 7);
  const kan = legalMoves(g, 1).some((m) => m.path[0] === t.start && m.path.length === t.length);
  assert.ok(kan, 'er bestaat een woord dat hier begint en zo lang is');
  assert.equal(tip({ ...g, owner: new Array(36).fill(1) }, 1), null);
});

test('balans: vooruitkijken wint van gretig spelen, en de beginner heeft geen groot voordeel', () => {
  // Kleine versie van de meting in docs/NIEUW-SPEL-VOOR-TWEE.md, om te voorkomen dat een regelwijziging het spel ongemerkt kapot maakt
  let slim = 0, gretig = 0, begon = 0, beslist = 0;
  for (let i = 0; i < 24; i++) {
    const flip = i % 2, rng = makeRng('bal' + i);
    let s = newGame('bal' + i, { first: 1 });
    while (!s.over) {
      const slimSlot = flip ? 2 : 1;
      const m = botMove(s, s.turn, s.turn === slimSlot ? 'extreem' : 'gemiddeld', rng) || legalMoves(s, s.turn)[0];
      s = applyMove(s, s.turn, m.path);
    }
    const r = result(s);
    if (r.winner === (flip ? 2 : 1)) slim++; else if (r.winner) gretig++;
    if (r.winner) { beslist++; if (r.winner === 1) begon++; }
  }
  assert.ok(slim > gretig * 2, `slim ${slim} gretig ${gretig}`);
  assert.ok(begon / beslist > 0.25 && begon / beslist < 0.75, `beginner won ${begon} van ${beslist}`);
});

test('de computer slaat over als hij alleen nog woorden heeft die hij niet speelt', () => {
  // Bijna alles gekleurd; de open vakjes vormen alleen een zeldzaam woord: de computer heeft dan geen alledaags woord
  let gevonden = 0;
  for (const w of WOORDEN.filter((x) => !ALLEDAAGS.has(x) && x.length >= 4 && x.length <= 6).slice(0, 400)) {
    const owner = new Array(36).fill(1).map((x, i) => (i < w.length ? 0 : x));
    const g = { size: 6, letters: w + 'q'.repeat(36 - w.length), owner, played: [], turn: 2, over: false, passed: false, last: null };
    if (botMove(g, 2, 'extreem', makeRng('x'))) continue;               // er zit toch een alledaags woord in
    gevonden++;
    assert.ok(legalMoves(g, 2).length > 0, 'een mens kan het zeldzame woord wel spelen');
    const door = geefDoor(g, 2);
    assert.ok(door.turn === 1 || door.over);
    if (gevonden >= 3) break;
  }
  assert.ok(gevonden >= 3);
});
