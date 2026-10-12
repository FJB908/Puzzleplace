// Mahjong (tegels paren): het scherm. De regels staan in engine.js, de plaatjes in tegels.js.
//
// Tik een vrije tegel (die is licht) en daarna een tegel met hetzelfde plaatje: het paar verdwijnt. Vrij is een tegel als er niets op ligt en
// links of rechts open is. Zet terug is onbeperkt, een tip wijst altijd een zet aan die goed uitkomt, en Husselen verdeelt de tegels die nog liggen
// opnieuw, zo dat het weer te winnen is. Geen tijd, geen straf.

import { h, icon } from '../../ui.js';
import { t } from '../../i18n/index.js';
import { burst, motionOK } from '../../effects.js';
import { bord, newGame, neemWeg, zetTerug, hussel, tip, isVrij, wegSet, klaar, tegelsOver, vastgelopen, passen, progress } from './engine.js';
import { plaatjeSvg, plaatjeNaam } from './tegels.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const DIEPTE = 0.085;                       // dikte van een tegel en verschuiving per laag, als deel van de tegelbreedte
const RATIO = 1.28;                         // hoogte van een tegel ten opzichte van de breedte

const geldig = (s) => s && s.v === 1 && Array.isArray(s.faces) && Array.isArray(s.history) && ['makkelijk', 'gemiddeld', 'moeilijk', 'extreem'].includes(s.niveau) && s.faces.length === bord(s.niveau).n;

function plaatje(f) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 52'); svg.setAttribute('class', 'mj-plaatje'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  svg.innerHTML = plaatjeSvg(f);
  return svg;
}

export function mount(container, ctx) {
  let state = geldig(ctx.saved) ? ctx.saved : newGame(ctx.seed, ctx.difficulty);
  const b = bord(state.niveau);
  let gekozen = null, focus = 0, tipTimer = null, bezig = false, afgerond = false, dood = false;
  let groot = false;                                              // vergroten: grotere tegels, het bord schuift dan
  try { groot = localStorage.getItem('pp-mahjong-groot') === '1'; } catch { /* zonder opslag blijft het klein */ }

  // ----- Het scherm -----
  const aantal = h('span', { class: 'mj-aantal' });
  const paren = h('span', { class: 'mj-paren' });
  const balk = h('i', {});
  const melding = h('p', { class: 'mj-melding', role: 'status', 'aria-live': 'polite' });
  const bordEl = h('div', { class: 'mj-bord', role: 'group' });
  const veld = h('div', { class: 'mj-veld' }, bordEl);
  const terugKnop = h('button', { type: 'button', class: 'btn', onclick: terug }, icon('undo'), h('span', {}, t('mahjong.undo')));
  const tipKnop = h('button', { type: 'button', class: 'btn', onclick: geefTip }, icon('bulb'), h('span', {}, t('common.hint')));
  const husselKnop = h('button', { type: 'button', class: 'btn', onclick: husselen }, icon('shuffle'), h('span', {}, t('mahjong.shuffle')));
  const grootKnop = h('button', { type: 'button', class: 'btn', 'aria-pressed': String(groot), onclick: wisselGroot }, icon('woordzoeker'), h('span', {}, t(groot ? 'mahjong.smaller' : 'mahjong.bigger')));
  container.classList.add('stage--bare');
  container.append(h('div', { class: 'mj' },
    h('div', { class: 'mj-kop' }, h('div', { class: 'mj-tellers' }, aantal, paren), h('span', { class: 'ws-bar mj-balk', 'aria-hidden': 'true' }, balk)),
    melding, veld, h('div', { class: 'mj-knoppen' }, terugKnop, tipKnop, husselKnop, grootKnop)));

  const tegels = b.tegels.map((tg, i) => {
    const el = h('button', { type: 'button', class: 'mj-tegel', 'data-i': i, tabindex: '-1', onclick: () => klik(i), onkeydown: (e) => toets(e, i), onfocus: () => { focus = i; } },
      h('span', { class: 'mj-dikte', 'aria-hidden': 'true' }), h('span', { class: 'mj-gezicht', 'aria-hidden': 'true' }));
    el.style.setProperty('--x', tg.x); el.style.setProperty('--y', tg.y); el.style.setProperty('--z', tg.z); el.style.setProperty('--i', i);
    el._f = -1;
    return el;
  });
  bordEl.append(...tegels);
  bordEl.style.setProperty('--zmax', b.lagen - 1);

  // ----- Maten: de tegels zo groot als past (liefst groot), lange borden schuiven omlaag -----
  function pas() {
    const breedte = veld.clientWidth - 2 * parseFloat(getComputedStyle(veld).paddingLeft || 0);
    if (breedte <= 0) return;
    const kolommen = b.breed / 2, lagen = b.lagen - 1, rijen = b.hoog / 2;
    const perBreedte = breedte / (kolommen + (lagen + 1) * DIEPTE);
    const maxHoogte = Math.max(380, window.innerHeight * 0.74);
    const perHoogte = maxHoogte / (rijen * RATIO + (lagen + 1) * DIEPTE);
    const tw = groot ? Math.min(Math.max(perBreedte * 1.45, 52), 84) : Math.max(30, Math.min(perBreedte, Math.max(perHoogte, 44), 84));
    veld.classList.toggle('groot', groot);
    const th = tw * RATIO, d = tw * DIEPTE;
    bordEl.style.setProperty('--uw', `${tw / 2}px`); bordEl.style.setProperty('--uh', `${th / 2}px`); bordEl.style.setProperty('--d', `${d}px`); bordEl.style.setProperty('--tw', `${tw}px`);
    bordEl.style.width = `${b.breed * tw / 2 + (lagen + 1) * d}px`;
    bordEl.style.height = `${b.hoog * th / 2 + (lagen + 1) * d}px`;
  }
  function wisselGroot() {
    groot = !groot;
    try { localStorage.setItem('pp-mahjong-groot', groot ? '1' : '0'); } catch { /* geen opslag: dan geldt het alleen nu */ }
    grootKnop.setAttribute('aria-pressed', String(groot));
    grootKnop.querySelector('span').textContent = t(groot ? 'mahjong.smaller' : 'mahjong.bigger');
    pas();
  }
  const ro = new ResizeObserver(pas); ro.observe(veld);
  window.addEventListener('resize', pas);

  // ----- Weergave van de stand -----
  const faceNaam = (f) => { const [k, p] = plaatjeNaam(f); return t(k, p); };
  function verfris({ behoud = [] } = {}) {
    const weg = wegSet(state);
    const matchFace = gekozen !== null ? state.faces[gekozen] : null;
    // Welke vrije tegels hebben nu een vrije tegel die erbij past? Die zijn te zien aan een gouden randje, en geteld boven het bord.
    const vrijen = tegels.flatMap((_, i) => (!weg.has(i) && isVrij(state, i, weg) ? [i] : []));
    const heeftMaatje = new Set(vrijen.filter((i) => vrijen.some((j) => j !== i && passen(state.faces[i], state.faces[j]))));
    let nMogelijk = 0;
    { const gebruikt = new Set(); for (const i of vrijen) { if (gebruikt.has(i)) continue; const j = vrijen.find((x) => x !== i && !gebruikt.has(x) && passen(state.faces[i], state.faces[x])); if (j !== undefined) { gebruikt.add(i); gebruikt.add(j); nMogelijk++; } } }
    tegels.forEach((el, i) => {
      const f = state.faces[i], isWeg = weg.has(i);
      if (el._f !== f) {
        el._f = f;
        const g = el.querySelector('.mj-gezicht'); g.replaceChildren(plaatje(f));
        g.classList.toggle('bloem', f >= 34 && f <= 37); g.classList.toggle('seizoen', f >= 38);
      }
      const vrij = !isWeg && isVrij(state, i, weg);
      el.classList.toggle('weg', isWeg && !behoud.includes(i));
      el.classList.toggle('vrij', vrij); el.classList.toggle('vast', !isWeg && !vrij);
      el.classList.toggle('gekozen', gekozen === i);
      el.classList.toggle('speelbaar', vrij && heeftMaatje.has(i));
      el.classList.toggle('maatje', vrij && gekozen !== null && i !== gekozen && passen(matchFace, f));
      el.disabled = isWeg && !behoud.includes(i);
      el.setAttribute('aria-pressed', String(gekozen === i));
      el.setAttribute('aria-label', t(vrij ? 'mahjong.tile.free' : 'mahjong.tile.blocked', { face: faceNaam(f) }));
    });
    const n = tegelsOver(state);
    aantal.textContent = t('mahjong.left', { n });
    paren.textContent = klaar(state) ? '' : t('mahjong.pairs', { n: nMogelijk });
    balk.style.width = `${Math.round(progress(state) * 100)}%`;
    bordEl.setAttribute('aria-label', t('mahjong.boardAria', { n }));
    terugKnop.disabled = state.history.length === 0;
    wisFocusAnker();
  }
  // Eén tegel is bereikbaar met Tab (de rest met de pijltjes): liefst de gekozen of de laatst gebruikte, anders de eerste vrije
  function wisFocusAnker() {
    const weg = wegSet(state);
    let anker = tegels[focus] && !weg.has(focus) ? focus : tegels.findIndex((_, i) => isVrij(state, i, weg));
    if (anker < 0) anker = tegels.findIndex((_, i) => !weg.has(i));
    tegels.forEach((el, i) => { el.tabIndex = i === anker ? 0 : -1; });
  }
  const zeg = (tekst) => { melding.textContent = tekst; };

  // ----- Bewaren en afronden -----
  function bewaar() { ctx.save(state, { progress: progress(state) }); }
  function controleer() {
    if (klaar(state)) { if (!afgerond) winnen(); return; }
    if (vastgelopen(state)) { zeg(t('mahjong.msg.noMoves', { shuffle: t('mahjong.shuffle') })); wijsHussel(); }
  }
  function winnen() {
    afgerond = true;
    if (motionOK()) {
      const r = bordEl.getBoundingClientRect();
      for (let k = 0; k < 5; k++) setTimeout(() => !dood && burst({ x: r.left + r.width * (0.15 + 0.175 * k), y: r.top + r.height * 0.45, count: 14, power: 340, cone: [-165, -15], size: [12, 22], life: [1400, 2200] }), k * 140);
    }
    ctx.complete({ title: t('mahjong.done.title'), text: t('mahjong.done.text'), joy: true, delay: motionOK() ? 1100 : 0 });
  }

  // ----- Kiezen en wegnemen -----
  function kies(i) {
    gekozen = i; wisTip(); verfris();
    if (i === null) { zeg(t('mahjong.msg.start')); return; }
    const heeftMaatje = tegels.some((el) => el.classList.contains('maatje'));
    zeg(t(heeftMaatje ? 'mahjong.msg.picked' : 'mahjong.msg.noPartner'));
  }
  function klik(i) {
    if (afgerond || bezig) return;
    const weg = wegSet(state);
    if (weg.has(i)) return;
    if (!isVrij(state, i, weg)) { wiebel(tegels[i]); zeg(t('mahjong.msg.blocked')); return; }
    if (gekozen === null) { kies(i); return; }
    if (gekozen === i) { kies(null); return; }
    if (passen(state.faces[gekozen], state.faces[i])) { neem(gekozen, i); return; }
    kies(i);                                    // een andere vrije tegel: die wordt nu gekozen (geen straf, geen melding)
  }
  function neem(a, c) {
    wisTip();
    state = neemWeg(state, a, c);
    gekozen = null;
    bewaar();
    verfris({ behoud: [a, c] });
    vlieg(tegels[a], tegels[c]);
    zeg(t('mahjong.msg.pair', { n: tegelsOver(state) }));
    controleer();
  }

  // ----- Animaties (alleen als beweging mag) -----
  function wiebel(el) {
    el.classList.add('schud'); setTimeout(() => el.classList.remove('schud'), 450);
    if (!motionOK()) return;
    el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-.4em)' }, { transform: 'translateX(.4em)' }, { transform: 'translateX(-.32em)' }, { transform: 'translateX(.26em)' }, { transform: 'translateX(-.12em)' }, { transform: 'translateX(0)' }], { duration: 420, easing: 'ease-in-out' });
  }
  function vlieg(e1, e2) {
    const verberg = () => { for (const e of [e1, e2]) { e.classList.add('weg'); e.disabled = true; } };
    if (!motionOK()) { verberg(); return; }
    const r1 = e1.getBoundingClientRect(), r2 = e2.getBoundingClientRect();
    const mx = (r1.left + r1.right + r2.left + r2.right) / 4, my = (r1.top + r1.bottom + r2.top + r2.bottom) / 4;
    let klaarTel = 0;
    for (const e of [e1, e2]) {
      const r = e.getBoundingClientRect(), dx = mx - (r.left + r.right) / 2, dy = my - (r.top + r.bottom) / 2;
      e.style.pointerEvents = 'none'; e.classList.add('vliegt');
      const an = e.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: 'translate(0, -.5em) scale(1.12)', opacity: 1, offset: 0.28 },
        { transform: `translate(${dx * 0.85}px, ${dy * 0.85 - 6}px) scale(.74)`, opacity: 0.9, offset: 0.78 },
        { transform: `translate(${dx}px, ${dy - 6}px) scale(.5)`, opacity: 0 },
      ], { duration: 520, easing: 'cubic-bezier(.4, .1, .3, 1)', fill: 'forwards' });
      an.finished.then(() => { e.style.pointerEvents = ''; e.classList.remove('vliegt'); if (++klaarTel === 2) verberg(); e.getAnimations().forEach((x) => x.cancel()); }, () => { e.style.pointerEvents = ''; });
    }
    setTimeout(() => !dood && burst({ x: mx, y: my, count: 9, power: 190, cone: [-170, -10], size: [9, 16], life: [800, 1300] }), 300);
  }
  function binnenKomen(els) {
    if (!motionOK()) return;
    els.forEach((e, k) => e.animate([{ transform: 'scale(.6) translateY(-.6em)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380, delay: k * 60, easing: 'ease-out', fill: 'backwards' }));
  }
  // Het uitdelen aan het begin: de tegels vallen laag voor laag neer
  function uitdelen() {
    if (!motionOK()) return;
    tegels.forEach((el, i) => {
      const tg = b.tegels[i], vertraging = tg.z * 140 + (tg.y * 22 + tg.x * 9);
      el.animate([{ transform: 'translateY(-1.6em) scale(.9)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 420, delay: Math.min(vertraging, 900), easing: 'cubic-bezier(.2,.8,.3,1.1)', fill: 'backwards' });
    });
  }

  // ----- Knoppen -----
  function terug() {
    if (!state.history.length || bezig) return;
    const laatste = state.history.at(-1);
    state = zetTerug(state);
    gekozen = null; wisTip(); afgerond = false;
    bewaar(); verfris();
    if (laatste.t === 'p') { binnenKomen([tegels[laatste.a], tegels[laatste.b]]); zeg(t('mahjong.msg.undone')); }
    else { flip(); zeg(t('mahjong.msg.undone')); }
  }
  function geefTip() {
    if (afgerond || bezig) return;
    wisTip();
    const z = tip(state);
    if (!z) { zeg(t('mahjong.msg.noMoves', { shuffle: t('mahjong.shuffle') })); wijsHussel(); return; }
    gekozen = null; verfris();
    for (const i of z) tegels[i].classList.add('tip');
    tegels[z[0]].scrollIntoView?.({ block: 'center', behavior: motionOK() ? 'smooth' : 'auto' });
    zeg(t('mahjong.msg.tip'));
    tipTimer = setTimeout(wisTip, 3600);
  }
  function wisTip() { clearTimeout(tipTimer); tegels.forEach((el) => el.classList.remove('tip')); husselKnop.classList.remove('wijs'); }
  function wijsHussel() { husselKnop.classList.add('wijs'); }
  function husselen() {
    if (afgerond || bezig || klaar(state)) return;
    wisTip(); gekozen = null;
    state = hussel(state);
    bewaar();
    if (!motionOK()) { verfris(); zeg(t('mahjong.msg.shuffled')); return; }
    bezig = true;
    bordEl.classList.add('husselt-uit');
    setTimeout(() => { if (dood) return; verfris(); bordEl.classList.remove('husselt-uit'); bordEl.classList.add('husselt-in'); setTimeout(() => { bordEl.classList.remove('husselt-in'); bezig = false; }, 520); zeg(t('mahjong.msg.shuffled')); controleer(); }, 260);
  }
  function flip() {
    if (!motionOK()) return;
    bordEl.classList.add('husselt-in'); setTimeout(() => bordEl.classList.remove('husselt-in'), 520);
  }

  // ----- Toetsenbord: Tab naar het bord, pijltjes tussen tegels, Enter of spatie kiest, Escape laat los -----
  function toets(e, i) {
    if (e.key === 'Escape') { if (gekozen !== null) { kies(null); tegels[i].focus(); } return; }
    const richting = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
    if (!richting) return;
    e.preventDefault();
    const weg = wegSet(state), van = b.tegels[i];
    let best = -1, bestScore = Infinity;
    b.tegels.forEach((tg, j) => {
      if (j === i || weg.has(j)) return;
      const dx = (tg.x - van.x) * richting[0] + (tg.y - van.y) * richting[1];          // vooruit in de gekozen richting
      const zij = Math.abs((tg.x - van.x) * richting[1]) + Math.abs((tg.y - van.y) * richting[0]);
      if (dx < 1) return;
      const score = dx + zij * 2 + Math.abs(tg.z - van.z) * 0.5 + (isVrij(state, j, weg) ? 0 : 3);
      if (score < bestScore) { bestScore = score; best = j; }
    });
    if (best >= 0) { tegels.forEach((el, j) => { el.tabIndex = j === best ? 0 : -1; }); tegels[best].focus(); }
  }

  // ----- Start -----
  pas();
  verfris();
  zeg(t('mahjong.msg.start'));
  if (!ctx.saved || !geldig(ctx.saved)) { bewaar(); uitdelen(); }
  if (klaar(state)) afgerond = true; else controleer();
  return () => { dood = true; ro.disconnect(); window.removeEventListener('resize', pas); clearTimeout(tipTimer); };
}
