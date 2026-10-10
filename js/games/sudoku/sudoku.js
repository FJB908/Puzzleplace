// Sudoku: het scherm. De puzzels komen uit engine.js.
//
// Bediening: tik op een vakje, tik op een cijfer. Alles kan ongedaan worden gemaakt,
// niets wordt afgestraft. Met het toetsenbord: pijltjes, 1-9, Backspace, N (potlood), Ctrl+Z.

import { h, icon } from '../../ui.js';
import { generate, findConflicts, candidateMask, bitCount, PEERS } from './engine.js';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const MAX_HISTORY = 300;

// ----- Staat -----
// Alles wat bewaard wordt is gewoon JSON: puzzel, oplossing, ingevulde cijfers, notities, stappen.
function newState(ctx) {
  const { puzzle, solution } = generate(ctx.seed, ctx.difficulty);
  return { puzzle, solution, values: [...puzzle], notes: new Array(81).fill(0), history: [] };
}

function validState(s) {
  return s && ['puzzle', 'solution', 'values', 'notes'].every((k) => Array.isArray(s[k]) && s[k].length === 81);
}

export function mount(container, ctx) {
  const state = validState(ctx.saved) ? { history: [], ...ctx.saved } : newState(ctx);
  const { puzzle, solution, values, notes } = state;

  let selected = values.findIndex((v, i) => !v && !puzzle[i]);   // begin bij het eerste lege vakje
  if (selected < 0) selected = 0;
  let pencil = false;
  let finished = false;
  const marked = new Set();       // vakjes die "Controle" fout vond; verdwijnen zodra je ze aanpast

  // ----- Opbouw -----
  const cells = [];
  const board = h('div', { class: 'sudoku-board', role: 'grid', 'aria-label': 'Sudoku-rooster', onkeydown: onBoardKey });
  for (let r = 0; r < 9; r++) {
    const row = h('div', { role: 'row', class: 'sudoku-row' });
    for (let c = 0; c < 9; c++) {
      const i = r * 9 + c;
      const cell = h('button', {
        type: 'button', role: 'gridcell', 'data-i': i, tabindex: '-1',
        class: `cell${c % 3 === 2 && c < 8 ? ' bx' : ''}${r % 3 === 2 && r < 8 ? ' by' : ''}${puzzle[i] ? ' given' : ''}`,
        onclick: () => select(i),
      });
      cells.push(cell);
      row.append(cell);
    }
    board.append(row);
  }

  const message = h('p', { class: 'sudoku-message', role: 'status', 'aria-live': 'polite' },
    'Tik op een vakje en kies daarna een cijfer.');

  const padButtons = DIGITS.map((d) => h('button', {
    type: 'button', class: 'btn pad-btn', 'data-digit': d, onclick: () => enter(d),
  }, String(d)));
  const eraseButton = h('button', { type: 'button', class: 'btn pad-btn pad-erase', 'aria-label': 'Wis dit vakje', onclick: erase },
    icon('eraser'), h('span', {}, 'Wis'));
  const pad = h('div', { class: 'sudoku-pad', role: 'group', 'aria-label': 'Cijfers' }, padButtons, eraseButton);

  const pencilButton = h('button', { type: 'button', class: 'btn action-btn', 'aria-pressed': 'false', onclick: togglePencil },
    icon('pencil'), h('span', { class: 'action-label' }, 'Potlood'));
  const undoButton = h('button', { type: 'button', class: 'btn action-btn', onclick: undo }, icon('undo'), h('span', { class: 'action-label' }, 'Stap terug'));
  const tipButton = h('button', { type: 'button', class: 'btn action-btn', onclick: tip }, icon('bulb'), h('span', { class: 'action-label' }, 'Tip'));
  const checkButton = h('button', { type: 'button', class: 'btn action-btn', onclick: check }, icon('verify'), h('span', { class: 'action-label' }, 'Controle'));
  const actions = h('div', { class: 'sudoku-actions' }, undoButton, pencilButton, tipButton, checkButton);

  const root = h('div', { class: 'sudoku' },
    h('div', { class: 'sudoku-main' }, board, message),
    h('div', { class: 'sudoku-controls' }, pad, actions));

  container.classList.add('stage--bare');
  container.append(root);

  // ----- Weergave -----
  function say(text) { message.textContent = text; }

  function render() {
    const conflicts = findConflicts(values);
    const selValue = values[selected];
    const selPeers = new Set(PEERS[selected]);
    const counts = new Array(10).fill(0);
    values.forEach((v) => { counts[v]++; });

    cells.forEach((cell, i) => {
      const v = values[i];
      const bad = conflicts.has(i) || marked.has(i);
      const isSel = i === selected;
      cell.className = [
        'cell',
        cell.classList.contains('bx') && 'bx', cell.classList.contains('by') && 'by',
        puzzle[i] && 'given',
        isSel && 'sel',
        !isSel && selPeers.has(i) && 'peer',
        !isSel && selValue && v === selValue && 'same',
        bad && 'bad',
      ].filter(Boolean).join(' ');
      cell.tabIndex = isSel ? 0 : -1;
      cell.setAttribute('aria-selected', String(isSel));

      // inhoud
      if (v) {
        cell.replaceChildren(h('span', { class: 'digit' }, String(v)));
      } else if (notes[i]) {
        cell.replaceChildren(h('span', { class: 'notes', 'aria-hidden': 'true' },
          DIGITS.map((d) => h('span', {}, notes[i] & (1 << (d - 1)) ? String(d) : ''))));
      } else {
        cell.replaceChildren();
      }
      cell.setAttribute('aria-label', label(i, conflicts.has(i)));
    });

    padButtons.forEach((b, k) => {
      const done = counts[k + 1] >= 9;
      b.disabled = done || finished;
      b.classList.toggle('done', done);
      b.setAttribute('aria-label', done ? `Cijfer ${k + 1}, helemaal ingevuld` : `Cijfer ${k + 1}`);
    });
    eraseButton.disabled = finished;
    undoButton.disabled = finished || state.history.length === 0;
    tipButton.disabled = finished;
    checkButton.disabled = finished;
    pencilButton.setAttribute('aria-pressed', String(pencil));
    pencilButton.querySelector('.action-label').textContent = pencil ? 'Potlood aan' : 'Potlood';
    root.dataset.pencil = String(pencil);
  }

  function label(i, conflict) {
    const r = Math.floor(i / 9) + 1, c = (i % 9) + 1;
    let text = `Rij ${r}, kolom ${c}: `;
    if (values[i]) text += `${values[i]}${puzzle[i] ? ', vast' : ''}`;
    else if (notes[i]) text += `leeg, notities ${DIGITS.filter((d) => notes[i] & (1 << (d - 1))).join(' ')}`;
    else text += 'leeg';
    if (conflict) text += ', botst met een ander cijfer';
    else if (marked.has(i)) text += ', klopt niet';
    return text;
  }

  // ----- Stappen vastleggen (voor ongedaan maken en bewaren) -----
  // Elke handeling is een lijst wijzigingen: [vakje, oud cijfer, oude notities].
  function change(entries) {
    const record = [];
    for (const [i, v, n] of entries) {
      if (values[i] === v && notes[i] === n) continue;
      record.push([i, values[i], notes[i]]);
      values[i] = v; notes[i] = n;
      marked.delete(i);
    }
    if (!record.length) return false;
    state.history.push(record);
    if (state.history.length > MAX_HISTORY) state.history.shift();
    return true;
  }

  function afterChange() {
    ctx.save(state);
    render();
    if (values.every(Boolean) && findConflicts(values).size === 0) win();
    else if (values.every(Boolean)) say('Alle vakjes zijn gevuld, maar er klopt iets niet. Tik op Controle om te zien waar.');
  }

  function win() {
    finished = true;
    render();
    say('Gelukt! De puzzel is helemaal goed ingevuld.');
    ctx.complete({ difficulty: ctx.difficulty });
  }

  // ----- Handelingen -----
  function select(i) {
    selected = Math.max(0, Math.min(80, i));
    render();
    cells[selected].focus({ preventScroll: true });
  }

  function enter(d) {
    if (finished) return;
    if (puzzle[selected]) { say('Dit cijfer staat vast en kan niet veranderen. Kies een leeg vakje.'); return; }

    if (pencil) {
      if (values[selected]) { say('Wis eerst het cijfer in dit vakje om notities te maken.'); return; }
      change([[selected, 0, notes[selected] ^ (1 << (d - 1))]]);
      say('');
      afterChange();
      return;
    }

    if (values[selected] === d) { erase(); return; }   // nog eens hetzelfde cijfer = weer wissen

    // Het cijfer zelf, en dat cijfer weghalen uit de notities van de buren.
    const entries = [[selected, d, 0]];
    for (const j of PEERS[selected]) if (!values[j] && notes[j] & (1 << (d - 1))) entries.push([j, 0, notes[j] & ~(1 << (d - 1))]);
    change(entries);
    say('');
    afterChange();
  }

  function erase() {
    if (finished) return;
    if (puzzle[selected]) { say('Dit cijfer staat vast en kan niet veranderen.'); return; }
    if (!values[selected] && !notes[selected]) { say('Dit vakje is al leeg.'); return; }
    change([[selected, 0, 0]]);
    say('');
    afterChange();
  }

  function undo() {
    const record = state.history.pop();
    if (!record) { say('Er is niets om terug te draaien.'); return; }
    for (const [i, v, n] of [...record].reverse()) { values[i] = v; notes[i] = n; }
    selected = record[0][0];
    say('Je laatste stap is teruggedraaid.');
    ctx.save(state);
    render();
    cells[selected].focus({ preventScroll: true });
  }

  function togglePencil() {
    pencil = !pencil;
    say(pencil
      ? 'Potlood staat aan: de cijfers komen klein in het vakje, als notitie.'
      : 'Potlood staat uit: de cijfers komen groot in het vakje.');
    render();
  }

  function check() {
    const wrong = values.map((v, i) => (v && v !== solution[i] ? i : -1)).filter((i) => i >= 0);
    marked.clear();
    wrong.forEach((i) => marked.add(i));
    if (!wrong.length) {
      const left = values.filter((v) => !v).length;
      say(left ? 'Tot nu toe klopt alles. Ga zo door!' : 'Alles klopt!');
    } else {
      say(wrong.length === 1
        ? 'Eén vakje klopt niet. Het is gemarkeerd.'
        : `${wrong.length} vakjes kloppen niet. Ze zijn gemarkeerd.`);
      select(wrong[0]);
      return;
    }
    render();
  }

  // Tip: kies het vakje waar het minste cijfers kunnen en vul het goede cijfer in.
  function tip() {
    if (finished) return;
    let target = !values[selected] ? selected : -1;
    if (target < 0) {
      let best = 10;
      values.forEach((v, i) => {
        if (v) return;
        const n = bitCount(candidateMask(values, i));
        if (n < best) { best = n; target = i; }
      });
    }
    if (target < 0) { say('Alle vakjes zijn gevuld. Tik op Controle om te kijken of alles klopt.'); return; }

    // Staat er iets verkeerds, dan eerst dat laten zien in plaats van een tip te geven.
    const wrong = values.some((v, i) => v && v !== solution[i]);
    if (wrong) { say('Er staat nog iets fout. Tik eerst op Controle.'); return; }

    selected = target;
    change([[target, solution[target], 0], ...PEERS[target]
      .filter((j) => !values[j] && notes[j] & (1 << (solution[target] - 1)))
      .map((j) => [j, 0, notes[j] & ~(1 << (solution[target] - 1))])]);
    say(`Tip: in het gemarkeerde vakje hoort een ${solution[target]}.`);
    afterChange();
    cells[selected].focus({ preventScroll: true });
  }

  // ----- Toetsenbord -----
  function onBoardKey(e) {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
    if (e.key in moves) {
      const col = selected % 9, row = Math.floor(selected / 9);
      const ok = (e.key === 'ArrowLeft' && col > 0) || (e.key === 'ArrowRight' && col < 8)
              || (e.key === 'ArrowUp' && row > 0) || (e.key === 'ArrowDown' && row < 8);
      if (ok) select(selected + moves[e.key]);
      e.preventDefault();
    } else if (/^[1-9]$/.test(e.key)) { enter(Number(e.key)); e.preventDefault(); }
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { erase(); e.preventDefault(); }
    else if (e.key.toLowerCase() === 'n') { togglePencil(); e.preventDefault(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { undo(); e.preventDefault(); }
  }

  render();
  if (!ctx.saved) ctx.save(state);     // nieuw spel meteen bewaren, zodat "Verder spelen" klopt
}
