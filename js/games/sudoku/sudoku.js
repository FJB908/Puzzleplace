// Sudoku: het scherm. De puzzels komen uit engine.js.
//
// Bediening: tik op een vakje, tik op een cijfer. Staat het cijfer fout, dan zie je dat
// meteen en gaat er een leven (bloesem) af. Zijn alle levens op, dan kun je opnieuw
// proberen met dezelfde puzzel. Met het toetsenbord: pijltjes, 1-9, Backspace, N (potlood),
// Ctrl+Z.

import { h, icon, choiceDialog } from '../../ui.js';
import { generate, candidateMask, bitCount, PEERS } from './engine.js';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const MAX_HISTORY = 300;
const LIVES = { makkelijk: 5, gemiddeld: 4, moeilijk: 3, extreem: 3 };

// ----- Staat -----
// Alles wat bewaard wordt is gewoon JSON: puzzel, oplossing, ingevulde cijfers, notities, stappen, levens.
function newState(ctx) {
  const { puzzle, solution } = generate(ctx.seed, ctx.difficulty);
  return { puzzle, solution, values: [...puzzle], notes: new Array(81).fill(0), history: [], lives: LIVES[ctx.difficulty] ?? 3 };
}

function validState(s) {
  return s && ['puzzle', 'solution', 'values', 'notes'].every((k) => Array.isArray(s[k]) && s[k].length === 81);
}

export function mount(container, ctx) {
  const maxLives = LIVES[ctx.difficulty] ?? 3;
  const state = validState(ctx.saved)
    ? { history: [], lives: maxLives, ...ctx.saved }
    : newState(ctx);
  const { puzzle, solution, values, notes } = state;

  const isWrong = (i) => values[i] !== 0 && !puzzle[i] && values[i] !== solution[i];
  const firstEmptyOrWrong = () => values.findIndex((v, i) => !puzzle[i] && (!v || isWrong(i)));

  let selected = Math.max(0, firstEmptyOrWrong());
  let pencil = false;
  let finished = false;

  // ----- Opbouw -----
  const cells = [];
  const board = h('div', { class: 'sudoku-board', role: 'grid', 'aria-label': 'Sudoku-rooster', onkeydown: onBoardKey });
  for (let r = 0; r < 9; r++) {
    const row = h('div', { role: 'row', class: 'sudoku-row' });
    for (let c = 0; c < 9; c++) {
      const i = r * 9 + c;
      const cell = h('button', {
        type: 'button', role: 'gridcell', 'data-i': i, tabindex: '-1',
        'data-edge': `${c % 3 === 2 && c < 8 ? 'x' : ''}${r % 3 === 2 && r < 8 ? 'y' : ''}`,
        onclick: () => select(i),
      });
      cells.push(cell);
      row.append(cell);
    }
    board.append(row);
  }

  const livesEl = h('div', { class: 'sudoku-lives', role: 'img' });
  const message = h('p', { class: 'sudoku-message', role: 'status', 'aria-live': 'polite' },
    'Tik op een vakje en kies daarna een cijfer.');

  const padButtons = DIGITS.map((d) => h('button', {
    type: 'button', class: 'btn pad-btn', 'data-digit': d, onclick: () => enter(d),
  }, String(d)));
  const eraseButton = h('button', { type: 'button', class: 'btn pad-btn pad-erase', 'aria-label': 'Wis dit vakje', onclick: erase },
    icon('eraser'), h('span', {}, 'Wis'));
  const pad = h('div', { class: 'sudoku-pad', role: 'group', 'aria-label': 'Cijfers' }, padButtons, eraseButton);

  const action = (iconName, label, onclick, attrs = {}) =>
    h('button', { type: 'button', class: 'btn action-btn', onclick, ...attrs }, icon(iconName), h('span', { class: 'action-label' }, label));
  const undoButton = action('undo', 'Stap terug', undo);
  const pencilButton = action('pencil', 'Potlood', togglePencil, { 'aria-pressed': 'false' });
  const tipButton = action('bulb', 'Tip', tip);
  const actions = h('div', { class: 'sudoku-actions' }, undoButton, pencilButton, tipButton);

  const root = h('div', { class: 'sudoku' },
    h('div', { class: 'sudoku-main' }, livesEl, board, message),
    h('div', { class: 'sudoku-controls' }, pad, actions));

  container.classList.add('stage--bare');
  container.append(root);

  // ----- Weergave -----
  function say(text) { message.textContent = text; }

  function render() {
    const selValue = values[selected];
    const selPeers = new Set(PEERS[selected]);

    cells.forEach((cell, i) => {
      const v = values[i];
      const isSel = i === selected;
      cell.className = [
        'cell',
        cell.dataset.edge.includes('x') && 'bx', cell.dataset.edge.includes('y') && 'by',
        puzzle[i] && 'given',
        isSel && 'sel',
        !isSel && selPeers.has(i) && 'peer',
        !isSel && selValue && v === selValue && !isWrong(i) && 'same',
        isWrong(i) && 'bad',
      ].filter(Boolean).join(' ');
      cell.tabIndex = isSel ? 0 : -1;
      cell.setAttribute('aria-selected', String(isSel));

      if (v) cell.replaceChildren(h('span', { class: 'digit' }, String(v)));
      else if (notes[i]) {
        cell.replaceChildren(h('span', { class: 'notes', 'aria-hidden': 'true' },
          DIGITS.map((d) => h('span', {}, notes[i] & (1 << (d - 1)) ? String(d) : ''))));
      } else cell.replaceChildren();
      cell.setAttribute('aria-label', label(i));
    });

    const counts = new Array(10).fill(0);
    values.forEach((v, i) => { if (v && !isWrong(i)) counts[v]++; });
    padButtons.forEach((b, k) => {
      const done = counts[k + 1] >= 9;
      b.disabled = done || finished;
      b.classList.toggle('done', done);
      b.setAttribute('aria-label', done ? `Cijfer ${k + 1}, helemaal ingevuld` : `Cijfer ${k + 1}`);
    });
    eraseButton.disabled = finished;
    undoButton.disabled = finished || state.history.length === 0;
    tipButton.disabled = finished;
    pencilButton.disabled = finished;
    pencilButton.setAttribute('aria-pressed', String(pencil));
    pencilButton.querySelector('.action-label').textContent = pencil ? 'Potlood aan' : 'Potlood';
    root.dataset.pencil = String(pencil);

    livesEl.setAttribute('aria-label', `Levens: ${state.lives} van ${maxLives}`);
    livesEl.replaceChildren(...Array.from({ length: maxLives }, (_, k) => h('span', { class: `life${k < state.lives ? '' : ' lost'}` })));
  }

  function label(i) {
    const r = Math.floor(i / 9) + 1, c = (i % 9) + 1;
    let text = `Rij ${r}, kolom ${c}: `;
    if (values[i]) text += `${values[i]}${puzzle[i] ? ', vast' : ''}`;
    else if (notes[i]) text += `leeg, notities ${DIGITS.filter((d) => notes[i] & (1 << (d - 1))).join(' ')}`;
    else text += 'leeg';
    if (isWrong(i)) text += ', fout';
    return text;
  }

  const levensText = (n) => (n === 1 ? 'nog 1 leven' : `nog ${n} levens`);

  // ----- Stappen vastleggen (voor ongedaan maken en bewaren) -----
  // Elke handeling is een lijst wijzigingen: [vakje, oud cijfer, oude notities].
  function change(entries) {
    const record = [];
    for (const [i, v, n] of entries) {
      if (values[i] === v && notes[i] === n) continue;
      record.push([i, values[i], notes[i]]);
      values[i] = v; notes[i] = n;
    }
    if (!record.length) return false;
    state.history.push(record);
    if (state.history.length > MAX_HISTORY) state.history.shift();
    return true;
  }

  function afterChange() {
    ctx.save(state);
    render();
    if (values.every((v, i) => v === solution[i])) win();
  }

  function win() {
    finished = true;
    render();
    say('Gelukt! De puzzel is helemaal goed ingevuld.');
    ctx.complete({ difficulty: ctx.difficulty, livesLeft: state.lives });
  }

  // ----- Fout gemaakt: een leven eraf -----
  function loseLife() {
    state.lives = Math.max(0, state.lives - 1);
    root.classList.remove('hit');
    void root.offsetWidth;                       // animatie opnieuw laten starten
    root.classList.add('hit');
    setTimeout(() => root.classList.remove('hit'), 900);
  }

  async function gameOver() {
    finished = true;
    render();
    say('Je hebt geen levens meer.');
    const choice = await choiceDialog({
      title: 'Helaas, geen levens meer',
      text: 'Wil je het nog eens proberen met dezelfde puzzel?',
      actions: [
        { label: 'Opnieuw proberen', value: 'retry', primary: true, autofocus: true },
        { label: ctx.daily ? 'Terug naar Start' : 'Andere puzzel', value: 'leave' },
      ],
      dismissValue: 'retry',
    });
    if (choice === 'leave') {
      ctx.discard();
      location.hash = ctx.daily ? '#/' : '#/spel/sudoku';
      return;
    }
    values.splice(0, 81, ...puzzle);
    notes.fill(0);
    state.history.length = 0;
    state.lives = maxLives;
    finished = false;
    selected = Math.max(0, firstEmptyOrWrong());
    ctx.save(state);
    say('Nieuwe poging. Succes!');
    render();
    cells[selected].focus({ preventScroll: true });
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

    // Het cijfer zelf, en (als het goed is) dat cijfer weghalen uit de notities van de buren.
    const right = d === solution[selected];
    const entries = [[selected, d, 0]];
    if (right) for (const j of PEERS[selected]) if (!values[j] && notes[j] & (1 << (d - 1))) entries.push([j, 0, notes[j] & ~(1 << (d - 1))]);
    change(entries);

    if (right) { say(''); afterChange(); return; }

    loseLife();
    ctx.save(state);
    render();
    if (state.lives <= 0) { gameOver(); return; }
    say(`Dat cijfer hoort hier niet. Je hebt ${levensText(state.lives)}. Wis het of probeer een ander cijfer.`);
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

  // Tip: vul het goede cijfer in. Zonder leven te kosten.
  // Gekozen vakje als dat leeg of fout is, anders een fout vakje, anders het vakje met de minste mogelijkheden.
  function tip() {
    if (finished) return;
    let target = !puzzle[selected] && (!values[selected] || isWrong(selected)) ? selected : -1;
    if (target < 0) target = values.findIndex((_, i) => isWrong(i));
    if (target < 0) {
      let best = 10;
      values.forEach((v, i) => {
        if (v) return;
        const n = bitCount(candidateMask(values, i));
        if (n < best) { best = n; target = i; }
      });
    }
    if (target < 0) { say('Er is niets meer in te vullen.'); return; }

    const d = solution[target];
    selected = target;
    change([[target, d, 0], ...PEERS[target].filter((j) => !values[j] && notes[j] & (1 << (d - 1))).map((j) => [j, 0, notes[j] & ~(1 << (d - 1))])]);
    say(`Tip: in het gemarkeerde vakje hoort een ${d}.`);
    afterChange();
    if (!finished) cells[selected].focus({ preventScroll: true });
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
  if (state.lives <= 0) gameOver();   // een eerder verloren spel: opnieuw de keuze tonen
}
