// Kruiswoordpuzzel: het scherm. De puzzels komen uit engine.js.
//
// Bediening, zodat het voor iedereen werkt:
//   - Tik op een vakje. De omschrijving staat bovenaan het rooster. Tik nog eens op hetzelfde vakje
//     om tussen horizontaal en verticaal te wisselen.
//   - Typ met het grote toetsenbord onder het rooster, of met je eigen toetsenbord.
//   - Is een woord vol, dan zie je meteen of het klopt: een goed woord licht op en wordt beloond,
//     een fout woord schudt even. Fouten kosten niets.
//   - "Tip" laat één letter zien, "Woord" het hele woord.

import { h, icon } from '../../ui.js';
import { generate, cellsOf } from './engine.js';
import { burst, rain, motionOK } from '../../effects.js';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function validState(s) {
  return s && s.puzzle && Array.isArray(s.puzzle.grid) && Array.isArray(s.letters) && s.letters.length === s.puzzle.rows * s.puzzle.cols;
}

export function mount(container, ctx) {
  const state = validState(ctx.saved) ? ctx.saved : (() => {
    const puzzle = generate(ctx.seed, ctx.difficulty);
    return { puzzle, letters: new Array(puzzle.rows * puzzle.cols).fill(''), locked: [], sel: null };
  })();
  const { puzzle, letters } = state;
  const R = puzzle.rows, C = puzzle.cols;
  const idx = (r, c) => r * C + c;
  const isCell = (r, c) => r >= 0 && c >= 0 && r < R && c < C && puzzle.grid[r][c] !== '.';
  const answerAt = (r, c) => puzzle.grid[r][c];
  const locked = new Set(state.locked);
  const total = puzzle.grid.join('').replace(/\./g, '').length;

  // welk woord hoort bij welk vakje, in beide richtingen
  const wordOf = Array.from({ length: R * C }, () => ({ across: -1, down: -1 }));
  puzzle.entries.forEach((e, i) => cellsOf(e).forEach(([r, c]) => { wordOf[idx(r, c)][e.dir] = i; }));
  const numberAt = new Map(puzzle.entries.map((e) => [idx(e.r, e.c), e.n]));
  const done = new Set();                       // indexen van woorden die kloppen

  let sel = state.sel && isCell(state.sel.r, state.sel.c) ? { ...state.sel } : null;
  let finished = false;
  let flash = new Map();                        // vakje -> 'wave' | 'nope' met vertraging

  const entryOf = (s = sel) => (s ? puzzle.entries[wordOf[idx(s.r, s.c)][s.dir]] : null);
  const complete = (e) => cellsOf(e).every(([r, c]) => letters[idx(r, c)] === answerAt(r, c));
  const filled = (e) => cellsOf(e).every(([r, c]) => letters[idx(r, c)]);

  // ----- Opbouw -----
  const cells = [];
  const board = h('div', { class: 'kw-board', role: 'grid', 'aria-label': `Kruiswoordpuzzel, ${R} rijen en ${C} kolommen`, style: `--cols:${C};--rows:${R}` });
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (!isCell(r, c)) { board.append(h('div', { class: 'kw-block', 'aria-hidden': 'true' })); cells.push(null); continue; }
      const n = numberAt.get(idx(r, c));
      const cell = h('div', { class: 'kw-cell', role: 'gridcell', 'data-r': r, 'data-c': c, tabindex: '-1', onclick: () => tapCell(r, c) },
        n ? h('span', { class: 'kw-n' }, String(n)) : null, h('span', { class: 'kw-l' }));
      cells.push(cell); board.append(cell);
    }
  }

  const barText = h('span', { class: 'kw-count' });
  const bar = h('i', {});
  const progressBar = h('div', { class: 'ws-bar kw-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(puzzle.entries.length) }, bar);

  const clueNum = h('span', { class: 'kw-num' });
  const clueText = h('span', { class: 'kw-text' });
  const clueLen = h('span', { class: 'kw-len' });
  const prev = h('button', { type: 'button', class: 'btn kw-step', 'aria-label': 'Vorige omschrijving', onclick: () => stepClue(-1) }, icon('back'));
  const next = h('button', { type: 'button', class: 'btn kw-step', 'aria-label': 'Volgende omschrijving', onclick: () => stepClue(1) }, icon('chevron'));
  const clueBar = h('div', { class: 'kw-clue', role: 'group', 'aria-label': 'Omschrijving' },
    prev, h('div', { class: 'kw-clue-body', 'aria-live': 'polite' }, h('div', { class: 'kw-clue-head' }, clueNum, clueLen), clueText), next);

  const message = h('p', { class: 'kw-message', role: 'status', 'aria-live': 'polite' }, 'Tik op een vakje om te beginnen.');

  const keyBtn = (ch) => h('button', { type: 'button', class: 'kw-key', 'aria-label': ch, onclick: () => typeLetter(ch) }, ch);
  const back = h('button', { type: 'button', class: 'kw-key kw-back', 'aria-label': 'Terug en wis de letter', onclick: backspace }, icon('backspace'));
  const keys = h('div', { class: 'kw-keys', role: 'group', 'aria-label': 'Toetsenbord' },
    ROWS.map((row, i) => h('div', { class: `kw-row r${i}` }, [...row].map(keyBtn), i === 2 ? back : null)));

  const tipLetter = h('button', { type: 'button', class: 'btn action-btn', onclick: revealLetter }, icon('bulb'), h('span', { class: 'action-label' }, 'Tip'));
  const tipWord = h('button', { type: 'button', class: 'btn action-btn', onclick: revealWord }, icon('eye'), h('span', { class: 'action-label' }, 'Woord'));
  const actions = h('div', { class: 'kw-actions' }, tipLetter, tipWord);

  const listBtns = [];
  const section = (title, dir) => h('div', { class: 'kw-listcol' }, h('h3', {}, title),
    h('ul', {}, puzzle.entries.map((e, i) => {
      if (e.dir !== dir) return null;
      const b = h('button', { type: 'button', class: 'kw-item', onclick: () => selectEntry(i) },
        h('span', { class: 'n' }, String(e.n)), h('span', { class: 'c' }, e.clue), h('span', { class: 'l' }, `(${e.answer.length})`));
      listBtns[i] = b;
      return h('li', {}, b);
    })));
  const list = h('details', { class: 'disclosure kw-list' }, h('summary', {}, 'Alle omschrijvingen'),
    h('div', { class: 'disclosure-body kw-lists' }, section('Horizontaal', 'across'), section('Verticaal', 'down')));
  list.open = window.matchMedia('(min-width: 62rem)').matches;


  // Omschrijving bovenaan en toetsenbord onderaan blijven staan terwijl je door het rooster scrolt
  const root = h('div', { class: 'kw' },
    h('div', { class: 'kw-main' }, h('div', { class: 'kw-top' }, h('div', { class: 'kw-progress' }, progressBar, barText), clueBar, message), h('div', { class: 'kw-board-wrap' }, board)),
    h('div', { class: 'kw-dock' }, actions, keys),
    list);

  container.classList.add('stage--bare');
  container.append(root);

  // ----- Weergave -----
  const say = (t) => { message.textContent = t; };
  const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  function render() {
    const e = entryOf();
    const inWord = new Set(e ? cellsOf(e).map(([r, c]) => idx(r, c)) : []);
    cells.forEach((cell, i) => {
      if (!cell) return;
      const r = Math.floor(i / C), c = i % C, ch = letters[i];
      const isSel = !!sel && sel.r === r && sel.c === c;
      const doneCell = [wordOf[i].across, wordOf[i].down].some((k) => k >= 0 && done.has(k));
      const f = flash.get(i);
      cell.className = ['kw-cell', isSel && 'sel', !isSel && inWord.has(i) && 'word', doneCell && 'done', locked.has(i) && 'locked', f && f.kind, ch && 'has'].filter(Boolean).join(' ');
      if (f) cell.style.setProperty('--wd', `${f.delay}ms`); else cell.style.removeProperty('--wd');
      cell.tabIndex = isSel ? 0 : -1;
      cell.setAttribute('aria-selected', String(isSel));
      cell.querySelector('.kw-l').textContent = ch;
      const nums = [wordOf[i].across >= 0 && `${puzzle.entries[wordOf[i].across].n} horizontaal`, wordOf[i].down >= 0 && `${puzzle.entries[wordOf[i].down].n} verticaal`].filter(Boolean).join(', ');
      cell.setAttribute('aria-label', `Rij ${r + 1}, kolom ${c + 1}: ${ch ? `letter ${ch}` : 'leeg'}. ${nums}`);
    });

    if (e) {
      clueNum.textContent = `${e.n} ${e.dir === 'across' ? 'horizontaal →' : 'verticaal ↓'}`;
      clueText.textContent = e.clue;
      clueLen.textContent = `${e.answer.length} letters`;
    } else {
      clueNum.textContent = 'Kies een vakje';
      clueText.textContent = 'Tik op het rooster. De omschrijving verschijnt hier.';
      clueLen.textContent = '';
    }
    puzzle.entries.forEach((en, i) => {
      const b = listBtns[i];
      b.classList.toggle('done', done.has(i));
      b.classList.toggle('current', !!e && e === en);
    });
    bar.style.width = `${(done.size / puzzle.entries.length) * 100}%`;
    barText.textContent = `${done.size} van ${puzzle.entries.length} klaar`;
    progressBar.setAttribute('aria-valuenow', String(done.size));
    progressBar.setAttribute('aria-valuetext', `${done.size} van ${puzzle.entries.length} woorden klaar`);
    keys.classList.toggle('off', finished);
    tipLetter.disabled = tipWord.disabled = finished || !sel;
  }

  // ----- Kiezen en verplaatsen -----
  function selectCell(r, c, dir) {
    const w = wordOf[idx(r, c)];
    const d = w[dir] >= 0 ? dir : dir === 'across' ? 'down' : 'across';
    sel = { r, c, dir: d };
    state.sel = sel;
    render();
    cells[idx(r, c)].scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  function tapCell(r, c) {
    if (finished) return;
    const w = wordOf[idx(r, c)];
    if (sel && sel.r === r && sel.c === c) {                         // nog eens tikken: andere richting
      const other = sel.dir === 'across' ? 'down' : 'across';
      if (w[other] >= 0) { selectCell(r, c, other); return; }
    }
    selectCell(r, c, sel?.dir || 'across');
  }

  function firstOpen(e) {
    return cellsOf(e).find(([r, c]) => !letters[idx(r, c)]) || cellsOf(e)[0];
  }

  function selectEntry(i) {
    if (finished) return;
    const e = puzzle.entries[i];
    const [r, c] = firstOpen(e);
    sel = { r, c, dir: e.dir };
    state.sel = sel;
    render();
    say(`${e.n} ${e.dir === 'across' ? 'horizontaal' : 'verticaal'}: ${e.clue} (${e.answer.length} letters).`);
  }

  function stepClue(delta) {
    if (finished) return;
    const cur = entryOf();
    const i = cur ? puzzle.entries.indexOf(cur) : -1;
    const n = puzzle.entries.length;
    for (let k = 1; k <= n; k++) {                                   // sla klare woorden over
      const j = (((i + delta * k) % n) + n) % n;
      if (!done.has(j) || k === n) { selectEntry(j); return; }
    }
  }

  function arrow(dr, dc) {
    if (!sel) { const first = puzzle.entries[0]; selectEntry(0); return first; }
    let r = sel.r + dr, c = sel.c + dc;
    while (r >= 0 && c >= 0 && r < R && c < C && !isCell(r, c)) { r += dr; c += dc; }   // blokjes overslaan
    if (!isCell(r, c)) return;
    selectCell(r, c, dr !== 0 ? 'down' : 'across');
  }

  // ----- Typen -----
  function save() { state.locked = [...locked]; ctx.save(state, { progress: letters.filter((l, i) => l && l === answerAt(Math.floor(i / C), i % C)).length / total }); }

  function typeLetter(ch) {
    if (finished || !sel) { if (!sel && !finished) say('Tik eerst op een vakje.'); return; }
    const i = idx(sel.r, sel.c);
    if (!locked.has(i)) letters[i] = ch;
    const typed = { r: sel.r, c: sel.c };
    advance();
    afterEdit(typed);
  }

  // Naar het volgende vakje van het woord dat nog leeg is: ingevulde letters sla je over. Is er daarna niets leeg, dan
  // het eerste lege vakje eerder in het woord; is het woord vol, dan gewoon een vakje verder (zonder vaste letters).
  function advance() {
    const e = entryOf();
    if (!e) return;
    const cl = cellsOf(e);
    const at = cl.findIndex(([r, c]) => r === sel.r && c === sel.c);
    const empty = (k) => !letters[idx(...cl[k])];
    const free = (k) => !locked.has(idx(...cl[k]));
    let to = -1;
    for (let k = at + 1; k < cl.length && to < 0; k++) if (empty(k)) to = k;
    for (let k = 0; k < at && to < 0; k++) if (empty(k)) to = k;
    for (let k = at + 1; k < cl.length && to < 0; k++) if (free(k)) to = k;
    if (to < 0) return;
    sel = { ...sel, r: cl[to][0], c: cl[to][1] };
    state.sel = sel;
  }

  // Terug: eerst de letter in dit vakje wissen, en is die al leeg (of vast), dan naar het vorige vakje dat je kunt wissen.
  function backspace() {
    if (finished || !sel) return;
    const i = idx(sel.r, sel.c);
    if (letters[i] && !locked.has(i)) letters[i] = '';
    else {
      const e = entryOf();
      const cl = e ? cellsOf(e) : [];
      const at = cl.findIndex(([r, c]) => r === sel.r && c === sel.c);
      for (let k = at - 1; k >= 0; k--) {
        const j = idx(...cl[k]);
        if (locked.has(j)) continue;
        sel = { ...sel, r: cl[k][0], c: cl[k][1] }; state.sel = sel;
        letters[j] = '';
        break;
      }
    }
    afterEdit(null);
  }

  // Na elke wijziging: bewaren, en kijken of een woord klaar is
  function afterEdit(typed) {
    // woorden die niet meer kloppen verliezen hun "klaar"
    [...done].forEach((i) => { if (!complete(puzzle.entries[i])) done.delete(i); });
    save();
    render();
    if (typed) checkWordsAt(typed.r, typed.c);
    if (finished) return;
    if (puzzle.entries.every((e) => complete(e))) win();
  }

  function checkWordsAt(r, c) {
    const w = wordOf[idx(r, c)];
    for (const k of [w.across, w.down]) {
      if (k < 0) continue;
      const e = puzzle.entries[k];
      if (!filled(e)) continue;
      if (complete(e)) {
        if (!done.has(k)) { done.add(k); celebrateWord(e); }
      } else {
        shake(e);
      }
    }
  }

  function celebrateWord(e) {
    const cl = cellsOf(e);
    cl.forEach(([r, c], n) => flash.set(idx(r, c), { kind: 'wave', delay: n * 70 }));
    clearFlash(1100);
    const [x, y] = center(cells[idx(...cl[cl.length - 1])]);
    burst({ x, y, count: 8, power: 180, cone: [-170, -10], size: [10, 17], life: [1000, 1400] });
    const left = puzzle.entries.length - done.size;
    say(left ? `Goed! ${e.answer} klopt. Nog ${left} te gaan.` : '');
    render();
    // door naar het volgende woord dat nog niet klaar is
    if (left) setTimeout(() => { if (!finished && entryOf() === e) stepClue(1); }, 650);
  }

  function shake(e) {
    cellsOf(e).forEach(([r, c], n) => flash.set(idx(r, c), { kind: 'nope', delay: n * 40 }));
    clearFlash(800);
    say('Dit woord klopt nog niet. Lees de omschrijving nog eens, je kunt niets verkeerd doen.');
    render();
  }

  let flashTimer;
  function clearFlash(ms) { clearTimeout(flashTimer); flashTimer = setTimeout(() => { flash = new Map(); render(); }, ms); }

  // ----- Tips -----
  function reveal(r, c) {
    const i = idx(r, c);
    letters[i] = answerAt(r, c);
    locked.add(i);
  }

  function revealLetter() {
    if (finished || !sel) return;
    const i = idx(sel.r, sel.c);
    if (letters[i] === answerAt(sel.r, sel.c) && locked.has(i)) { say('Dit vakje is al onthuld.'); return; }
    reveal(sel.r, sel.c);
    say(`Tip: in dit vakje staat een ${answerAt(sel.r, sel.c)}.`);
    const at = { r: sel.r, c: sel.c };
    advance();
    afterEdit(at);
  }

  function revealWord() {
    const e = entryOf();
    if (finished || !e) return;
    cellsOf(e).forEach(([r, c]) => reveal(r, c));
    say(`Het woord was ${e.answer}.`);
    const [r, c] = cellsOf(e)[0];
    afterEdit({ r, c });
  }

  // ----- Winnen -----
  async function win() {
    finished = true;
    say('Gelukt! Je hebt de hele puzzel opgelost.');
    render();
    if (motionOK()) {
      root.classList.add('won');
      cells.forEach((cell, i) => { if (cell) flash.set(i, { kind: 'wave', delay: (Math.floor(i / C) + (i % C)) * 55 }); });
      render(); clearFlash(1800);
      const [x, y] = center(board);
      burst({ x, y, count: 26, power: 420, cone: [-170, -10], size: [14, 26], life: [1500, 2300] });
      rain({ count: 40 });
    }
    ctx.complete({ difficulty: ctx.difficulty, delay: motionOK() ? 1500 : 0 });
  }

  // ----- Toetsenbord van de gebruiker -----
  function onKey(e) {
    if (document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[a-zA-Z]$/.test(e.key)) { typeLetter(e.key.toUpperCase()); e.preventDefault(); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { backspace(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { arrow(0, -1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { arrow(0, 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { arrow(-1, 0); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { arrow(1, 0); e.preventDefault(); }
    else if (e.key === 'Tab' && sel) { stepClue(e.shiftKey ? -1 : 1); e.preventDefault(); }
    else if ((e.key === 'Enter' || e.key === ' ') && sel && document.activeElement?.closest?.('.kw-board')) { tapCell(sel.r, sel.c); e.preventDefault(); }
  }
  document.addEventListener('keydown', onKey);

  // Woorden die al klaar waren (bij verder spelen) opnieuw meetellen
  puzzle.entries.forEach((e, i) => { if (complete(e)) done.add(i); });
  if (!sel) {                                   // begin bij het eerste woord dat nog niet klaar is
    const k = puzzle.entries.findIndex((en, j) => !done.has(j));
    const e0 = puzzle.entries[k >= 0 ? k : 0];
    const [r, c] = firstOpen(e0);
    sel = { r, c, dir: e0.dir }; state.sel = sel;
  }
  render();
  if (!ctx.saved) save();
  if (puzzle.entries.every((e) => complete(e))) { finished = true; render(); ctx.complete({ difficulty: ctx.difficulty }); }

  return () => { document.removeEventListener('keydown', onKey); clearTimeout(flashTimer); };
}
