// Woordzoeker: het scherm. De puzzels komen uit engine.js.
//
// Bediening, zodat het voor iedereen werkt:
//   - Tik op de eerste letter en daarna op de laatste letter van een woord. De tweede tik hoeft niet
//     precies te zijn: de dichtstbijzijnde rechte lijn wordt gekozen.
//   - Met een muis kun je ook slepen.
//   - Toetsenbord: pijltjes, Enter of spatie voor begin en eind, Escape om opnieuw te kiezen.
// Fouten kosten niets. Elk gevonden woord wordt beloond met een markeerstift, een golf van licht,
// blaadjes en een bloesem die opengaat in de voortgangsbalk.

import { h, icon } from '../../ui.js';
import { generate, matchWord, snap, line, wordCells } from './engine.js';
import { burst, rain, motionOK } from '../../effects.js';

const COLORS = 6;        // de markeerstift wisselt tussen zes zachte kleuren

function validState(s) {
  return s && s.puzzle && Array.isArray(s.puzzle.grid) && Array.isArray(s.puzzle.words) && Array.isArray(s.found);
}

export function mount(container, ctx) {
  const state = validState(ctx.saved) ? ctx.saved : { puzzle: generate(ctx.seed, ctx.difficulty), found: [] };
  const { puzzle } = state;
  const N = puzzle.size;
  const total = puzzle.words.length;
  const found = new Set(state.found.map((f) => f.word));
  const byWord = new Map(puzzle.words.map((w) => [w.word, w]));

  let start = null;                 // eerste gekozen vakje { r, c }
  let cursor = { r: 0, c: 0 };      // voor het toetsenbord
  let finished = false;
  let drag = null;
  let lastDrag = 0;
  let hintTimer = null;

  // ----- Opbouw -----
  const cells = [];
  const svgNS = 'http://www.w3.org/2000/svg';
  const pills = document.createElementNS(svgNS, 'svg');
  pills.setAttribute('class', 'ws-pills');
  pills.setAttribute('viewBox', `0 0 ${N} ${N}`);
  pills.setAttribute('aria-hidden', 'true');

  const board = h('div', {
    class: 'ws-board', role: 'grid', 'aria-label': `Woordzoeker, ${N} bij ${N} letters`,
    style: `--n:${N}`, onkeydown: onKey,
  }, pills);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = h('div', { class: 'ws-cell', role: 'gridcell', 'data-r': r, 'data-c': c, tabindex: '-1' }, h('span', { class: 'ws-l' }, puzzle.grid[r][c]));
      cells.push(cell);
      board.append(cell);
    }
  }

  const message = h('p', { class: 'ws-message', role: 'status', 'aria-live': 'polite' },
    'Tik op de eerste letter van een woord en daarna op de laatste.');

  const barFill = h('i', {});
  const barText = h('span', { class: 'ws-count' });
  const progress = h('div', { class: 'ws-progress' },
    h('div', { class: 'ws-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total) }, barFill), barText);

  const chips = new Map();
  const list = h('ul', { class: 'ws-words', 'aria-label': 'Woorden om te vinden' },
    puzzle.words.map((w) => {
      const chip = h('button', { type: 'button', class: 'ws-chip', onclick: () => hint(w.word) }, h('span', { class: 'ws-dot' }), h('span', { class: 'ws-w' }, w.word));
      chips.set(w.word, chip);
      return h('li', {}, chip);
    }));

  const tipButton = h('button', { type: 'button', class: 'btn action-btn', onclick: () => hint() }, icon('bulb'), h('span', { class: 'action-label' }, 'Tip'));

  const root = h('div', { class: 'ws' },
    h('div', { class: 'ws-main' },
      h('div', { class: 'ws-head' }, h('p', { class: 'ws-theme' }, 'Thema: ', h('strong', {}, puzzle.theme)), progress),
      board, message),
    h('div', { class: 'ws-side' }, list, h('div', { class: 'ws-actions' }, tipButton)));

  container.classList.add('stage--bare');
  container.append(root);

  // ----- Weergave -----
  const say = (t) => { message.textContent = t; };
  const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const cellEl = (r, c) => cells[r * N + c];

  function mk(tag, attrs) {
    const el = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  // Markeerstift van het ene naar het andere vakje (in vakjes-eenheden, dus schaalt vanzelf mee)
  function pill(cellsList, cls, idx) {
    const [a, b] = [cellsList[0], cellsList[cellsList.length - 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const el = mk('line', { x1: a[1] + .5, y1: a[0] + .5, x2: b[1] + .5, y2: b[0] + .5, class: `ws-pill ${cls}${idx != null ? ` c${idx % COLORS}` : ''}` });
    el.style.setProperty('--len', String(len + .1));
    pills.append(el);
    return el;
  }

  function drawFound() {
    pills.querySelectorAll('.ws-pill.done').forEach((e) => e.remove());
    state.found.forEach((f, i) => pill(wordCells(byWord.get(f.word)), 'done', f.color ?? i));
  }

  function render() {
    const inFound = new Set();
    state.found.forEach((f) => wordCells(byWord.get(f.word)).forEach(([r, c]) => inFound.add(r * N + c)));
    cells.forEach((cell, i) => {
      const r = Math.floor(i / N), c = i % N;
      cell.classList.toggle('found', inFound.has(i));
      cell.classList.toggle('start', !!start && start.r === r && start.c === c);
      cell.tabIndex = cursor.r === r && cursor.c === c ? 0 : -1;
      cell.setAttribute('aria-label', `Rij ${r + 1}, kolom ${c + 1}: ${puzzle.grid[r][c]}${inFound.has(i) ? ', onderdeel van een gevonden woord' : ''}${start && start.r === r && start.c === c ? ', begin van je keuze' : ''}`);
    });
    const n = found.size;
    barFill.style.width = `${(n / total) * 100}%`;
    barText.textContent = `${n} van ${total} gevonden`;
    barFill.parentElement.setAttribute('aria-valuenow', String(n));
    barFill.parentElement.setAttribute('aria-valuetext', `${n} van ${total} woorden gevonden`);
    chips.forEach((chip, word) => {
      const done = found.has(word);
      chip.classList.toggle('found', done);
      chip.setAttribute('aria-label', done ? `${word}, gevonden` : `${word}, nog niet gevonden. Tik voor een tip.`);
      const f = state.found.find((x) => x.word === word);
      if (f) chip.style.setProperty('--dot', `var(--pill-${(f.color ?? 0) % COLORS})`);
    });
  }

  // ----- Kiezen -----
  function clearPreview() { pills.querySelectorAll('.ws-pill.sel').forEach((e) => e.remove()); }

  function preview(r1, c1, r2, c2) {
    clearPreview();
    const cl = snap(N, r1, c1, r2, c2);
    if (cl.length >= 1) pill(cl, 'sel');
  }

  function tapCell(r, c) {
    if (finished) return;
    cursor = { r, c };
    if (!start) {
      start = { r, c };
      clearPreview(); pill([[r, c]], 'sel');
      say('Begin gekozen. Tik nu op de laatste letter van het woord.');
      render();
      return;
    }
    if (start.r === r && start.c === c) {      // nog eens op hetzelfde vakje: weer opnieuw kiezen
      start = null; clearPreview(); say('Gewist. Kies een nieuwe eerste letter.'); render();
      return;
    }
    const s = start;
    start = null;
    evaluate(s.r, s.c, r, c);
  }

  function evaluate(r1, c1, r2, c2) {
    clearPreview();
    const exact = line(r1, c1, r2, c2);
    const candidates = [exact, snap(N, r1, c1, r2, c2)].filter((x) => x && x.length >= 2);
    for (const cl of candidates) {
      const word = matchWord(puzzle, cl, found);
      if (word) { markFound(word, cl); return; }
    }
    // Niet gevonden: zachte melding, nooit een straf
    const cl = candidates[candidates.length - 1];
    if (cl) {
      const m = pill(cl, 'miss');
      m.addEventListener('animationend', () => m.remove());
      setTimeout(() => m.remove(), 900);
    }
    say('Dat is geen woord uit de lijst. Probeer het nog eens, je kunt niets verkeerd doen.');
    render();
  }

  // ----- Gevonden! -----
  async function markFound(word) {
    const w = byWord.get(word);
    found.add(word);
    const color = state.found.length % COLORS;
    state.found.push({ word, color });
    const left = total - found.size;
    ctx.save(state, { progress: found.size / total });

    const cl = wordCells(w);
    const el = pill(cl, 'done', color);
    el.classList.add('draw');
    // De letters van het woord lichten na elkaar even op
    if (motionOK()) cl.forEach(([r, c], i) => { const cell = cellEl(r, c); cell.style.setProperty('--wd', `${i * 60}ms`); cell.classList.add('wave'); setTimeout(() => cell.classList.remove('wave'), 900 + i * 60); });
    const last = cellEl(...cl[cl.length - 1]);
    const [x, y] = center(last);
    burst({ x, y, count: 9, power: 190, cone: [-170, -10], size: [10, 18], life: [1000, 1500] });
    chips.get(word)?.classList.add('just');
    setTimeout(() => chips.get(word)?.classList.remove('just'), 1000);
    render();

    if (left > 0) {
      say(`Gevonden: ${word}! Nog ${left} te gaan.`);
      return;
    }
    say('Gelukt! Je hebt alle woorden gevonden.');
    finished = true;
    if (motionOK()) {
      root.classList.add('won');
      const [bx, by] = center(board);
      burst({ x: bx, y: by, count: 26, power: 420, cone: [-170, -10], size: [14, 26], life: [1500, 2300] });
      rain({ count: 40 });
    }
    ctx.complete({ difficulty: ctx.difficulty, delay: motionOK() ? 1500 : 0 });
  }

  // ----- Tip: het eerste vakje van een woord licht even op -----
  function hint(word) {
    if (finished) return;
    const w = word ? byWord.get(word) : puzzle.words.find((x) => !found.has(x.word));
    if (!w) return;
    if (found.has(w.word)) { say(`${w.word} heb je al gevonden.`); return; }
    const cell = cellEl(w.r, w.c);
    cells.forEach((x) => x.classList.remove('hint'));
    void cell.offsetWidth;
    cell.classList.add('hint');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => cell.classList.remove('hint'), 3200);
    cursor = { r: w.r, c: w.c };
    say(`Tip: ${w.word} begint bij het oplichtende vakje (rij ${w.r + 1}, kolom ${w.c + 1}).`);
    render();
  }

  // ----- Muis: ook slepen -----
  function posToCell(e) {
    const rect = board.getBoundingClientRect();
    const c = Math.min(N - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * N)));
    const r = Math.min(N - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * N)));
    return [r, c];
  }
  board.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || finished) return;
    const [r, c] = posToCell(e);
    drag = { r, c, moved: false, id: e.pointerId };
  });
  board.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const [r, c] = posToCell(e);
    if (r !== drag.r || c !== drag.c) {
      if (!drag.moved) board.setPointerCapture(drag.id);      // pas bij echt slepen vastleggen, anders klopt de klik niet meer
      drag.moved = true; preview(drag.r, drag.c, r, c);
    }
  });
  board.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) return;                         // een gewone klik: dat handelt de klik zelf af
    const [r, c] = posToCell(e);
    lastDrag = Date.now();
    start = null;
    evaluate(d.r, d.c, r, c);
  });
  board.addEventListener('pointercancel', () => { drag = null; clearPreview(); });
  board.addEventListener('click', (e) => {
    if (Date.now() - lastDrag < 400) return;      // het eind van een sleepbeweging
    const [r, c] = posToCell(e);
    tapCell(r, c);
  });

  // ----- Toetsenbord -----
  function onKey(e) {
    const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    if (e.key in moves) {
      const [dr, dc] = moves[e.key];
      cursor = { r: Math.min(N - 1, Math.max(0, cursor.r + dr)), c: Math.min(N - 1, Math.max(0, cursor.c + dc)) };
      if (start) preview(start.r, start.c, cursor.r, cursor.c);
      render();
      cellEl(cursor.r, cursor.c).focus({ preventScroll: true });
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      tapCell(cursor.r, cursor.c);
      cellEl(cursor.r, cursor.c).focus({ preventScroll: true });
      e.preventDefault();
    } else if (e.key === 'Escape' && start) {
      start = null; clearPreview(); say('Gewist.'); render();
    }
  }

  drawFound();
  render();
  if (!ctx.saved) ctx.save(state, { progress: 0 });
  if (found.size === total) { finished = true; ctx.complete({ difficulty: ctx.difficulty }); }
}
