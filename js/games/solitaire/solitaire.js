// Patience (Klondike): het scherm. De regels staan in engine.js, de kaartplaatjes in kaarten.js.
//
// Tik een kaart (hij licht op, en de plekken waar hij heen kan worden gemarkeerd) en tik dan op een gemarkeerde plek. Slepen kan ook.
// Tik je op een gekozen kaart nog een keer, dan gaat hij vanzelf naar de beste plek. Zet terug is onbeperkt, een tip wijst een zet
// die goed uitkomt. Geen tijd, geen punten, geen straf.
//
// Alle kaarten zijn steeds dezelfde 52 elementen die over de mat schuiven; na elke zet worden hun plekken opnieuw uitgerekend en
// glijden ze er naartoe (FLIP). Het spel wordt bewaard als deling + lijst met zetten (zie engine.js).

import { h, icon } from '../../ui.js';
import { t } from '../../i18n/index.js';
import { burst, motionOK } from '../../effects.js';
import * as E from './engine.js';
import { kaartSvg, kleurIcoon, rugSvg, SOL_DEFS } from './kaarten.js';
import { felicitatie } from '../../shared/felicitatie.js';

const RATIO = 1.4;                      // hoogte van een kaart ten opzichte van de breedte
const GAP = 0.11;                       // ruimte tussen de stapels, als deel van de kaartbreedte
const RAND = 6;                         // ruimte rond de kaarten (px)
const KLEURNAAM = ['spades', 'hearts', 'diamonds', 'clubs'];

const geldig = (s) => s && s.v === 1 && E.geldigNiveau(s.niveau) && typeof s.seed === 'string' && Array.isArray(s.zetten) && s.zetten.every(Array.isArray);
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

export async function mount(container, ctx) {
  container.classList.add('stage--bare');
  const laden = h('p', { class: 'muted', role: 'status' }, t('common.loading'));
  container.append(laden);
  await wacht(30);                                   // even ademhalen: het delen van een spel dat te winnen is kan een moment duren

  let state = geldig(ctx.saved) ? ctx.saved : E.nieuwSpel(ctx.difficulty, ctx.seed);
  let g;
  try { g = E.stand(state); } catch { state = E.nieuwSpel(ctx.difficulty, ctx.seed); g = E.stand(state); }
  const nieuw = !geldig(ctx.saved) || state.zetten.length === 0;
  laden.remove();

  let sel = null, plan = null, tipTimer = null, bezig = false, afgerond = false, dood = false;
  let maat = null, pos = [], focusEl = null;
  const letters = { 1: t('solitaire.letter.1'), 11: t('solitaire.letter.11'), 12: t('solitaire.letter.12'), 13: t('solitaire.letter.13') };

  // ----- Het scherm -----
  const aantal = h('span', { class: 'sol-aantal' });
  const balk = h('i', {});
  const melding = h('p', { class: 'sol-melding', role: 'status', 'aria-live': 'polite' });
  const tafel = h('div', { class: 'sol-tafel', role: 'group', 'aria-label': t('solitaire.name') });
  const terugKnop = h('button', { type: 'button', class: 'btn', onclick: terug }, icon('undo'), h('span', {}, t('solitaire.undo')));
  const tipKnop = h('button', { type: 'button', class: 'btn', onclick: geefTip }, icon('bulb'), h('span', {}, t('common.hint')));
  const klaarKnop = h('button', { type: 'button', class: 'btn btn-primary', hidden: true, onclick: afmaken }, icon('check'), h('span', {}, t('solitaire.finish')));
  container.append(h('div', { class: 'sol' },
    h('div', { class: 'sol-kop' }, aantal, h('span', { class: 'ws-bar sol-balk', 'aria-hidden': 'true' }, balk)),
    melding, tafel, h('div', { class: 'sol-knoppen' }, terugKnop, tipKnop, klaarKnop)));

  // Vakken waar kaarten in liggen of heen kunnen: voorraad, aflegstapel (alleen een plek), vier fundamenten, zeven stapels
  const vak = (klas, label, onclick) => h('button', { type: 'button', class: `sol-vak ${klas}`, 'aria-label': label, tabindex: '-1', onclick });
  const voorraadVak = vak('sol-voorraad', '', () => trek());
  voorraadVak.append(h('span', { class: 'sol-cirkel', 'aria-hidden': 'true' }, icon('undo')));
  const fundVakken = [0, 1, 2, 3].map((s) => {
    const el = vak('sol-fundament', '', () => tikDoel({ soort: 'fundament' }));
    const kl = h('span', { class: `sol-kleur k${s}`, 'aria-hidden': 'true' });
    kl.innerHTML = kleurIcoon(s, 24);
    el.append(kl);
    return el;
  });
  const stapelVakken = [0, 1, 2, 3, 4, 5, 6].map((i) => vak('sol-stapel', t('solitaire.columnEmpty', { n: i + 1 }), () => tikDoel({ soort: 'stapel', naar: i })));
  const afleggerVak = h('div', { class: 'sol-vak sol-aflegger', 'aria-hidden': 'true' });
  tafel.append(afleggerVak, voorraadVak, ...fundVakken, ...stapelVakken);

  if (!document.getElementById('sol-defs')) document.body.insertAdjacentHTML('beforeend', `<svg id="sol-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${SOL_DEFS}</svg>`);   // de kleurverlopen van de kaarten
  const RUG = rugSvg();
  const kaarten = Array.from({ length: 52 }, (_, k) => {
    const el = h('button', { type: 'button', class: 'sol-kaart', 'data-k': k, tabindex: '-1', onclick: (e) => { if (e.detail === 0) tikKaart(k); } },
      h('span', { class: 'sol-binnen', 'aria-hidden': 'true' }, h('span', { class: 'sol-voor' }), h('span', { class: 'sol-achter' })));
    el.querySelector('.sol-achter').innerHTML = RUG;
    el.querySelector('.sol-voor').innerHTML = `<svg viewBox="0 0 60 84" focusable="false">${kaartSvg(k, letters)}</svg>`;
    el._x = el._y = null; el._up = null;
    return el;
  });
  tafel.append(...kaarten);

  // ----- Maten en plekken -----
  function maten(vastCw) {
    const breedte = tafel.clientWidth;
    if (breedte <= 0) return null;
    const ruimte = Math.max(32, Math.min(112, Math.floor((breedte - 2 * RAND) / (7 + 6 * GAP))));
    const cw = vastCw ? Math.min(vastCw, ruimte) : ruimte;
    const ch = Math.round(cw * RATIO), gap = Math.floor(cw * GAP);
    const x0 = Math.round((breedte - (7 * cw + 6 * gap)) / 2);
    return { cw, ch, gap, x0, yBoven: RAND, yTab: RAND + ch + Math.round(ch * 0.2), omlaag: ch * 0.17, omhoog: ch * 0.31 };
  }
  const kolX = (i) => maat.x0 + i * (maat.cw + maat.gap);

  // Waar ligt elke kaart? (x, y, z, open of dicht, in welke stapel)
  function indeling(st) {
    const p = new Array(52);
    let hoogste = 0;
    st.stock.forEach((k, i) => { p[k] = { x: kolX(0), y: maat.yBoven, z: i, up: false, pile: 'stock' }; });
    const wl = st.waste.length;
    st.waste.forEach((k, i) => {
      const j = i - (wl - st.wv);
      p[k] = { x: kolX(1) + (j > 0 ? j * maat.cw * 0.3 : 0), y: maat.yBoven, z: 100 + i, up: true, pile: 'waste', i };
    });
    for (let s = 0; s < 4; s++) for (let r = 0; r < st.found[s]; r++) p[s * 13 + r] = { x: kolX(3 + s), y: maat.yBoven, z: 200 + r, up: true, pile: 'found', s, i: r };
    // De stapels: als een stapel te hoog wordt, schuiven de kaarten dichter op elkaar
    const grens = maat.ch * 6.4;
    st.tab.forEach((c, col) => {
      const dicht = c.k.length - c.u;
      let dn = maat.omlaag, op = maat.omhoog;
      const nodig = maat.ch + dicht * dn + Math.max(0, c.u - 1) * op;
      if (nodig > grens) { const f = Math.max(0.55, (grens - maat.ch) / (nodig - maat.ch)); dn *= f; op *= f; }
      let y = maat.yTab;
      c.k.forEach((k, i) => {
        const open = i >= dicht;
        p[k] = { x: kolX(col), y, z: 300 + i, up: open, pile: 'tab', col, i };
        y += open ? op : dn;
      });
      hoogste = Math.max(hoogste, c.k.length ? y - (c.u ? op : dn) + maat.ch : maat.yTab + maat.ch);
    });
    p.hoogte = Math.max(hoogste, maat.yTab + maat.ch * 3.4) + RAND;
    return p;
  }

  // ----- Bronnen en doelen: wat kun je pakken, en waar kun je neerleggen? -----
  function bronVan(k) {
    const p = pos[k];
    if (!p) return null;
    if (p.pile === 'waste') return p.i === g.waste.length - 1 ? { soort: 'waste' } : null;
    if (p.pile === 'found') return p.i === g.found[p.s] - 1 ? { soort: 'found', s: p.s } : null;
    if (p.pile === 'tab') { const c = g.tab[p.col]; return p.i >= c.k.length - c.u ? { soort: 'tab', van: p.col, n: c.k.length - p.i } : null; }
    return null;
  }
  const kaartenVan = (bron) => {
    if (bron.soort === 'waste') return [g.waste[g.waste.length - 1]];
    if (bron.soort === 'found') return [bron.s * 13 + g.found[bron.s] - 1];
    const c = g.tab[bron.van]; return c.k.slice(c.k.length - bron.n);
  };
  const zelfde = (a, b) => a && b && a.soort === b.soort && a.van === b.van && a.n === b.n && a.s === b.s;
  const eerste = (bron) => kaartenVan(bron)[0];
  const kaartNaam = (k) => {
    const r = E.rang(k) + 1;
    return t('solitaire.card', { rank: r === 1 || r > 10 ? t(`solitaire.rank.${r}`) : String(r), suit: t(`solitaire.suit.${E.kleur(k)}`) });
  };

  // ----- Weergave van de stand -----
  function teken({ animeer = false, vertraging = null, flipVertraging = null } = {}) {
    // Kaarten worden direct kleiner als de ruimte krimpt, maar pas groter bij een merkbaar verschil: een schuifbalk die verschijnt of
    // verdwijnt (een lange stapel) zou anders steeds opnieuw de maten, de hoogte en daarmee de schuifbalk veranderen
    const nieuweMaat = maten();
    if (nieuweMaat) maat = maat && nieuweMaat.cw > maat.cw && nieuweMaat.cw < maat.cw + 3 ? maten(maat.cw) : nieuweMaat;
    if (!maat) return;
    pos = indeling(g);
    tafel.style.setProperty('--cw', `${maat.cw}px`); tafel.style.setProperty('--ch', `${maat.ch}px`);
    tafel.style.height = `${pos.hoogte}px`;
    const selKaarten = sel ? new Set(kaartenVan(sel)) : null;
    kaarten.forEach((el, k) => {
      const p = pos[k];
      el.style.zIndex = p.z;
      plaats(el, p.x, p.y, animeer ? (vertraging?.get(k) ?? 0) : null);
      if (el._up !== p.up) {
        el.style.setProperty('--fd', `${animeer && el._up !== null ? (flipVertraging?.get(k) ?? 0.2) : 0}s`);       // een onthulde kaart draait pas om als de zet klaar is
        el._up = p.up;
        el.classList.toggle('op', p.up);
      }
      const bron = bronVan(k);
      el.classList.toggle('diep', (p.pile === 'stock' && p.z < g.stock.length - 2) || (p.pile === 'waste' && p.i < g.waste.length - 4) || (p.pile === 'found' && p.i < g.found[p.s] - 2));       // diep in een stapel: geen eigen schaduw
      el.classList.toggle('speelbaar', !!bron);
      el.classList.toggle('gekozen', !!selKaarten?.has(k));
      el.setAttribute('aria-pressed', selKaarten?.has(k) ? 'true' : 'false');
      el.setAttribute('aria-label', p.up ? kaartNaam(k) : t(p.pile === 'stock' ? 'solitaire.stock' : 'solitaire.cardDown', { n: g.stock.length }));
    });
    // De vakken onder de kaarten
    const ch = maat.ch, cw = maat.cw;
    const zet = (el, x, y) => { el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.width = `${cw}px`; el.style.height = `${ch}px`; };
    zet(voorraadVak, kolX(0), maat.yBoven); zet(afleggerVak, kolX(1), maat.yBoven);
    voorraadVak.classList.toggle('kan', g.stock.length === 0 && g.waste.length > 0);
    voorraadVak.classList.toggle('leeg', g.stock.length === 0);
    voorraadVak.setAttribute('aria-label', g.stock.length ? t('solitaire.stock', { n: g.stock.length }) : g.waste.length ? t('solitaire.recycle') : t('solitaire.stockEmpty'));
    voorraadVak.disabled = g.stock.length === 0 && g.waste.length === 0;
    fundVakken.forEach((el, s) => {
      zet(el, kolX(3 + s), maat.yBoven);
      el.setAttribute('aria-label', t('solitaire.foundation', { suit: t(`solitaire.suit.${s}`), n: g.found[s] }));
    });
    stapelVakken.forEach((el, i) => {
      zet(el, kolX(i), maat.yTab);
      el.hidden = g.tab[i].k.length > 0;
    });
    const n = E.opFundamenten(g);
    aantal.textContent = t('solitaire.home', { n });
    balk.style.width = `${Math.round(E.progress(g) * 100)}%`;
    terugKnop.disabled = state.zetten.length === 0 || bezig;
    tipKnop.disabled = !!state.tip || afgerond;
    klaarKnop.hidden = !E.kanAfmaken(g) || afgerond;
    zetFocusAnker();
  }

  // De plek van een kaart: glijdt er naartoe als er beweging mag zijn
  function visueel(el) {
    if (!el.getAnimations().length) return { x: el._x, y: el._y };
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return { x: m.m41, y: m.m42 };
  }
  function plaats(el, x, y, vertraging) {
    if (vertraging === null && el._x === x && el._y === y) return;                 // niets verplaatst: een lopende beweging niet afbreken
    const van = el._x === null ? null : visueel(el);
    el.getAnimations().forEach((a) => a.cancel());
    el.style.transform = `translate(${x}px, ${y}px)`;
    el._x = x; el._y = y;
    if (vertraging === null || !van || !motionOK() || (Math.abs(van.x - x) < 1 && Math.abs(van.y - y) < 1)) return;
    const afstand = Math.hypot(x - van.x, y - van.y);
    el.classList.add('vliegt');
    el.style.zIndex = String(600 + Number(el.style.zIndex || 0));                  // onderweg boven de rest, in de volgorde van de stapel
    const an = el.animate([{ transform: `translate(${van.x}px, ${van.y}px)` }, { transform: `translate(${x}px, ${y}px)` }],
      { duration: Math.min(560, 230 + afstand * 0.55), delay: vertraging, easing: 'cubic-bezier(.22,.8,.25,1)', fill: 'backwards' });
    an.finished.then(() => el.classList.remove('vliegt'), () => el.classList.remove('vliegt'));
  }

  const zeg = (tekst) => { melding.textContent = tekst; };

  // ----- Kiezen, neerleggen en zetten -----
  function kies(bron) {
    sel = bron; wisTip();
    teken();
    zeg(t(bron ? 'solitaire.msg.picked' : 'solitaire.msg.start'));            // geen aanwijzingen: je ziet zelf waar een kaart heen kan
  }
  function bewaar() { ctx.save(state, { progress: E.progress(g) }); }
  function doe(zet, opties = {}) {
    try { g = E.speel(g, zet); } catch { teken(); return false; }
    state.zetten.push(zet);
    ctx.grootBeeld?.auto();
    sel = null; wisTip(); plan = plan?.gevonden && plan.pad.length ? plan : null;
    bewaar();
    teken({ animeer: true, ...staffel(zet), ...opties });
    if (E.klaar(g)) { winnen(); return true; }
    if (E.kanAfmaken(g)) zeg(t('solitaire.msg.canFinish', { finish: t('solitaire.finish') }));
    else if (zet[0] === 'r') zeg(t('solitaire.msg.recycled'));
    else zeg(t('solitaire.msg.start'));
    return true;
  }
  // Kaarten die samen bewegen vertrekken kort na elkaar: het ziet er zachter uit dan alles tegelijk, en de stapel blijft mooi geordend
  function staffel(zet) {
    const vertraging = new Map(), flipVertraging = new Map();
    const soort = zet[0];
    if (soort === 'd') {
      g.waste.slice(-g.wv).forEach((k, j) => { vertraging.set(k, j * 75); flipVertraging.set(k, (j * 75 + 110) / 1000); });
    } else if (soort === 'r') {
      const n = g.stock.length, stap = Math.min(22, 420 / Math.max(1, n));
      for (let j = 0; j < n; j++) { const k = g.stock[n - 1 - j]; vertraging.set(k, j * stap); flipVertraging.set(k, (j * stap + 90) / 1000); }
    } else if (soort === 'tt') {
      const c = g.tab[zet[3]];
      c.k.slice(c.k.length - zet[2]).forEach((k, j) => vertraging.set(k, j * 35));
    }
    return { vertraging, flipVertraging };
  }
  function trek() {
    if (afgerond || bezig) return;
    if (g.stock.length) doe(['d']);
    else if (g.waste.length) doe(['r']);
  }
  function terug() {
    if (!state.zetten.length || bezig) return;
    state.zetten.pop();
    g = E.stand(state);
    sel = null; wisTip(); afgerond = false; plan = null;
    bewaar();
    teken({ animeer: true });
    zeg(t('solitaire.msg.undone'));
  }

  // Een kaart is aangetikt (of met het toetsenbord gekozen)
  function tikKaart(k) {
    if (afgerond || bezig) return;
    const p = pos[k];
    if (p.pile === 'stock') { trek(); return; }
    const bron = bronVan(k);
    if (sel) {
      if (zelfde(bron, sel)) { slimmeZet(sel); return; }
      // Een kaart bovenop een stapel of een fundament is ook een plek om neer te leggen
      const bovenop = (p.pile === 'tab' && p.i === g.tab[p.col].k.length - 1) || (p.pile === 'found' && p.i === g.found[p.s] - 1);
      if (bovenop) {
        const d = E.bestemmingen(g, sel);
        if (p.pile === 'tab' && d.stapels.includes(p.col)) { doe(E.zetVoor(sel, { soort: 'stapel', naar: p.col })); return; }
        if (p.pile === 'found' && d.fundament && p.s === E.kleur(eerste(sel))) { doe(E.zetVoor(sel, { soort: 'fundament' })); return; }
        if (p.pile === 'tab' || p.pile === 'found') {                       // past niet: de gekozen kaart schudt, en de aangetikte kaart wordt de nieuwe keuze
          const oud = kaartenVan(sel); kies(bron || null); oud.forEach((x) => wiebel(kaarten[x])); zeg(t('solitaire.msg.nowhere')); return;
        }
      }
    }
    if (!bron) { wiebel(kaarten[k]); if (p.pile === 'tab' && !p.up) zeg(t('solitaire.msg.closed')); if (sel) kies(null); return; }
    kies(bron);
  }
  function tikDoel(doel) {
    if (afgerond || bezig || !sel) return;
    const d = E.bestemmingen(g, sel);
    if (doel.soort === 'fundament' ? d.fundament : d.stapels.includes(doel.naar)) doe(E.zetVoor(sel, doel));
    else { schud(); zeg(t('solitaire.msg.nowhere')); }
  }
  // De gekozen kaart(en) schudden: dat kan hier niet
  function schud() { if (sel) kaartenVan(sel).forEach((k) => wiebel(kaarten[k])); }
  // Nog een keer op de gekozen kaart: naar het fundament als dat kan, anders naar de beste stapel
  function slimmeZet(bron) {
    const d = E.bestemmingen(g, bron);
    if (d.fundament) { doe(E.zetVoor(bron, { soort: 'fundament' })); return; }
    if (d.stapels.length) {
      const metKaarten = d.stapels.filter((i) => g.tab[i].k.length > 0);
      doe(E.zetVoor(bron, { soort: 'stapel', naar: (metKaarten.length ? metKaarten : d.stapels)[0] }));
      return;
    }
    schud(); zeg(t('solitaire.msg.nowhere'));
  }

  // ----- Slepen met muis of vinger (een korte tik is gewoon aantikken) -----
  let sleep = null;
  tafel.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || bezig || afgerond) return;
    const el = e.target.closest('.sol-kaart');
    if (!el) return;
    const k = Number(el.dataset.k);
    const bron = bronVan(k);                                   // een kaart van de voorraad heeft geen bron: aantikken pakt een nieuwe kaart
    sleep = { k, bron, x: e.clientX, y: e.clientY, id: e.pointerId, actief: false, els: [], dx: 0, dy: 0 };
    try { el.setPointerCapture(e.pointerId); } catch { /* geen capture: dan werkt slepen iets minder soepel */ }
  });
  tafel.addEventListener('pointermove', (e) => {
    if (!sleep || e.pointerId !== sleep.id) return;
    const dx = e.clientX - sleep.x, dy = e.clientY - sleep.y;
    if (!sleep.actief) {
      if (!sleep.bron || Math.hypot(dx, dy) < 8) return;
      sleep.actief = true;
      sleep.els = kaartenVan(sleep.bron).map((k) => kaarten[k]);
      sleep.els.forEach((el) => { el.getAnimations().forEach((a) => a.cancel()); el.classList.add('sleept'); });
      if (!sel || !zelfde(sel, sleep.bron)) { sel = sleep.bron; wisTip(); teken(); sleep.els.forEach((el) => el.classList.add('sleept')); }
      zeg(t('solitaire.msg.picked'));
    }
    sleep.dx = dx; sleep.dy = dy;
    sleep.els.forEach((el) => { el.style.transform = `translate(${el._x + dx}px, ${el._y + dy}px) scale(1.04)`; });
    e.preventDefault();
  });
  const einde = (e, geannuleerd) => {
    if (!sleep || e.pointerId !== sleep.id) return;
    const s = sleep; sleep = null;
    if (!s.actief) { if (!geannuleerd) tikKaart(s.k); return; }
    const r = tafel.getBoundingClientRect();
    const doel = geannuleerd ? null : doelBij(s, e.clientX - r.left, e.clientY - r.top);
    s.els.forEach((el) => { el.classList.remove('sleept'); el._x += s.dx; el._y += s.dy; });         // de animatie begint waar de kaart nu is
    if (doel) doe(E.zetVoor(s.bron, doel)); else { teken({ animeer: true }); zeg(t('solitaire.msg.nowhere')); }
  };
  tafel.addEventListener('pointerup', (e) => einde(e, false));
  tafel.addEventListener('pointercancel', (e) => einde(e, true));

  // Waar is de kaart losgelaten? Het vakje waar de aanwijzer in staat, anders waar de kaart het meest overheen ligt
  function doelBij(s, px, py) {
    const d = E.bestemmingen(g, s.bron);
    const el = s.els[0];
    const kx = el._x + s.dx, ky = el._y + s.dy;
    const kandidaten = [];
    if (d.fundament) kandidaten.push({ doel: { soort: 'fundament' }, x: kolX(3 + E.kleur(eerste(s.bron))), y: maat.yBoven, h: maat.ch });
    for (const i of d.stapels) {
      const c = g.tab[i];
      const top = c.k.length ? pos[c.k[c.k.length - 1]].y : maat.yTab;
      kandidaten.push({ doel: { soort: 'stapel', naar: i }, x: kolX(i), y: top, h: maat.ch });
    }
    let beste = null, score = 0;
    for (const c of kandidaten) {
      const ox = Math.max(0, Math.min(kx + maat.cw, c.x + maat.cw) - Math.max(kx, c.x));
      const oy = Math.max(0, Math.min(ky + maat.ch, c.y + c.h) - Math.max(ky, c.y));
      let sc = (ox * oy) / (maat.cw * maat.ch);
      const binnen = px >= c.x - maat.gap / 2 && px <= c.x + maat.cw + maat.gap / 2 && py >= c.y - maat.ch * 0.15 && (c.doel.soort === 'stapel' ? true : py <= c.y + c.h + maat.ch * 0.15);
      if (binnen) sc += 1;
      if (sc > score) { score = sc; beste = c.doel; }
    }
    return score >= 0.25 ? beste : null;
  }

  function wiebel(el) {
    if (!motionOK()) return;
    const x = el._x, y = el._y;
    el.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: `translate(${x - 4}px, ${y}px)` }, { transform: `translate(${x + 4}px, ${y}px)` }, { transform: `translate(${x - 3}px, ${y}px)` }, { transform: `translate(${x}px, ${y}px)` }], { duration: 300, easing: 'ease-in-out' });
  }

  // ----- Tip -----
  function geefTip() {
    if (afgerond || bezig || state.tip) return;                        // één tip per spel
    wisTip(); sel = null; teken();
    const r = E.tip(g, plan);
    plan = r.plan ?? plan;
    if (!r.zet) { zeg(t(r.bewezenVerloren ? 'solitaire.msg.lost' : 'solitaire.msg.noTip')); return; }
    const z = r.zet, soort = z[0];
    state.tip = true; bewaar(); tipKnop.disabled = true;
    const markeer = (el, rol = 'doel') => { if (el) { el.classList.add('tip'); el.dataset.rol = rol; } };
    if (soort === 'd' || soort === 'r') { markeer(voorraadVak, 'bron'); zeg(t(soort === 'd' ? 'solitaire.msg.tipDraw' : 'solitaire.msg.tipRecycle')); voorraadVak.scrollIntoView?.({ block: 'nearest' }); }
    else {
      const bron = soort === 'wf' || soort === 'wt' ? { soort: 'waste' } : soort === 'tf' ? { soort: 'tab', van: z[1], n: 1 } : soort === 'ft' ? { soort: 'found', s: z[1] } : { soort: 'tab', van: z[1], n: z[2] };
      const ks = kaartenVan(bron);
      ks.forEach((k) => markeer(kaarten[k], 'bron'));
      const naar = soort === 'wt' ? z[1] : soort === 'tt' ? z[3] : soort === 'ft' ? z[2] : -1;
      if (naar < 0) markeer(fundVakken[E.kleur(ks[0])]);
      else { const c = g.tab[naar]; markeer(c.k.length ? kaarten[c.k[c.k.length - 1]] : stapelVakken[naar]); }
      kaarten[ks[0]].scrollIntoView?.({ block: 'nearest', behavior: motionOK() ? 'smooth' : 'auto' });
      zeg(t('solitaire.msg.tipMove'));
    }
    tipTimer = setTimeout(wisTip, 4200);
  }
  function wisTip() { clearTimeout(tipTimer); tafel.querySelectorAll('.tip').forEach((el) => { el.classList.remove('tip'); delete el.dataset.rol; }); }

  // ----- Afmaken en winnen -----
  async function afmaken() {
    if (!E.kanAfmaken(g) || bezig) return;
    bezig = true; sel = null; wisTip(); teken();
    for (const z of E.afmaakZetten(g)) {
      if (dood) return;
      g = E.speel(g, z); state.zetten.push(z); bewaar();
      teken({ animeer: true });
      await wacht(motionOK() ? 170 : 0);
    }
    bezig = false;
    if (!dood) { teken(); winnen(); }
  }
  function winnen() {
    if (afgerond) return;
    afgerond = true; sel = null; teken();
    if (motionOK()) {
      // De kaarten springen één voor één van de mat af (heren eerst) en blijven weg; na de felicitatie komen ze zacht weer terug
      const r = tafel.getBoundingClientRect();
      const volgorde = [];
      for (let rang = 12; rang >= 0; rang--) for (const s of [0, 1, 2, 3]) volgorde.push(s * 13 + rang);
      volgorde.forEach((k, j) => {
        const el = kaarten[k], richting = (k % 2 ? 1 : -1) * (0.6 + ((k * 37) % 10) / 14);
        const dx = richting * r.width * 0.9, hoog = maat.ch * (1.2 + ((k * 13) % 5) / 4);
        el.classList.add('vliegt');
        el.animate([
          { transform: `translate(${el._x}px, ${el._y}px) rotate(0)`, opacity: 1 },
          { transform: `translate(${el._x + dx * 0.35}px, ${el._y - hoog}px) rotate(${richting * 70}deg)`, opacity: 1, offset: 0.3 },
          { transform: `translate(${el._x + dx * 0.7}px, ${el._y + r.height * 0.25}px) rotate(${richting * 160}deg)`, opacity: 0.9, offset: 0.62 },
          { transform: `translate(${el._x + dx}px, ${el._y + r.height * 0.1}px) rotate(${richting * 250}deg)`, opacity: 0 },
        ], { duration: 1700, delay: j * 42, easing: 'cubic-bezier(.3,.1,.5,1)', fill: 'forwards' });
        if (j % 9 === 0) setTimeout(() => !dood && burst({ x: r.left + el._x + maat.cw / 2, y: r.top + el._y, count: 8, power: 220, cone: [-170, -10], size: [10, 18], life: [900, 1500] }), j * 42 + 200);
      });
    }
    Promise.resolve(ctx.complete({ title: felicitatie(), text: t('solitaire.done.text'), joy: true, delay: motionOK() ? 2600 : 0 })).then(() => { if (!dood) terugKomen(); });
  }
  // De kaarten verschijnen weer op hun plek, aas tot heer, zacht en één voor één
  function terugKomen() {
    kaarten.forEach((el) => { el.getAnimations().forEach((a) => a.cancel()); el.classList.remove('vliegt'); });
    if (!motionOK()) return;
    for (let rang = 0; rang < 13; rang++) for (let s = 0; s < 4; s++) {
      const el = kaarten[s * 13 + rang];
      el.animate([{ opacity: 0, transform: `translate(${el._x}px, ${el._y - 10}px) scale(.96)` }, { opacity: 1, transform: `translate(${el._x}px, ${el._y}px) scale(1)` }],
        { duration: 520, delay: (rang * 4 + s) * 26, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
    }
  }

  // ----- Toetsenbord: Tab naar de mat, pijltjes tussen de stapels, Enter of spatie tikt aan, Escape laat los -----
  // Plekken: bovenste rij  voorraad, aflegstapel, (leeg), vier fundamenten; onderste rij  zeven stapels. Omhoog/omlaag loopt door een stapel.
  let fp = { rij: 1, kol: 0, diepte: 0 };
  function elementBij({ rij, kol, diepte }) {
    if (rij === 0) {
      if (kol === 0) return voorraadVak;
      if (kol === 1) return g.waste.length ? kaarten[g.waste.at(-1)] : afleggerVak;
      if (kol >= 3) { const s = kol - 3; return g.found[s] ? kaarten[s * 13 + g.found[s] - 1] : fundVakken[s]; }
      return null;
    }
    const c = g.tab[kol];
    if (!c.k.length) return stapelVakken[kol];
    return kaarten[c.k[c.k.length - 1 - Math.min(diepte, c.u - 1)]];
  }
  function zetFocusAnker() {
    let el = elementBij(fp);
    if (!el || el === afleggerVak) el = elementBij({ rij: 1, kol: fp.kol, diepte: 0 });
    focusEl = el;
    for (const x of [...kaarten, voorraadVak, ...fundVakken, ...stapelVakken]) x.tabIndex = x === el ? 0 : -1;
  }
  tafel.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el === voorraadVak) fp = { rij: 0, kol: 0, diepte: 0 };
    else if (fundVakken.includes(el)) fp = { rij: 0, kol: 3 + fundVakken.indexOf(el), diepte: 0 };
    else if (stapelVakken.includes(el)) fp = { rij: 1, kol: stapelVakken.indexOf(el), diepte: 0 };
    else if (el.classList.contains('sol-kaart')) {
      const p = pos[Number(el.dataset.k)];
      if (p.pile === 'waste') fp = { rij: 0, kol: 1, diepte: 0 };
      else if (p.pile === 'found') fp = { rij: 0, kol: 3 + p.s, diepte: 0 };
      else if (p.pile === 'tab') fp = { rij: 1, kol: p.col, diepte: g.tab[p.col].k.length - 1 - p.i };
    }
  });
  tafel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (sel) { kies(null); focusEl?.focus(); } return; }
    const pijl = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!pijl) return;
    e.preventDefault();
    let { rij, kol, diepte } = fp;
    if (pijl[0]) {
      do { kol = (kol + pijl[0] + 7) % 7; } while (rij === 0 && kol === 2);
      diepte = 0;
    } else if (rij === 1) {
      if (pijl[1] < 0) { const c = g.tab[kol]; if (c.k.length && diepte < c.u - 1) diepte++; else { rij = 0; kol = kol === 2 ? 1 : kol; diepte = 0; } }
      else diepte = Math.max(0, diepte - 1);
    } else if (pijl[1] > 0) { rij = 1; diepte = 0; }
    fp = { rij, kol, diepte };
    zetFocusAnker();
    focusEl?.focus();
  });

  // ----- Start -----
  let laatsteBreedte = 0;
  const ro = new ResizeObserver(() => { if (tafel.clientWidth !== laatsteBreedte) { laatsteBreedte = tafel.clientWidth; teken(); } });          // alleen bij een andere breedte: de hoogte past zich zelf aan en mag lopende bewegingen niet afbreken
  maat = maten();
  if (nieuw) {
    // Delen: alle kaarten beginnen op de voorraad en glijden naar hun plek, rij voor rij
    teken();
    if (motionOK() && maat) {
      const delay = new Map(), flip = new Map();
      let n = 0;
      for (let rij = 0; rij < 7; rij++) for (let col = rij; col < 7; col++) { const k = g.tab[col].k[rij]; delay.set(k, n * 55); flip.set(k, (n * 55 + 360) / 1000); n++; }
      kaarten.forEach((el, k) => { if (pos[k].pile === 'tab') { const bx = kolX(0), by = maat.yBoven; el.style.transform = `translate(${bx}px, ${by}px)`; el._x = bx; el._y = by; el._up = false; el.classList.remove('op'); el.style.zIndex = 400 + k; } });
      void tafel.offsetWidth;                          // eerst laten tekenen: anders draait er niets om
      teken({ animeer: true, vertraging: delay, flipVertraging: flip });
    }
    bewaar();
  } else teken();
  ro.observe(tafel);
  zeg(t('solitaire.msg.start'));
  if (E.klaar(g)) afgerond = true;
  else if (E.kanAfmaken(g)) zeg(t('solitaire.msg.canFinish', { finish: t('solitaire.finish') }));
  return () => { dood = true; ro.disconnect(); clearTimeout(tipTimer); };
}
