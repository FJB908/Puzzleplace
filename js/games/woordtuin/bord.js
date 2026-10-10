// Het bord van Woordtuin: 6 bij 6 letters waarover je een woord maakt. Dit bestand tekent alleen het bord en
// houdt het gekozen pad bij; wat een zet betekent staat in engine.js en de rest van het scherm in paneel.js.
//
// Bediening, zodat het voor iedereen werkt:
//   - Veeg met je vinger (of de muis) over aangrenzende letters, of tik ze na elkaar aan.
//   - Tik je op de laatste letter, dan haal je die weg. Tik je op een eerdere letter, dan ga je terug tot daar.
//   - Toetsenbord: pijltjes om te bewegen, Enter of spatie om een letter te kiezen, Backspace om er een weg te halen.

import { h } from '../../ui.js';
import { neighbors, isProtected } from './engine.js';

const svgNS = 'http://www.w3.org/2000/svg';

export function maakBord({ size = 6, onChange }) {
  const N = size;
  let state = null, me = 1, path = [], enabled = true, cursor = 0, preview = null;
  const tiles = [];

  const lijn = document.createElementNS(svgNS, 'polyline');
  lijn.setAttribute('class', 'wt-lijn');
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'wt-pad'); svg.setAttribute('aria-hidden', 'true');
  svg.append(lijn);

  const el = h('div', { class: 'wt-bord', role: 'grid', 'aria-label': `Het bord, ${N} bij ${N} letters`, style: `--n:${N}`, onkeydown: onKey });
  for (let i = 0; i < N * N; i++) {
    const t = h('div', { class: 'wt-tegel', role: 'gridcell', 'data-i': i, tabindex: '-1' }, h('span', { class: 'wt-l' }, ''));
    tiles.push(t); el.append(t);
  }
  el.append(svg);

  // ----- Weergave -----
  const rij = (i) => Math.floor(i / N) + 1, kol = (i) => (i % N) + 1;
  function label(i) {
    const o = state.owner[i];
    const wie = !o ? 'nog open' : o === me ? 'van jou' : 'van de ander';
    const bescherming = o && isProtected(state.owner, i, N) ? ', beschermd' : '';
    const pos = path.indexOf(i);
    return `Letter ${state.letters[i].toUpperCase()}, rij ${rij(i)}, kolom ${kol(i)}, ${wie}${bescherming}${pos >= 0 ? `, nummer ${pos + 1} van je woord` : ''}`;
  }

  function teken() {
    if (!state) return;
    const sel = new Map(path.map((i, k) => [i, k + 1]));
    tiles.forEach((t, i) => {
      const o = state.owner[i], c = t.classList;
      t.firstChild.textContent = state.letters[i];
      c.toggle('mijn', o === me && o > 0);
      c.toggle('hun', o > 0 && o !== me);
      c.toggle('veilig', !!o && isProtected(state.owner, i, N));
      c.toggle('gekozen', sel.has(i));
      c.toggle('pak', sel.has(i) && !!preview?.take?.includes(i));
      c.toggle('blijft', sel.has(i) && !!preview?.kept?.includes(i));
      c.toggle('laatst', !!state.last?.path.includes(i));
      let nr = t.querySelector('.wt-nr');
      if (sel.has(i)) { if (!nr) { nr = h('span', { class: 'wt-nr', 'aria-hidden': 'true' }, ''); t.append(nr); } nr.textContent = String(sel.get(i)); }
      else nr?.remove();
      t.tabIndex = i === cursor ? 0 : -1;
      t.setAttribute('aria-label', label(i));
    });
    el.classList.toggle('uit', !enabled);
    el.setAttribute('aria-disabled', String(!enabled));
    trek();
  }

  // De lijn door de gekozen letters (in pixels van het bord, dus schaalt mee: opnieuw tekenen bij verkleinen)
  function trek() {
    const b = el.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
    if (path.length < 2 || !b.width) { lijn.setAttribute('points', ''); return; }
    lijn.setAttribute('points', path.map((i) => { const r = tiles[i].getBoundingClientRect(); return `${r.left - b.left + r.width / 2},${r.top - b.top + r.height / 2}`; }).join(' '));
  }
  new ResizeObserver(trek).observe(el);

  function zet(next, bron = 'gebruiker') {
    path = next;
    teken();
    onChange?.(path.slice(), bron);
  }

  // ----- Kiezen -----
  const grenst = (a, b) => neighbors(a, N).includes(b);
  function tik(i) {
    if (!enabled || !state) return;
    cursor = i;
    const k = path.indexOf(i);
    if (!path.length) return zet([i]);
    if (k === path.length - 1) return zet(path.slice(0, -1));          // laatste letter: weghalen
    if (k >= 0) return zet(path.slice(0, k + 1));                      // een eerdere letter: terug tot daar
    if (grenst(path[path.length - 1], i) && path.length < 7) return zet([...path, i]);
    return zet([i]);                                                   // niet aansluitend: opnieuw beginnen
  }

  // Vegen: een letter telt pas mee als je dicht bij het midden bent, zodat je niet per ongeluk een buurletter raakt
  function tegelOp(x, y) {
    const t = document.elementFromPoint(x, y)?.closest?.('.wt-tegel');
    if (!t || !el.contains(t)) return -1;
    const r = t.getBoundingClientRect();
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    return d <= r.width * 0.46 ? Number(t.dataset.i) : -1;
  }
  let veeg = null;
  el.addEventListener('pointerdown', (e) => {
    if (!enabled || !state || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const i = tegelOp(e.clientX, e.clientY);
    veeg = { id: e.pointerId, start: i, bewogen: false, x: e.clientX, y: e.clientY };
  });
  el.addEventListener('pointermove', (e) => {
    if (!veeg || veeg.id !== e.pointerId) return;
    if (!veeg.bewogen && Math.hypot(e.clientX - veeg.x, e.clientY - veeg.y) < 8) return;
    if (!veeg.bewogen) {
      veeg.bewogen = true;
      try { el.setPointerCapture(e.pointerId); } catch { /* niet erg */ }
      if (veeg.start >= 0) { cursor = veeg.start; zet([veeg.start]); }
    }
    const i = tegelOp(e.clientX, e.clientY);
    if (i < 0 || !path.length) return;
    const last = path[path.length - 1];
    if (i === last) return;
    if (path.length >= 2 && i === path[path.length - 2]) return zet(path.slice(0, -1));   // terugvegen
    if (!path.includes(i) && grenst(last, i) && path.length < 7) zet([...path, i]);
  });
  const eind = (e) => {
    if (!veeg || veeg.id !== e.pointerId) return;
    const v = veeg; veeg = null;
    if (!v.bewogen && e.type === 'pointerup' && v.start >= 0) tik(v.start);
  };
  el.addEventListener('pointerup', eind);
  el.addEventListener('pointercancel', eind);

  // Een klik zonder aanraking of muis (schermlezer, spraakbesturing): gewoon als tik behandelen
  el.addEventListener('click', (e) => { if (e.detail !== 0) return; const t = e.target.closest?.('.wt-tegel'); if (t) tik(Number(t.dataset.i)); });

  // ----- Toetsenbord -----
  function onKey(e) {
    const stap = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    if (stap) {
      const r = Math.min(N - 1, Math.max(0, Math.floor(cursor / N) + stap[0])), c = Math.min(N - 1, Math.max(0, (cursor % N) + stap[1]));
      cursor = r * N + c; teken(); tiles[cursor].focus({ preventScroll: true }); e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') { tik(cursor); tiles[cursor].focus({ preventScroll: true }); e.preventDefault(); }
    else if (e.key === 'Backspace') { zet(path.slice(0, -1)); e.preventDefault(); }
    else if (e.key === 'Escape') { zet([]); }
  }

  // ----- Wat de ouder kan doen -----
  return {
    el,
    setState(s, speler) { state = s; me = speler; if (path.some((i) => i >= N * N)) path = []; teken(); },
    getPath: () => path.slice(),
    setPath(p, bron = 'programma') { zet(p.slice(), bron); },
    clear() { if (path.length) zet([]); else { preview = null; teken(); } },
    setPreview(p) { preview = p; teken(); },
    setEnabled(b) { enabled = b; teken(); },
    // Een tegel laten pulseren (tip), of de tegels van de laatste zet na elkaar laten opbloeien
    wijs(i, ms = 3200) { tiles[i].classList.remove('tip'); void tiles[i].offsetWidth; tiles[i].classList.add('tip'); cursor = i; setTimeout(() => tiles[i]?.classList.remove('tip'), ms); },
    bloei(indices, { stap = 90 } = {}) { indices.forEach((i, k) => { const t = tiles[i]; t.style.setProperty('--vertraging', `${k * stap}ms`); t.classList.remove('bloeit'); void t.offsetWidth; t.classList.add('bloeit'); setTimeout(() => t.classList.remove('bloeit'), 1200 + k * stap); }); },
    tegel: (i) => tiles[i],
    midden(i) { const r = tiles[i].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; },
    focus() { tiles[cursor].focus({ preventScroll: true }); },
  };
}
