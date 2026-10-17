// Letterhof: het scherm. De regels staan in engine.js, de computer in computer.js, de woordenlijst in woordenboek.js.
//
// Je tikt een steen in je rek en daarna een vakje op het bord (of sleept hem erheen). Tik een steen op het bord om hem terug te nemen. Een lege steen
// mag elke letter zijn. Met "Spelen" leg je de zet vast; staat er een woord niet in de lijst, dan zeg ik welk en kun je het aanpassen. Geen tijd, geen straf.

import { h, icon, confirmDialog } from '../../ui.js';
import { t } from '../../i18n/index.js';
import { motionOK } from '../../effects.js';
import { felicitatie } from '../../shared/felicitatie.js';
import { bloesemFig, PLAATJE_DEFS } from '../mahjong/tegels.js';
import { N, MIDDEN, REK, BINGO, PREMIE, nieuwSpel, beoordeel, speel, pas as passen, wissel as wisselen, kanWisselen, waarde, isJoker, maakToeval, woordenVan, puntenVan, bordLeeg } from './engine.js';
import { laadWoordenboek } from './woordenboek.js';
import { kiesActie, tipZet } from './computer.js';
import { LETTERS } from './letters.js';
import { tipToestemming, tipGebruikt, tipKnopStand } from '../../steun/index.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const NIVEAUS = ['makkelijk', 'gemiddeld', 'moeilijk', 'extreem'];

const geldig = (s, taal) => !!s && s.v === 1 && s.taal === taal && Array.isArray(s.bord) && s.bord.length === N * N && Array.isArray(s.zak) && Array.isArray(s.rek) && s.rek.length === 2
  && Array.isArray(s.zetten) && NIVEAUS.includes(s.niveau);
const zaadGetal = (tekst) => { let a = 2166136261; for (const c of String(tekst)) { a ^= c.charCodeAt(0); a = Math.imul(a, 16777619); } return a >>> 0; };
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
const hoofdletter = (l) => l.toUpperCase();

// De kleine tekeningen op de bonusvakjes: een steen (letterbonus) en drie stenen naast elkaar (woordbonus)
const GLYF_LETTER = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3" y="2.5" width="6" height="7" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
const GLYF_WOORD = '<svg viewBox="0 0 12 12" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1"><rect x="0.8" y="3.6" width="3" height="4.8" rx=".9"/><rect x="4.5" y="3.6" width="3" height="4.8" rx=".9"/><rect x="8.2" y="3.6" width="3" height="4.8" rx=".9"/></g></svg>';
const PREMIE_TEKST = { L2: ['2', GLYF_LETTER], L3: ['3', GLYF_LETTER], W2: ['2', GLYF_WOORD], W3: ['3', GLYF_WOORD] };
const PREMIE_NAAM = { L2: 'letterhof.premie.L2', L3: 'letterhof.premie.L3', W2: 'letterhof.premie.W2', W3: 'letterhof.premie.W3' };

export async function mount(container, ctx) {
  const taal = ctx.taal;
  const wb = await laadWoordenboek(taal);
  if (!document.getElementById('mj-defs')) document.body.insertAdjacentHTML('beforeend', `<svg id="mj-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${PLAATJE_DEFS}</svg>`);
  let st = geldig(ctx.saved, taal) ? ctx.saved : nieuwSpel({ taal, seed: zaadGetal(ctx.seed), niveau: NIVEAUS.includes(ctx.difficulty) ? ctx.difficulty : 'gemiddeld' });
  st.tip ??= false;

  // wat er nu (nog niet vastgelegd) op het bord ligt, en je rek zoals het op het scherm staat
  let leg = new Map();                 // vakje -> {l, id}
  let rekUI = [];                      // [{id, ch}] in de volgorde van het scherm
  let volgnr = 1, gekozen = null, bezig = false, dood = false, ingezoomd = false, laatste = new Set(), tipSet = new Set(), melding = '';

  // ----- Het scherm -----
  const naamJij = t('letterhof.you'), naamPc = t('woordtuin.computer');
  const scoreJij = h('b', { class: 'lh-score-n' }), scorePc = h('b', { class: 'lh-score-n' });
  const plaatJij = h('div', { class: 'lh-plaat jij' }, h('span', { class: 'lh-plaat-naam' }, naamJij), scoreJij);
  const plaatPc = h('div', { class: 'lh-plaat pc' }, h('span', { class: 'lh-plaat-naam' }, naamPc), scorePc);
  const zakTeller = h('span', { class: 'lh-zak' });
  const meldEl = h('p', { class: 'lh-melding', role: 'status', 'aria-live': 'polite' });
  const bordEl = h('div', { class: 'lh-bord', role: 'grid', 'aria-label': t('letterhof.name') });
  const bordWrap = h('div', { class: 'lh-bordwrap' }, bordEl);
  const rekEl = h('div', { class: 'lh-rek', role: 'group', 'aria-label': t('letterhof.rack') });
  const knop = (klas, ico, tekst, onclick) => h('button', { type: 'button', class: `btn ${klas}`.trim(), onclick }, icon(ico), h('span', {}, tekst));
  const speelKnop = knop('btn-primary lh-speel', 'check', t('letterhof.play'), () => speelZet());
  const actie = (ico, tekst, onclick) => knop('action-btn', ico, tekst, onclick);          // een pictogram met een woord eronder, zoals bij Sudoku
  const terugKnop = actie('undo', t('letterhof.recall'), () => alleTerug());
  const wisselKnop = actie('swap', t('letterhof.exchange'), () => wisselDialoog());
  const passKnop = actie('skip', t('letterhof.pass'), () => passBevestig());
  const tipKnop = actie('bulb', t('common.hint'), () => geefTip());
  const husselKnop = h('button', { type: 'button', class: 'lh-hussel', 'aria-label': t('letterhof.shuffle'), title: t('letterhof.shuffle'), onclick: () => husselRek() }, icon('shuffle'));
  const zoomKnop = h('button', { type: 'button', class: 'lh-zoom', onclick: () => zoom() });         // een rond knopje op het bord (pictogram, met een naam voor schermlezers)
  container.classList.add('stage--bare');
  container.append(h('div', { class: 'lh' },
    h('div', { class: 'lh-kop' }, plaatJij, zakTeller, plaatPc),
    meldEl, h('div', { class: 'lh-bordkader' }, bordWrap, zoomKnop),
    h('div', { class: 'lh-onder' }, h('div', { class: 'lh-rekrij' }, rekEl, husselKnop),
      h('div', { class: 'lh-knoppen' }, speelKnop, h('div', { class: 'lh-acties' }, terugKnop, tipKnop, wisselKnop, passKnop)))));

  // het bord: 225 vakjes
  const vakken = [];
  for (let i = 0; i < N * N; i++) {
    const r = Math.floor(i / N), c = i % N;
    const pm = PREMIE[i];
    const el = h('div', { class: `lh-vak${pm ? ` ${pm}` : ''}${i === MIDDEN * N + MIDDEN ? ' midden' : ''}`, role: 'gridcell', 'data-i': i, tabindex: '-1' });
    if (i === MIDDEN * N + MIDDEN) el.innerHTML = `<svg class="lh-bloem" viewBox="-20 -20 40 40" aria-hidden="true">${bloesemFig(0, 0, 13, true)}</svg>`;
    else if (pm) { const [num, glyf] = PREMIE_TEKST[pm]; el.innerHTML = `<span class="lh-glyf">${glyf}</span><span class="lh-num">${num}</span>`; }
    el.addEventListener('click', () => klikVak(i));
    el.addEventListener('keydown', (e) => toetsVak(e, i));
    el._i = i; el._r = r; el._c = c;
    vakken.push(el);
  }
  bordEl.append(...vakken);

  // ----- Maten -----
  function pasMaat() {
    const rekB = rekEl.clientWidth;                                    // de stenen van het rek vullen het rek (zeven naast elkaar), ook op een smal scherm met grote tekst
    if (rekB > 0) {
      const ps = getComputedStyle(rekEl), pad = parseFloat(ps.paddingLeft) + parseFloat(ps.paddingRight), gat = parseFloat(ps.columnGap) || 4;
      rekEl.style.setProperty('--vak', `${Math.max(28, Math.min(Math.floor((rekB - pad - gat * (REK - 1) - 2) / REK), 56))}px`);
    }
    const breedte = bordWrap.clientWidth;
    if (breedte <= 0) return;
    const stijl = getComputedStyle(bordWrap), rand = parseFloat(stijl.paddingLeft) + parseFloat(stijl.paddingRight);
    const ruimte = breedte - rand - 14 - 4 - 6;                       // min de randjes en de naden tussen de vakjes
    let vak = Math.floor(ruimte / N);
    vak = Math.max(18, Math.min(vak, 46));
    if (ingezoomd) vak = Math.max(vak, Math.min(46, Math.floor(breedte / 8.5)));
    bordEl.style.setProperty('--vak', `${vak}px`);
    bordEl.classList.toggle('klein', vak < 30);
    bordWrap.classList.toggle('ingezoomd', ingezoomd);
    zoomKnop.replaceChildren(icon(ingezoomd ? 'shrink' : 'expand'));
    zoomKnop.setAttribute('aria-label', t(ingezoomd ? 'letterhof.zoomOut' : 'letterhof.zoomIn')); zoomKnop.title = t(ingezoomd ? 'letterhof.zoomOut' : 'letterhof.zoomIn');
  }
  function zoom() {
    ingezoomd = !ingezoomd;
    pasMaat();
    if (ingezoomd) { const z = laatste.size ? [...laatste][0] : MIDDEN * N + MIDDEN; scrollNaar(z); }
  }
  function scrollNaar(i) {
    const el = vakken[i], w = bordWrap;
    w.scrollTo({ left: el.offsetLeft - w.clientWidth / 2 + el.offsetWidth / 2, top: el.offsetTop - w.clientHeight / 2 + el.offsetHeight / 2, behavior: motionOK() ? 'smooth' : 'auto' });
  }
  const ro = new ResizeObserver(() => pasMaat());
  ro.observe(bordWrap); ro.observe(rekEl);

  // ----- Het rek -----
  function synchroniseerRek() {
    // behoud de volgorde van het scherm voor stenen die er nog zijn; nieuwe stenen komen achteraan
    const nodig = [...st.rek[0]];
    const nieuw = [];
    for (const x of rekUI) { const i = nodig.indexOf(x.ch); if (i >= 0) { nodig.splice(i, 1); nieuw.push(x); } }
    for (const ch of nodig) nieuw.push({ id: volgnr++, ch });
    rekUI = nieuw;
  }
  const nietGelegd = () => rekUI.filter((x) => ![...leg.values()].some((p) => p.id === x.id));

  // ----- Tekenen -----
  const tegelHtml = (l, uitgebreid = false) => {
    const jok = isJoker(l);
    const w = jok ? 0 : waarde(taal, l);
    return `<span class="lh-l">${hoofdletter(l)}</span>${w ? `<span class="lh-w">${w}</span>` : ''}${uitgebreid ? '' : ''}`;
  };
  function maakSteen(l, id = null) {
    const jok = isJoker(l);
    const el = h('div', { class: `lh-steen${jok ? ' joker' : ''}`, 'data-id': id ?? '' });
    el.innerHTML = tegelHtml(l);
    return el;
  }
  function teken() {
    for (let i = 0; i < N * N; i++) {
      const el = vakken[i];
      const vast = st.bord[i], los = leg.get(i), spook = tipSet.has(i);
      const ch = vast ?? los?.l ?? null;
      const sleutel = `${ch ?? ''}|${los ? 'l' : ''}|${laatste.has(i) ? 'z' : ''}`;
      if (el._k === sleutel) continue;
      el._k = sleutel;
      el.querySelector('.lh-steen')?.remove();
      el.classList.toggle('bezet', ch !== null);
      el.classList.toggle('los', !!los);
      el.classList.toggle('laatste', laatste.has(i));
      if (ch !== null) {
        const s = maakSteen(ch);
        if (los) s.classList.add('nieuw');
        el.append(s);
      }
      el.setAttribute('aria-label', vakNaam(i, ch));
      void spook;
    }
    rekEl.replaceChildren(...nietGelegd().map((x, k) => {
      const e = h('button', { type: 'button', class: `lh-rekstee${gekozen === x.id ? ' gekozen' : ''}`, 'data-id': x.id, 'aria-pressed': gekozen === x.id ? 'true' : 'false', 'aria-label': steenNaam(x.ch), onclick: () => klikRek(x.id) });
      const s = maakSteen(x.ch === '?' ? '?' : x.ch);
      if (x.ch === '?') { s.classList.add('leeg'); s.innerHTML = `<svg class="lh-blank" viewBox="-20 -20 40 40" aria-hidden="true">${bloesemFig(0, 0, 12, true)}</svg>`; }
      e.append(s);
      e.style.setProperty('--k', k);
      slepen(e, { soort: 'rek', id: x.id });
      return e;
    }));
    scoreJij.textContent = st.score[0]; scorePc.textContent = st.score[1];
    plaatJij.classList.toggle('aan', !st.eind && st.beurt === 0); plaatPc.classList.toggle('aan', !st.eind && st.beurt === 1);
    zakTeller.textContent = t('letterhof.bag', { n: st.zak.length });
    const mijn = st.beurt === 0 && !st.eind && !bezig;
    speelKnop.disabled = !mijn || leg.size === 0;
    terugKnop.disabled = !mijn || leg.size === 0;
    wisselKnop.disabled = !mijn || leg.size > 0;
    passKnop.disabled = !mijn || leg.size > 0;
    tipKnopStand(tipKnop, st, !mijn);
    husselKnop.disabled = !mijn;
    meldEl.textContent = melding;
    tipSet = new Set();
  }
  function vakNaam(i, ch) {
    const r = Math.floor(i / N) + 1, c = (i % N) + 1;
    const pm = PREMIE[i];
    return `${t('letterhof.cell', { r, c })}${ch ? `, ${ch.toUpperCase()}` : ''}${pm && !ch ? `, ${t(PREMIE_NAAM[pm])}` : ''}`;
  }
  const steenNaam = (ch) => (ch === '?' ? t('letterhof.blank') : `${ch.toUpperCase()} ${waarde(taal, ch)}`);
  function zeg(tekst) { melding = tekst; meldEl.textContent = tekst; }

  // ----- Stenen neerleggen -----
  const eigenBeurt = () => st.beurt === 0 && !st.eind && !bezig;
  function klikRek(id) {
    if (!eigenBeurt()) return;
    gekozen = gekozen === id ? null : id;
    teken(); voorbeeld();
  }
  async function klikVak(i) {
    if (!eigenBeurt()) return;
    if (st.bord[i] !== null) return;
    const los = leg.get(i);
    if (los) { leg.delete(i); gekozen = null; teken(); voorbeeld(); return; }          // een steen die je net legde: terug naar je rek
    if (gekozen === null) { const eerste = nietGelegd()[0]; if (!eerste) return; gekozen = eerste.id; }
    await leegVakje(i, gekozen);
  }
  async function leegVakje(i, id) {
    const x = rekUI.find((s) => s.id === id);
    if (!x) return;
    let l = x.ch;
    if (l === '?') { l = await kiesLetter(); if (!l) return; l = hoofdletter(l); }
    leg.set(i, { l, id });
    gekozen = null;
    teken(); voorbeeld();
  }
  function alleTerug() { leg = new Map(); gekozen = null; teken(); voorbeeld(); }
  function husselRek() {
    for (let i = rekUI.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rekUI[i], rekUI[j]] = [rekUI[j], rekUI[i]]; }
    teken();
  }
  function toetsVak(e, i) {
    const r = Math.floor(i / N), c = i % N;
    const naar = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[e.key];
    if (naar) { e.preventDefault(); const rr = Math.max(0, Math.min(N - 1, r + naar[0])), cc = Math.max(0, Math.min(N - 1, c + naar[1])); vakken[rr * N + cc].focus(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); klikVak(i); }
  }
  bordEl.addEventListener('focusin', (e) => { const el = e.target.closest('.lh-vak'); bordEl.querySelectorAll('.lh-vak[tabindex="0"]').forEach((x) => { if (x !== el) x.tabIndex = -1; }); if (el) el.tabIndex = 0; });
  vakken[MIDDEN * N + MIDDEN].tabIndex = 0;

  // ----- Slepen: een steen uit je rek (of een los liggende steen op het bord) naar een vakje -----
  function slepen(el, bron) {
    el.addEventListener('pointerdown', (e) => {
      if (!eigenBeurt() || e.button > 0) return;
      const x0 = e.clientX, y0 = e.clientY;
      let spook = null, sleept = false;
      const id = bron.id;
      const op = (ev) => {
        if (!sleept && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
        if (!sleept) {
          sleept = true;
          spook = el.cloneNode(true); spook.classList.add('lh-spook'); document.body.append(spook);
          const r = el.getBoundingClientRect(); spook.style.width = `${r.width}px`; spook.style.height = `${r.height}px`;
          el.classList.add('weg');
        }
        spook.style.transform = `translate(${ev.clientX - spook.offsetWidth / 2}px, ${ev.clientY - spook.offsetHeight / 1.2}px)`;
        const doel = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.lh-vak');
        bordEl.querySelectorAll('.lh-vak.doel').forEach((v) => v.classList.remove('doel'));
        if (doel && st.bord[doel._i] === null && !leg.has(doel._i)) doel.classList.add('doel');
      };
      const klaar = (ev) => {
        window.removeEventListener('pointermove', op); window.removeEventListener('pointerup', klaar); window.removeEventListener('pointercancel', klaar);
        bordEl.querySelectorAll('.lh-vak.doel').forEach((v) => v.classList.remove('doel'));
        if (!sleept) return;
        spook.remove(); el.classList.remove('weg');
        const doel = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.lh-vak');
        el._net = Date.now();
        if (doel && st.bord[doel._i] === null && !leg.has(doel._i)) leegVakje(doel._i, id);
      };
      window.addEventListener('pointermove', op); window.addEventListener('pointerup', klaar); window.addEventListener('pointercancel', klaar);
    });
    // na een sleepbeweging hoort er geen tik achteraan
    el.addEventListener('click', (e) => { if (el._net && Date.now() - el._net < 250) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }

  // ----- Een letter kiezen voor een lege steen -----
  function kiesLetter() {
    return new Promise((klaar) => {
      const dlg = h('dialog', { class: 'lh-dialoog' });
      const letters = Object.keys(LETTERS[taal].letters);
      dlg.append(h('h2', {}, t('letterhof.chooseLetter')),
        h('div', { class: 'lh-letterkeuze' }, ...letters.map((l) => h('button', { type: 'button', class: 'lh-lk', onclick: () => { dlg.close(l); } }, l.toUpperCase()))),
        h('div', { class: 'lh-dlg-knoppen' }, h('button', { type: 'button', class: 'btn', onclick: () => dlg.close('') }, t('letterhof.cancel'))));
      dlg.addEventListener('close', () => { const v = dlg.returnValue; dlg.remove(); klaar(v || null); });
      document.body.append(dlg);
      dlg.showModal();
    });
  }

  // ----- Voorbeeld van je zet -----
  function plaatsingen() { return [...leg.entries()].map(([i, p]) => ({ r: Math.floor(i / N), c: i % N, l: p.l })); }
  const FOUTEN = { lijn: 'letterhof.fout.lijn', gat: 'letterhof.fout.gat', midden: 'letterhof.fout.midden', kort: 'letterhof.fout.kort', los: 'letterhof.fout.los', leeg: 'letterhof.fout.leeg' };
  function voorbeeld() {
    if (!eigenBeurt()) return;
    if (!leg.size) { zeg(bordLeeg(st) ? t('letterhof.firstMove') : t('letterhof.yourTurn')); return; }
    const pl = plaatsingen();
    const w = woordenVan(st, pl);
    if (w.fout) { zeg(t(FOUTEN[w.fout] ?? 'letterhof.fout.lijn')); return; }
    if (!w.woorden.length) { zeg(t(FOUTEN[bordLeeg(st) ? 'kort' : 'los'])); return; }       // één losse steen maakt nog geen woord
    const { totaal } = puntenVan(taal, w.woorden, w.nieuw);
    const bingo = pl.length === REK ? BINGO : 0;
    zeg(t('letterhof.preview', { points: totaal + bingo, word: w.woorden[0].tekst.toUpperCase() }));
  }

  // ----- Een zet spelen -----
  async function speelZet() {
    if (!eigenBeurt() || !leg.size) return;
    const pl = plaatsingen();
    const r = speel(st, 0, pl, wb);
    if (!r.ok) {
      if (r.fout === 'woord') zeg(t('letterhof.fout.woord', { words: r.ongeldig.map((x) => x.toUpperCase()).join(', ') }));
      else zeg(t(FOUTEN[r.fout] ?? 'letterhof.fout.lijn'));
      wiebel(); return;
    }
    laatste = new Set(pl.map((p) => p.r * N + p.c));
    leg = new Map(); gekozen = null;
    synchroniseerRek();
    zeg(t('letterhof.scored', { word: r.woorden[0].tekst.toUpperCase(), points: r.punten }) + (r.bingo ? ` ${t('letterhof.bingo', { points: BINGO })}` : ''));
    punten(laatste, r.punten);
    ctx.grootBeeld?.auto();
    await na();
  }
  function wiebel() { if (!motionOK()) return; for (const i of leg.keys()) { const s = vakken[i].querySelector('.lh-steen'); if (s) { s.classList.remove('schud'); void s.offsetWidth; s.classList.add('schud'); } } }
  function punten(cellen, n) {
    if (!motionOK() || !n) return;
    const eerste = [...cellen][0];
    const el = vakken[eerste]; if (!el) return;
    const pop = h('span', { class: 'lh-pop' }, `+${n}`);
    el.append(pop); setTimeout(() => pop.remove(), 1500);
  }

  async function na() {
    bewaar();
    teken();
    if (st.eind) { await einde(); return; }
    if (st.beurt === 1) await computerBeurt();
    else voorbeeld();
  }
  const bewaar = () => ctx.save(st, { progress: Math.max(0, Math.min(1, 1 - (st.zak.length + st.rek[0].length + st.rek[1].length) / 102)) });

  async function computerBeurt() {
    bezig = true; teken();
    zeg(t('letterhof.thinking'));
    await wacht(motionOK() ? 900 : 300);
    if (dood) return;
    const actie = kiesActie(st, 1, wb, maakToeval(st.seed + 101 * st.zetten.length + 13));
    if (actie.soort === 'leg') {
      const r = speel(st, 1, actie.zet.plaatsingen, wb);
      laatste = new Set(actie.zet.plaatsingen.map((p) => p.r * N + p.c));
      teken();
      if (motionOK()) for (const [k, i] of [...laatste].entries()) { const s = vakken[i].querySelector('.lh-steen'); if (s) { s.style.animationDelay = `${k * 120}ms`; s.classList.add('komt'); } }
      zeg(t('letterhof.theyPlayed', { name: naamPc, word: r.woorden[0].tekst.toUpperCase(), points: r.punten }) + (r.bingo ? ` ${t('letterhof.bingo', { points: BINGO })}` : ''));
      punten(laatste, r.punten);
      if (laatste.size) scrollNaarLaatste();
    } else if (actie.soort === 'wissel') {
      wisselen(st, 1, actie.tegels);
      zeg(t('letterhof.theySwapped', { name: naamPc, n: actie.tegels.length }));
    } else {
      passen(st, 1);
      zeg(t('letterhof.theyPassed', { name: naamPc }));
    }
    bezig = false;
    bewaar(); teken();
    if (st.eind) { await einde(); return; }
    await wacht(motionOK() ? 500 : 0);
    if (!st.eind && !dood) { const m = melding; zeg(`${m} ${bordLeeg(st) ? t('letterhof.firstMove') : t('letterhof.yourTurn')}`); }
  }
  function scrollNaarLaatste() { if (ingezoomd) scrollNaar([...laatste][0]); }

  // ----- Wisselen, passen, tip -----
  async function wisselDialoog() {
    if (!eigenBeurt() || leg.size) return;
    if (!kanWisselen(st)) { zeg(t('letterhof.cantExchange')); return; }
    const gekozenIds = new Set();
    const keuzes = await new Promise((klaar) => {
      const dlg = h('dialog', { class: 'lh-dialoog' });
      const rij = h('div', { class: 'lh-wisselrij' });
      const ok = h('button', { type: 'button', class: 'btn btn-primary', disabled: true, onclick: () => dlg.close('ja') }, t('letterhof.exchangeDo'));
      for (const x of rekUI) {
        const b = h('button', { type: 'button', class: 'lh-rekstee', 'aria-pressed': 'false', 'aria-label': steenNaam(x.ch), onclick: () => { if (gekozenIds.has(x.id)) gekozenIds.delete(x.id); else gekozenIds.add(x.id); b.classList.toggle('gekozen', gekozenIds.has(x.id)); b.setAttribute('aria-pressed', gekozenIds.has(x.id)); ok.disabled = !gekozenIds.size; } });
        const s = maakSteen(x.ch); if (x.ch === '?') { s.classList.add('leeg'); s.innerHTML = `<svg class="lh-blank" viewBox="-20 -20 40 40">${bloesemFig(0, 0, 12, true)}</svg>`; }
        b.append(s); rij.append(b);
      }
      dlg.append(h('h2', {}, t('letterhof.exchange')), h('p', {}, t('letterhof.exchangeText')), rij, h('div', { class: 'lh-dlg-knoppen' }, ok, h('button', { type: 'button', class: 'btn', onclick: () => dlg.close('') }, t('letterhof.cancel'))));
      dlg.addEventListener('close', () => { const v = dlg.returnValue; dlg.remove(); klaar(v === 'ja'); });
      document.body.append(dlg); dlg.showModal();
    });
    if (!keuzes) return;
    const tegels = rekUI.filter((x) => gekozenIds.has(x.id)).map((x) => x.ch);
    wisselen(st, 0, tegels);
    rekUI = []; synchroniseerRek();
    zeg(t('letterhof.youSwapped', { n: tegels.length }));
    await na();
  }
  async function passBevestig() {
    if (!eigenBeurt() || leg.size) return;
    const ok = await confirmDialog({ title: t('letterhof.passTitle'), text: t('letterhof.passText'), confirmLabel: t('letterhof.pass') });
    if (!ok) return;
    passen(st, 0);
    zeg(t('letterhof.youPassed'));
    await na();
  }
  async function geefTip() {
    if (!eigenBeurt()) return;                                         // één gratis tip per spel; nog een kan met een korte video (zie js/steun/)
    if (!(await tipToestemming(st)) || !eigenBeurt() || dood) return;
    alleTerug();
    const z = tipZet(st, 0, wb, maakToeval(st.seed + 31 * st.zetten.length + 7));
    if (!z) { zeg(t('letterhof.noHint')); bewaar(); teken(); return; }  // geen tip te geven: er gaat niets van op (ook geen video)
    tipGebruikt(st); bewaar();
    // leg de stenen van de tip neer; je kunt ze aanpassen of meteen spelen
    const ids = new Set();
    for (const p of z.plaatsingen) {
      const echt = isJoker(p.l) ? '?' : p.l;
      const x = rekUI.find((s) => s.ch === echt && !ids.has(s.id));
      if (!x) continue;
      ids.add(x.id);
      leg.set(p.r * N + p.c, { l: p.l, id: x.id });
    }
    teken();
    zeg(t('letterhof.hintText', { word: z.hoofd.toUpperCase(), points: z.punten }));
    scrollNaarLaatste();
  }

  // ----- Het einde -----
  async function einde() {
    bewaar();
    const jij = st.score[0], zij = st.score[1];
    const w = st.eind.winnaar;
    zeg(w === 0 ? t('letterhof.won', { you: jij, them: zij }) : w === 1 ? t('letterhof.lost', { you: jij, them: zij }) : t('letterhof.draw', { points: jij }));
    await ctx.complete({
      title: w === 0 ? felicitatie() : w === 1 ? t('letterhof.lostTitle') : t('letterhof.drawTitle'),
      text: w === 0 ? t('letterhof.won', { you: jij, them: zij }) : w === 1 ? t('letterhof.lost', { you: jij, them: zij }) : t('letterhof.draw', { points: jij }),
      joy: w === 0, delay: motionOK() ? 600 : 0,
    });
  }

  // ----- Starten -----
  synchroniseerRek();
  pasMaat();
  teken();
  if (!ctx.saved || !geldig(ctx.saved, taal)) bewaar();
  if (st.eind) zeg(st.eind.winnaar === 0 ? t('letterhof.won', { you: st.score[0], them: st.score[1] }) : t('letterhof.lost', { you: st.score[0], them: st.score[1] }));
  else if (st.beurt === 1) computerBeurt();
  else voorbeeld();
  return () => { dood = true; ro.disconnect(); };
}
