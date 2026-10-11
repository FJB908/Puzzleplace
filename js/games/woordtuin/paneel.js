// Het scherm van een partij Woordtuin: stand, bord, het woord dat je maakt en de knoppen. Het paneel regelt zelf niets
// over wie wat speelt: de ouder (tegen de computer, of tegen een vriend via de server) geeft in `onZet` aan wat er met
// een zet gebeurt. Zo is het scherm voor beide precies hetzelfde.

import { h, icon, choiceDialog } from '../../ui.js';
import { t, foutTekst } from '../../i18n/index.js';
import { TALEN, vouw, isAlfabet, typInvoer } from '../../shared/talen.js';
import { maakBord, HEK, TULP } from './bord.js';
import { checkMove, MoveError, counts, pathsFor, MIN_LEN, other, taalVan } from './engine.js';

// tegenComputer: de tegenstander is de computer (dan zeggen we "de computer" in plaats van een naam)
export function maakPaneel({ onPas = null, me = 1, names = { 1: t('woordtuin.you'), 2: t('match.opponent') }, tegenComputer = false, tips = null, onZet, onTip, onTerug = null, kanTerug = () => true }) {
  let state = null, busy = false, tipsOver = tips, plekken = [], plek = 0;

  const bord = maakBord({ onChange: (path, bron) => bijwerken(bron) });

  // ----- Stand -----
  const num = (cls) => h('b', { class: cls }, '0');
  const mijnTal = num('wt-tal'), hunTal = num('wt-tal');
  let open = 0;
  const stand = h('div', { class: 'wt-stand' },
    h('div', { class: 'wt-kant mijn' }, h('span', { class: 'wt-bol', 'aria-hidden': 'true' }, '✿'), h('div', {}, mijnTal, h('small', {}, names[me]))),
    h('div', { class: 'wt-kant hun' }, h('div', {}, hunTal, h('small', {}, names[other(me)])), (() => { const e = h('span', { class: 'wt-bol', 'aria-hidden': 'true' }); e.innerHTML = TULP; return e; })()));

  const beurt = h('p', { class: 'wt-beurt', role: 'status', 'aria-live': 'polite' });
  const laatste = h('p', { class: 'wt-laatste' });

  // ----- Woord en uitleg -----
  const woord = h('strong', { class: 'wt-woord-tekst', 'aria-hidden': 'true' }, '');
  const uitleg = h('p', { class: 'wt-uitleg', role: 'status', 'aria-live': 'polite' });
  const woordBlok = h('div', { class: 'wt-woord' }, woord, uitleg);

  // ----- Typen -----
  const invoer = h('input', {
    type: 'text', class: 'wt-invoer', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', enterkeyhint: 'done',
    'aria-label': t('woordtuin.typeAria'), placeholder: t('woordtuin.typePlaceholder'),
    oninput: typen, onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); klaar(); } },
  });
  const anderePlek = h('button', { type: 'button', class: 'btn btn-quiet', hidden: true, onclick: () => { if (plekken.length > 1) { plek = (plek + 1) % plekken.length; bord.setPath(plekken[plek], 'typen'); } } }, t('woordtuin.otherPlace'));
  const typBlok = h('div', { class: 'wt-typ-body', hidden: true }, invoer, anderePlek);
  const typKnop = h('button', { type: 'button', class: 'btn', 'aria-expanded': 'false', onclick: () => {
    typBlok.hidden = !typBlok.hidden; typKnop.setAttribute('aria-expanded', String(!typBlok.hidden));
    if (!typBlok.hidden) invoer.focus();
  } }, icon('pencil'), t('woordtuin.type'));

  // ----- Knoppen -----
  const wis = h('button', { type: 'button', class: 'btn', onclick: () => { invoer.value = ''; plekken = []; bord.clear(); } }, icon('eraser'), t('woordtuin.clear'));
  const klaarKnop = h('button', { type: 'button', class: 'btn btn-primary', disabled: true, onclick: klaar }, icon('check'), t('woordtuin.done'));
  const tipKnop = onTip ? h('button', { type: 'button', class: 'btn', onclick: tip }, icon('bulb'), h('span', {}, t('common.hint'))) : null;
  const terugKnop = onTerug ? h('button', { type: 'button', class: 'btn', onclick: terug }, icon('undo'), t('woordtuin.undo')) : null;
  const knoppen = h('div', { class: 'wt-knoppen' }, wis, klaarKnop);
  const pasKnop = onPas ? h('button', { type: 'button', class: 'btn', onclick: pas }, icon('close'), h('span', {}, t('woordtuin.pass'))) : null;
  const extra = h('div', { class: 'wt-extra' }, tipKnop, terugKnop, pasKnop, typKnop);

  const hekje = h('span', {}); hekje.innerHTML = HEK; hekje.append(` ${t('woordtuin.legend')}`);
  const legenda = h('p', { class: 'wt-legenda' }, hekje);
  const el = h('div', { class: 'wt' }, stand, h('div', { class: 'wt-info' }, beurt, laatste), bord.el, legenda, woordBlok, typBlok, extra, knoppen);

  // Is de partij afgelopen en probeert iemand toch te spelen? Dan zeggen we dat vriendelijk.
  const alAfgelopen = () => { if (state?.over) { uitleg.textContent = t('err.move.over'); } };
  bord.el.addEventListener('pointerdown', alAfgelopen);
  bord.el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') alAfgelopen(); });

  // ----- Weergave -----
  const aanDeBeurt = () => !!state && !state.over && state.turn === me && !busy;
  const hun = other(me);
  // Wie is de ander in een zin? De computer, of een naam. `pc` en `other` zijn de twee soorten zinnen in het taalpakket.
  const wie = (p) => (p === me ? 'me' : tegenComputer ? 'pc' : 'other');
  const zinMet = (basis, p, params = {}) => t(`woordtuin.${basis}.${wie(p)}`, { name: names[p], ...params });

  function bijwerkenStand() {
    const c = counts(state);
    mijnTal.textContent = c[me]; hunTal.textContent = c[hun]; open = c[0];
    stand.setAttribute('aria-label', t('woordtuin.standAria', { me: names[me], mine: c[me], them: names[hun], theirs: c[hun], open: c[0] }));
    const nog = open ? ` ${t('woordtuin.openLeft', { n: open })}` : '';
    if (state.over) beurt.textContent = t('woordtuin.gameOver');
    else if (state.turn === me) beurt.textContent = `${t('woordtuin.yourTurn')}${nog}`;
    else beurt.textContent = `${tegenComputer ? t('woordtuin.theirTurnPc') : t('woordtuin.theirTurn', { name: names[state.turn] })}${nog}`;
    beurt.classList.toggle('jij', !state.over && state.turn === me);
    if (state.passed && !state.over) laatste.textContent = zinMet('passed', other(state.turn));
    else if (state.last?.pass) laatste.textContent = t(`woordtuin.last.${wie(state.last.player)}.pass`, { name: state.last.player === me ? names[hun] : names[state.last.player] });
    else if (state.last) {
      const l = state.last, word = l.word.toUpperCase();
      laatste.textContent = l.took.length
        ? t(`woordtuin.last.${wie(l.player)}.took`, { name: names[l.player], word, n: l.took.length })
        : t(`woordtuin.last.${wie(l.player)}`, { name: names[l.player], word });
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
    if (pasKnop) pasKnop.disabled = !mag;
  }

  function bijwerken() {
    if (!state) return;
    const path = bord.getPath();
    woord.textContent = path.map((i) => state.letters[i]).join('');
    let ok = false;
    bord.setPreview(null);
    if (!aanDeBeurt()) uitleg.textContent = busy ? t('woordtuin.waiting') : '';
    else if (!path.length) uitleg.textContent = t('woordtuin.hint.swipe');
    else if (path.length < MIN_LEN) uitleg.textContent = t('woordtuin.hint.more', { n: MIN_LEN - path.length });
    else {
      try {
        const c = checkMove(state, me, path);
        ok = true;
        // Wat dit woord oplevert, in korte zinnen achter elkaar
        const zinnen = [t('woordtuin.preview.nice')];
        if (c.took.length) zinnen.push(t('woordtuin.preview.take', { n: c.took.length }));
        if (c.fresh.length) zinnen.push(t('woordtuin.preview.fresh', { n: c.fresh.length }));
        if (c.kept.length) zinnen.push(t('woordtuin.preview.kept', { n: c.kept.length }));
        uitleg.textContent = zinnen.join(' ');
        bord.setPreview({ take: c.took, kept: c.kept });
      } catch (e) {
        if (!(e instanceof MoveError)) throw e;
        uitleg.textContent = foutTekst(e);
      }
    }
    klaarKnop.disabled = !ok;
    wis.disabled = !path.length && !invoer.value;
    el.classList.toggle('klaar-om', ok);
  }

  // Wat je typt: je ziet je eigen letters (met accenten), het bord rekent met de letters zonder accenten (zie shared/talen.js)
  function typen(e) {
    const taal = state ? taalVan(state) : 'en';
    if (!e?.isComposing) {
      const schoon = [...invoer.value.normalize('NFC')].filter((c) => isAlfabet(vouw(c, taal), taal)).join('');
      if (invoer.value !== schoon) invoer.value = schoon;
    }
    const w = typInvoer(invoer.value, taal);
    plekken = []; plek = 0; anderePlek.hidden = true;
    if (!state || !aanDeBeurt()) return;
    if (w.length < MIN_LEN) { bord.clear(); return; }
    plekken = pathsFor(state, me, w);
    if (!plekken.length) {
      bord.clear();
      uitleg.textContent = t('woordtuin.notOnBoard');
      return;
    }
    anderePlek.hidden = plekken.length < 2;
    bord.setPath(plekken[0], 'typen');
  }

  // ----- Acties -----
  async function klaar() {
    if (klaarKnop.disabled || busy) return;
    const path = bord.getPath();
    busy = true; klaarKnop.disabled = true; bord.setEnabled(false); uitleg.textContent = t('woordtuin.waiting');
    try {
      await onZet(path);
      invoer.value = ''; plekken = []; anderePlek.hidden = true;
      bord.setPath([], 'klaar');
    } catch (e) {
      uitleg.textContent = foutTekst(e);
    } finally {
      busy = false; beschikbaar(); bijwerken();
    }
  }

  async function tip() {
    if (!aanDeBeurt()) return;
    if (tipsOver !== null && tipsOver <= 0) { uitleg.textContent = t('woordtuin.noHintsLeft'); return; }
    try {
      const hint = await onTip();
      if (!hint) { uitleg.textContent = t('woordtuin.noWordLeft'); return; }
      if (tipsOver !== null) { tipsOver--; tipLabel(); }
      bord.wijs(hint.start);
      uitleg.textContent = t('woordtuin.hintText', { n: hint.length });
    } catch (e) { uitleg.textContent = foutTekst(e); }
  }
  function tipLabel() {
    if (!tipKnop) return;
    tipKnop.lastChild.textContent = tipsOver === null ? t('common.hint') : t('woordtuin.hintLeft', { n: tipsOver });
    tipKnop.disabled = tipsOver !== null && tipsOver <= 0;
  }

  // Passen: eerst vragen (en uitleggen dat het spel afloopt als de ander ook past), dan doorgeven
  async function pas() {
    if (!aanDeBeurt() || !onPas) return;
    const ander = names[hun];
    const ok = await choiceDialog({
      title: t('woordtuin.pass.title'),
      text: tegenComputer ? t('woordtuin.pass.text.pc') : t('woordtuin.pass.text.other', { name: ander }),
      actions: [{ label: t('common.noGoBack'), value: false, primary: true, autofocus: true }, { label: t('woordtuin.pass.yes'), value: true }],
      dismissValue: false,
    });
    if (!ok || !aanDeBeurt()) return;
    busy = true; beschikbaar(); uitleg.textContent = t('woordtuin.waiting');
    try { await onPas(); bord.setPath([], 'klaar'); invoer.value = ''; plekken = []; anderePlek.hidden = true; }
    catch (e) { uitleg.textContent = foutTekst(e); }
    finally { busy = false; beschikbaar(); bijwerken(); }
  }

  async function terug() {
    if (busy || !onTerug) return;
    busy = true; terugKnop.disabled = true;
    try { await onTerug(); } catch (e) { uitleg.textContent = foutTekst(e); } finally { busy = false; beschikbaar(); bijwerken(); }
  }

  tipLabel();

  return {
    el, bord,
    setState(s, { animeer = false } = {}) {
      state = s;
      const taal = taalVan(s);
      invoer.lang = TALEN[taal].locale;                         // voor de spellingcontrole en het toetsenbord van de telefoon
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
