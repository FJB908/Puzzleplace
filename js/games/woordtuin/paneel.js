// Het scherm van een partij Woordtuin: stand, bord, het woord dat je maakt en de knoppen. Het paneel regelt zelf niets
// over wie wat speelt: de ouder (tegen de computer, of tegen een vriend via de server) geeft in `onZet` aan wat er met
// een zet gebeurt. Zo is het scherm voor beide precies hetzelfde.

import { h, icon } from '../../ui.js';
import { maakBord, HEK } from './bord.js';
import { checkMove, MoveError, counts, pathsFor, MIN_LEN, other } from './engine.js';

const meervoud = (n, een, veel) => `${n} ${n === 1 ? een : veel}`;
const hoofd = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export function maakPaneel({ me = 1, names = { 1: 'Jij', 2: 'De ander' }, zinnen = {}, tips = null, onZet, onTip, onTerug = null, kanTerug = () => true }) {
  let state = null, busy = false, tipsOver = tips, plekken = [], plek = 0;

  const bord = maakBord({ onChange: (path, bron) => bijwerken(bron) });

  // ----- Stand -----
  const num = (cls) => h('b', { class: cls }, '0');
  const mijnTal = num('wt-tal'), hunTal = num('wt-tal');
  let open = 0;
  const stand = h('div', { class: 'wt-stand' },
    h('div', { class: 'wt-kant mijn' }, h('span', { class: 'wt-bol', 'aria-hidden': 'true' }, '✿'), h('div', {}, mijnTal, h('small', {}, names[me]))),
    h('div', { class: 'wt-kant hun' }, h('div', {}, hunTal, h('small', {}, names[other(me)])), h('span', { class: 'wt-bol', 'aria-hidden': 'true' }, '❧')));

  const beurt = h('p', { class: 'wt-beurt', role: 'status', 'aria-live': 'polite' });
  const laatste = h('p', { class: 'wt-laatste' });

  // ----- Woord en uitleg -----
  const woord = h('strong', { class: 'wt-woord-tekst', 'aria-hidden': 'true' }, '');
  const uitleg = h('p', { class: 'wt-uitleg', role: 'status', 'aria-live': 'polite' });
  const woordBlok = h('div', { class: 'wt-woord' }, woord, uitleg);

  // ----- Typen -----
  const invoer = h('input', {
    type: 'text', class: 'wt-invoer', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', enterkeyhint: 'done',
    'aria-label': 'Typ een woord dat op het bord ligt', placeholder: 'bijvoorbeeld: tuin',
    oninput: typen, onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); klaar(); } },
  });
  const anderePlek = h('button', { type: 'button', class: 'btn btn-quiet', hidden: true, onclick: () => { if (plekken.length > 1) { plek = (plek + 1) % plekken.length; bord.setPath(plekken[plek], 'typen'); } } }, 'Andere plek');
  const typBlok = h('div', { class: 'wt-typ-body', hidden: true }, invoer, anderePlek);
  const typKnop = h('button', { type: 'button', class: 'btn', 'aria-expanded': 'false', onclick: () => {
    typBlok.hidden = !typBlok.hidden; typKnop.setAttribute('aria-expanded', String(!typBlok.hidden));
    if (!typBlok.hidden) invoer.focus();
  } }, icon('pencil'), 'Typen');

  // ----- Knoppen -----
  const wis = h('button', { type: 'button', class: 'btn', onclick: () => { invoer.value = ''; plekken = []; bord.clear(); } }, icon('eraser'), 'Wis');
  const klaarKnop = h('button', { type: 'button', class: 'btn btn-primary', disabled: true, onclick: klaar }, icon('check'), 'Klaar');
  const tipKnop = onTip ? h('button', { type: 'button', class: 'btn', onclick: tip }, icon('bulb'), h('span', {}, 'Tip')) : null;
  const terugKnop = onTerug ? h('button', { type: 'button', class: 'btn', onclick: terug }, icon('undo'), 'Zet terug') : null;
  const knoppen = h('div', { class: 'wt-knoppen' }, wis, klaarKnop);
  const extra = h('div', { class: 'wt-extra' }, tipKnop, terugKnop, typKnop);

  const hekje = h('span', {}); hekje.innerHTML = `${HEK} Hekje: niet af te pakken`;
  const legenda = h('p', { class: 'wt-legenda' }, hekje);
  const el = h('div', { class: 'wt' }, stand, h('div', { class: 'wt-info' }, beurt, laatste), bord.el, legenda, woordBlok, typBlok, extra, knoppen);

  // ----- Weergave -----
  // In een zin: "van de computer", "Anna speelde" (names is voor de stand, zinnen voor de zinnen)
  const naam = (p) => zinnen[p] ?? names[p];
  const aanDeBeurt = () => !!state && !state.over && state.turn === me && !busy;

  function bijwerkenStand() {
    const c = counts(state);
    mijnTal.textContent = c[me]; hunTal.textContent = c[other(me)]; open = c[0];
    stand.setAttribute('aria-label', `Stand: ${names[me]} ${c[me]}, ${names[other(me)]} ${c[other(me)]}, nog ${c[0]} open`);
    const nog = open ? ` Nog ${meervoud(open, 'vakje', 'vakjes')} open.` : '';
    if (state.over) beurt.textContent = 'Het spel is afgelopen.';
    else if (state.turn === me) beurt.textContent = `Jij bent aan de beurt.${nog}`;
    else beurt.textContent = `${hoofd(naam(state.turn))} is aan de beurt.${nog}`;
    beurt.classList.toggle('jij', !state.over && state.turn === me);
    if (state.passed && !state.over) laatste.textContent = `${hoofd(naam(other(state.turn)))} kan geen woord meer maken en slaat over.`;
    else if (state.last) {
      const l = state.last, wie = l.player === me ? 'Jij speelde' : `${hoofd(naam(l.player))} speelde`;
      laatste.textContent = `${wie} ${l.word.toUpperCase()}${l.took.length ? ` en pakte ${meervoud(l.took.length, 'vakje', 'vakjes')} af` : ''}.`;
    } else laatste.textContent = '';
  }

  // Wat mag er nu? Alleen als jij aan de beurt bent en er niets gebeurt.
  function beschikbaar() {
    const mag = aanDeBeurt();
    bord.setEnabled(mag);
    invoer.disabled = !mag;
    typKnop.disabled = !mag;
    if (tipKnop) tipKnop.disabled = !mag || (tipsOver !== null && tipsOver <= 0);
    if (terugKnop) terugKnop.disabled = !mag || !kanTerug();
  }

  function bijwerken() {
    if (!state) return;
    const path = bord.getPath();
    woord.textContent = path.map((i) => state.letters[i]).join('');
    let ok = false;
    bord.setPreview(null);
    if (!aanDeBeurt()) uitleg.textContent = busy ? 'Even wachten…' : '';
    else if (!path.length) uitleg.textContent = 'Veeg of tik op de letters om een woord te maken.';
    else if (path.length < MIN_LEN) uitleg.textContent = `Kies nog minstens ${MIN_LEN - path.length} ${MIN_LEN - path.length === 1 ? 'letter' : 'letters'}.`;
    else {
      try {
        const c = checkMove(state, me, path);
        ok = true;
        const hun = naam(other(me));
        const delen = [];
        if (c.took.length) delen.push(`pakt ${meervoud(c.took.length, 'vakje', 'vakjes')} van ${hun}`);
        if (c.fresh.length) delen.push(`kleurt ${meervoud(c.fresh.length, 'nieuw vakje', 'nieuwe vakjes')}`);
        uitleg.textContent = `Mooi woord. Dit ${delen.join(' en ')}.${c.kept.length ? ` ${meervoud(c.kept.length, 'vakje is', 'vakjes zijn')} beschermd en blijft van ${hun}.` : ''}`;
        bord.setPreview({ take: c.took, kept: c.kept });
      } catch (e) {
        if (!(e instanceof MoveError)) throw e;
        uitleg.textContent = e.message;
      }
    }
    klaarKnop.disabled = !ok;
    wis.disabled = !path.length && !invoer.value;
    el.classList.toggle('klaar-om', ok);
  }

  function typen() {
    const w = invoer.value.toLowerCase().replace(/[^a-z]/g, '');
    if (invoer.value !== w) invoer.value = w;
    plekken = []; plek = 0; anderePlek.hidden = true;
    if (!state || !aanDeBeurt()) return;
    if (w.length < MIN_LEN) { bord.clear(); return; }
    plekken = pathsFor(state, me, w);
    if (!plekken.length) {
      bord.clear();
      uitleg.textContent = 'Dit woord ligt niet op het bord, of het kleurt niets nieuws.';
      return;
    }
    anderePlek.hidden = plekken.length < 2;
    bord.setPath(plekken[0], 'typen');
  }

  // ----- Acties -----
  async function klaar() {
    if (klaarKnop.disabled || busy) return;
    const path = bord.getPath();
    busy = true; klaarKnop.disabled = true; bord.setEnabled(false); uitleg.textContent = 'Even wachten…';
    try {
      await onZet(path);
      invoer.value = ''; plekken = []; anderePlek.hidden = true;
      bord.setPath([], 'klaar');
    } catch (e) {
      uitleg.textContent = e.message || 'Dat lukte niet. Probeer het nog eens.';
    } finally {
      busy = false; beschikbaar(); bijwerken();
    }
  }

  async function tip() {
    if (!aanDeBeurt()) return;
    if (tipsOver !== null && tipsOver <= 0) { uitleg.textContent = 'Je hebt geen tips meer in deze partij.'; return; }
    try {
      const t = await onTip();
      if (!t) { uitleg.textContent = 'Er is geen woord meer te vinden.'; return; }
      if (tipsOver !== null) { tipsOver--; tipLabel(); }
      bord.wijs(t.start);
      uitleg.textContent = `Tip: zoek een woord van ${t.length} letters dat begint bij het oplichtende vakje.`;
    } catch (e) { uitleg.textContent = e.message || 'Dat lukte niet.'; }
  }
  function tipLabel() {
    if (!tipKnop) return;
    tipKnop.lastChild.textContent = tipsOver === null ? 'Tip' : `Tip (${tipsOver} over)`;
    tipKnop.disabled = tipsOver !== null && tipsOver <= 0;
  }

  async function terug() {
    if (busy || !onTerug) return;
    busy = true; terugKnop.disabled = true;
    try { await onTerug(); } catch (e) { uitleg.textContent = e.message || 'Dat lukte niet.'; } finally { busy = false; beschikbaar(); bijwerken(); }
  }

  tipLabel();

  return {
    el, bord,
    setState(s, { animeer = false } = {}) {
      state = s;
      bord.setState(s, me);
      if (!aanDeBeurt()) { bord.setPath([], 'stand'); invoer.value = ''; }
      beschikbaar();
      bijwerkenStand();
      bijwerken();
      if (animeer && s.last) bord.bloei([...s.last.fresh, ...s.last.took]);
    },
    setTips(n) { tipsOver = n; tipLabel(); },
    setBericht(t) { uitleg.textContent = t; },
    setBezig(b) { busy = b; if (state) { beschikbaar(); bijwerken(); } },
    vernieuw() { if (state) { beschikbaar(); bijwerken(); } },
    terugKnop,
  };
}
