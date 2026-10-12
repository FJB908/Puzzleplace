// Sudoku: het scherm. De puzzels komen uit engine.js.
//
// Bediening: tik op een vakje, tik op een cijfer. Staat het cijfer fout, dan zie je dat
// meteen en gaat er een leven (bloesem) af. Zijn alle levens op, dan kun je opnieuw
// proberen met dezelfde puzzel. Met het toetsenbord: pijltjes, 1-9, Backspace, N (potlood),
// Ctrl+Z.

import { h, icon, choiceDialog } from '../../ui.js';
import { generate, candidateMask, bitCount, PEERS } from './engine.js';
import { burst, rain, motionOK } from '../../effects.js';
import { t, datumTekst } from '../../i18n/index.js';
import * as store from '../../store.js';
import { tijdTekst, reeks } from '../../shared/dagelijks.js';
import { felicitatie } from '../../shared/felicitatie.js';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const MAX_HISTORY = 300;
const LIVES = { makkelijk: 5, gemiddeld: 4, moeilijk: 3, extreem: 3 };
// De Sudoku van vandaag heeft altijd evenveel levens: het aantal verklapt anders het niveau, en dat zie je pas na afloop
const livesFor = (ctx) => (ctx.daily ? 4 : LIVES[ctx.difficulty] ?? 3);

// ----- Staat -----
// Alles wat bewaard wordt is gewoon JSON: puzzel, oplossing, ingevulde cijfers, notities, stappen, levens.
function newState(ctx) {
  const { puzzle, solution } = generate(ctx.seed, ctx.difficulty);
  return { puzzle, solution, values: [...puzzle], notes: new Array(81).fill(0), history: [], lives: livesFor(ctx), time: 0 };
}

function validState(s) {
  return s && ['puzzle', 'solution', 'values', 'notes'].every((k) => Array.isArray(s[k]) && s[k].length === 81);
}

export function mount(container, ctx) {
  const maxLives = livesFor(ctx);
  const state = validState(ctx.saved)
    ? { history: [], lives: maxLives, time: 0, ...ctx.saved }
    : newState(ctx);
  const { puzzle, solution, values, notes } = state;

  const isWrong = (i) => values[i] !== 0 && !puzzle[i] && values[i] !== solution[i];
  const firstEmptyOrWrong = () => values.findIndex((v, i) => !puzzle[i] && (!v || isWrong(i)));

  let selected = Math.max(0, firstEmptyOrWrong());
  let pencil = false;
  let finished = false;
  let lastPlaced = -1, lastNope = -1;      // voor het knallen/schudden van het laatste vakje
  const waves = new Map();                  // vakje -> vertraging van de golf (ms)

  // ----- Opbouw -----
  const cells = [];
  const board = h('div', { class: 'sudoku-board', role: 'grid', 'aria-label': t('sudoku.gridAria'), onkeydown: onBoardKey });
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

  const lifeEls = Array.from({ length: maxLives }, () => h('span', { class: 'life' }));
  const livesEl = h('div', { class: 'sudoku-lives', role: 'img' }, lifeEls);
  lifeEls.forEach((el) => el.addEventListener('animationend', () => el.classList.remove('losing')));
  const message = h('p', { class: 'sudoku-message', role: 'status', 'aria-live': 'polite' },
    t('sudoku.start'));

  const padButtons = DIGITS.map((d) => h('button', {
    type: 'button', class: 'btn pad-btn', 'data-digit': d, onclick: () => enter(d),
  }, String(d)));
  const eraseButton = h('button', { type: 'button', class: 'btn pad-btn pad-erase', 'aria-label': t('sudoku.eraseAria'), onclick: erase },
    icon('eraser'), h('span', {}, t('sudoku.erase')));
  const pad = h('div', { class: 'sudoku-pad', role: 'group', 'aria-label': t('sudoku.digits') }, padButtons, eraseButton);

  const action = (iconName, label, onclick, attrs = {}) =>
    h('button', { type: 'button', class: 'btn action-btn', onclick, ...attrs }, icon(iconName), h('span', { class: 'action-label' }, label));
  const undoButton = action('undo', t('sudoku.undo'), undo);
  const pencilButton = action('pencil', t('sudoku.pencil'), togglePencil, { 'aria-pressed': 'false' });
  const tipButton = action('bulb', t('common.hint'), tip);
  const actions = h('div', { class: 'sudoku-actions' }, undoButton, pencilButton, tipButton);

  // ----- De tijd: loopt alleen als het spel in beeld is, staat stil bij pauze en na afloop; verbergen kan met een tik -----
  const timeText = h('span', { class: 'time-text' });
  const timerButton = h('button', { type: 'button', class: 'sudoku-timer', onclick: toggleTimer }, icon('clock'), timeText);
  const pauseButton = h('button', { type: 'button', class: 'btn btn-quiet sudoku-pause-btn', onclick: () => setPaused(!paused), 'aria-label': t('sudoku.pause') }, icon('pause'));
  const pauseCover = h('div', { class: 'sudoku-pause', hidden: true },
    h('p', {}, t('sudoku.paused')),
    h('button', { type: 'button', class: 'btn btn-primary', onclick: () => setPaused(false) }, icon('play'), t('sudoku.resume')));
  const top = h('div', { class: 'sudoku-top' }, livesEl, h('div', { class: 'sudoku-clock' }, timerButton, pauseButton));
  const root = h('div', { class: 'sudoku' },
    h('div', { class: 'sudoku-main' }, top, h('div', { class: 'sudoku-boardwrap' }, board, pauseCover), message),
    h('div', { class: 'sudoku-controls' }, pad, actions));

  container.classList.add('stage--bare');
  container.append(root);

  let seconds = state.time || 0, since = 0, paused = false, ticker = null, lastSave = 0;
  const visible = () => !document.hidden;
  const running = () => since > 0;
  const elapsed = () => seconds + (running() ? (performance.now() - since) / 1000 : 0);
  function clockOn() { if (!finished && !paused && visible() && !running()) since = performance.now(); }
  function clockOff() { if (running()) { seconds += (performance.now() - since) / 1000; since = 0; } }
  function showTime() {
    const hidden = store.getSettings().showTimer === false;
    timeText.textContent = hidden ? '' : tijdTekst(elapsed());
    timerButton.classList.toggle('is-hidden', hidden);
    timerButton.setAttribute('aria-pressed', String(!hidden));
    timerButton.setAttribute('aria-label', hidden ? t('sudoku.timer.show') : t('sudoku.timer.hide', { time: tijdTekst(elapsed()) }));
  }
  function toggleTimer() { store.setSetting('showTimer', store.getSettings().showTimer === false); showTime(); }
  function tick() {
    showTime();
    if (running() && performance.now() - lastSave > 15000) { lastSave = performance.now(); save(); }          // de tijd niet kwijt als je de app sluit
  }
  function setPaused(on) {
    if (finished && on) return;
    paused = on;
    if (on) clockOff(); else clockOn();
    pauseCover.hidden = !on;
    root.classList.toggle('is-paused', on);
    board.inert = on; pad.inert = on;
    pauseButton.hidden = on;                                     // tijdens de pauze is er één grote knop: Verder
    say(on ? t('sudoku.say.paused') : '');
    showTime(); save();
    if (!on) cells[selected].focus({ preventScroll: true });
  }
  function onVisibility() { if (document.hidden) { clockOff(); save(); } else clockOn(); }
  document.addEventListener('visibilitychange', onVisibility);
  function save() { state.time = elapsed(); ctx.save(state, { progress: progress() }); }

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
        i === lastPlaced && 'pop',
        i === lastNope && 'nope',
        waves.has(i) && 'wave',
      ].filter(Boolean).join(' ');
      if (waves.has(i)) cell.style.setProperty('--wd', `${waves.get(i)}ms`); else cell.style.removeProperty('--wd');
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
      b.setAttribute('aria-label', t(done ? 'sudoku.digitDone' : 'sudoku.digitAria', { n: k + 1 }));
    });
    eraseButton.disabled = finished;
    undoButton.disabled = finished || state.history.length === 0;
    tipButton.disabled = finished;
    pencilButton.disabled = finished;
    pencilButton.setAttribute('aria-pressed', String(pencil));
    pencilButton.querySelector('.action-label').textContent = pencil ? t('sudoku.pencilOn') : t('sudoku.pencil');
    root.dataset.pencil = String(pencil);

    livesEl.setAttribute('aria-label', t('sudoku.livesAria', { lives: state.lives, max: maxLives }));
    lifeEls.forEach((el, k) => el.classList.toggle('lost', k >= state.lives));
    lastPlaced = -1; lastNope = -1;                  // de beweging is nu gestart
  }

  // ----- Effecten -----
  const center = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  // Welke rijen, kolommen en blokjes staan helemaal goed?
  function completeUnits() {
    const done = new Set();
    for (let n = 0; n < 9; n++) {
      const row = Array.from({ length: 9 }, (_, k) => n * 9 + k);
      const col = Array.from({ length: 9 }, (_, k) => k * 9 + n);
      const box = Array.from({ length: 9 }, (_, k) => (Math.floor(n / 3) * 3 + Math.floor(k / 3)) * 9 + (n % 3) * 3 + (k % 3));
      for (const [key, cells9] of [[`r${n}`, row], [`c${n}`, col], [`b${n}`, box]]) {
        if (cells9.every((i) => values[i] === solution[i])) done.add(key);
      }
    }
    return done;
  }
  const unitCells = (key) => {
    const n = Number(key.slice(1));
    return Array.from({ length: 9 }, (_, k) => key[0] === 'r' ? n * 9 + k : key[0] === 'c' ? k * 9 + n
      : (Math.floor(n / 3) * 3 + Math.floor(k / 3)) * 9 + (n % 3) * 3 + (k % 3));
  };

  // Een golf over de vakjes, beginnend bij `origin`
  function sweep(indices, origin) {
    if (!motionOK()) return;
    const [or, oc] = [Math.floor(origin / 9), origin % 9];
    for (const i of indices) waves.set(i, (Math.abs(Math.floor(i / 9) - or) + Math.abs((i % 9) - oc)) * 55);
    clearTimeout(sweep.t);
    sweep.t = setTimeout(() => { waves.clear(); render(); }, 1500);
  }

  // Na een goed cijfer: popje, en een golf + blaadjes als een rij/kolom/blokje klaar is
  function celebrateRight(cellIndex, before) {
    lastPlaced = cellIndex;
    const fresh = [...completeUnits()].filter((u) => !before.has(u));
    if (!fresh.length) return;
    sweep([...new Set(fresh.flatMap(unitCells))], cellIndex);
    const [x, y] = center(cells[cellIndex]);
    burst({ x, y, count: 7, power: 170, cone: [-160, -20], size: [10, 16], life: [900, 1300] });
  }

  function label(i) {
    const r = Math.floor(i / 9) + 1, c = (i % 9) + 1;
    if (values[i]) return t(isWrong(i) ? 'sudoku.cell.wrong' : puzzle[i] ? 'sudoku.cell.given' : 'sudoku.cell.value', { r, c, n: values[i] });
    if (notes[i]) return t('sudoku.cell.notes', { r, c, notes: DIGITS.filter((d) => notes[i] & (1 << (d - 1))).join(' ') });
    return t('sudoku.cell.empty', { r, c });
  }

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

  // Hoeveel van de lege vakjes staan goed?
  const progress = () => {
    const open = puzzle.filter((v) => !v).length;
    return open ? values.filter((v, i) => !puzzle[i] && v === solution[i]).length / open : 1;
  };

  function afterChange() {
    save();
    render();
    if (values.every((v, i) => v === solution[i])) win();
  }

  async function win() {
    finished = true;
    clockOff(); clearInterval(ticker); showTime();
    const time = Math.round(seconds);
    render();
    say(t('sudoku.say.won'));
    if (motionOK()) {                                    // eerst even genieten: golf over het hele rooster en een bui van blaadjes
      root.classList.add('won');
      sweep(values.map((_, i) => i), selected);
      const [x, y] = center(board);
      burst({ x, y, count: 26, power: 420, cone: [-170, -10], size: [14, 26], life: [1500, 2300] });
      rain({ count: 40 });
    }
    const info = ctx.recordWin({ time });                         // beste tijd en statistieken, bij de puzzel van de dag ook het archief
    ctx.complete({ title: felicitatie(), text: t(ctx.daily ? 'sudoku.done.daily' : 'sudoku.done.text', { date: ctx.daily ? datumTekst(new Date(`${ctx.day}T12:00:00`), { day: 'numeric', month: 'long' }) : '' }), body: resultaat(time, info), time, delay: motionOK() ? 1400 : 0 });   // meteen vastleggen, het slotbericht komt na de animatie
  }

  // Het slotvenster: je tijd, je beste tijd (en of dat een nieuw record is), het gemiddelde en, bij de puzzel van de dag, je reeks
  function resultaat(time, info) {
    const tegel = (label, waarde, klas = '') => h('div', { class: `stat-tile ${klas}` }, h('small', {}, label), h('strong', {}, waarde));
    const nieuwRecord = info && info.record && info.previous != null;
    const tegels = [tegel(t('sudoku.stat.time'), tijdTekst(time)), tegel(t('sudoku.stat.best'), tijdTekst(info?.best ?? time), nieuwRecord ? 'is-record' : '')];
    if (info && !info.repeat && info.won > 1) tegels.push(tegel(t('sudoku.stat.average'), tijdTekst(info.average)));
    tegels.push(tegel(t('sudoku.stat.mistakes'), String(maxLives - state.lives)));
    tegels.push(tegel(t('sudoku.stat.level'), t(`level.${ctx.difficulty}`)));                // het niveau van de Sudoku van vandaag is pas nu te zien
    const kaart = [];
    if (nieuwRecord) kaart.push(h('p', { class: 'record-banner' }, icon('check'), t('sudoku.record', { previous: tijdTekst(info.previous) })));
    else if (info && !info.repeat && info.won === 1) kaart.push(h('p', { class: 'muted record-first' }, t('sudoku.firstTime')));
    kaart.push(h('div', { class: 'stat-tiles' }, tegels));
    if (ctx.daily) {
      const n = reeks(store.getDaily('sudoku'), store.todayKey());
      if (n > 1) kaart.push(h('p', { class: 'streak-note' }, t('sudoku.streak', { n })));
    }
    return h('div', { class: 'stack' }, kaart);
  }

  // ----- Fout gemaakt: een leven eraf -----
  function loseLife() {
    state.lives = Math.max(0, state.lives - 1);
    lastNope = selected;
    const gone = lifeEls[state.lives];                   // de bloesem die nu valt
    if (gone && motionOK()) {
      gone.classList.add('losing');
      const [x, y] = center(gone);
      burst({ x, y, count: 9, power: 140, cone: [-190, 10], size: [10, 17], life: [1000, 1500] });
    }
    root.classList.remove('hit');
    void root.offsetWidth;                       // animatie opnieuw laten starten
    root.classList.add('hit');
    setTimeout(() => root.classList.remove('hit'), 900);
  }

  async function gameOver() {
    finished = true;
    clockOff(); showTime();
    render();
    say(t('sudoku.say.noLives'));
    const choice = await choiceDialog({
      title: t('sudoku.gameOver.title'),
      text: t('sudoku.gameOver.text'),
      actions: [
        { label: t('sudoku.gameOver.retry'), value: 'retry', primary: true, autofocus: true },
        { label: ctx.daily ? t('sudoku.gameOver.leaveDaily') : t('sudoku.gameOver.leave'), value: 'leave' },
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
    seconds = 0; since = 0; finished = false; clockOn();                     // opnieuw beginnen: ook de tijd begint opnieuw
    selected = Math.max(0, firstEmptyOrWrong());
    save();
    say(t('sudoku.say.retry'));
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
    if (puzzle[selected]) { say(t('sudoku.say.fixedChoose')); return; }

    if (pencil) {
      if (values[selected]) { say(t('sudoku.say.clearFirst')); return; }
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
    const before = completeUnits();
    change(entries);

    if (right) { say(''); celebrateRight(selected, before); afterChange(); return; }

    loseLife();
    save();
    render();
    if (state.lives <= 0) { gameOver(); return; }
    say(t('sudoku.say.wrong', { n: state.lives }));
  }

  function erase() {
    if (finished) return;
    if (puzzle[selected]) { say(t('sudoku.say.fixed')); return; }
    if (!values[selected] && !notes[selected]) { say(t('sudoku.say.alreadyEmpty')); return; }
    change([[selected, 0, 0]]);
    say('');
    afterChange();
  }

  function undo() {
    const record = state.history.pop();
    if (!record) { say(t('sudoku.say.nothingToUndo')); return; }
    for (const [i, v, n] of [...record].reverse()) { values[i] = v; notes[i] = n; }
    selected = record[0][0];
    say(t('sudoku.say.undone'));
    save();
    render();
    cells[selected].focus({ preventScroll: true });
  }

  function togglePencil() {
    pencil = !pencil;
    say(t(pencil ? 'sudoku.say.pencilOn' : 'sudoku.say.pencilOff'));
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
    if (target < 0) { say(t('sudoku.say.nothingLeft')); return; }

    const d = solution[target];
    selected = target;
    const before = completeUnits();
    change([[target, d, 0], ...PEERS[target].filter((j) => !values[j] && notes[j] & (1 << (d - 1))).map((j) => [j, 0, notes[j] & ~(1 << (d - 1))])]);
    say(t('sudoku.say.hint', { n: d }));
    celebrateRight(target, before);
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
  if (!ctx.saved) save();     // nieuw spel meteen bewaren, zodat "Verder spelen" klopt
  if (state.lives <= 0) gameOver();   // een eerder verloren spel: opnieuw de keuze tonen
  else { clockOn(); ticker = setInterval(tick, 500); }
  showTime();
  return () => { document.removeEventListener('visibilitychange', onVisibility); clearInterval(ticker); clockOff(); if (!finished) save(); };
}
