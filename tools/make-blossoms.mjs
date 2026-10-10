// Tekent de kersenbloesem-versiering met een vaste seed, zodat het resultaat altijd
// hetzelfde is.   Draai:  node tools/make-blossoms.mjs
//
// Uitvoer:
//   js/decor/*.js        brede takken en takjes als SVG-tekst (worden inline in de pagina gezet,
//                        zodat elke bloem apart kan opengaan en de tak kan wiegen)
//   assets/blossom.svg   één bloem (pictogram voor levens en menu)
//   assets/petal-*.svg   losse bloemblaadjes (vallende blaadjes, effecten)
//
// Voorvertoning van meerdere seeds:  PREVIEW=/pad/naar/map node tools/make-blossoms.mjs

import { writeFile, mkdir } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);

// ---------- hulpjes ----------
const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const f = (n) => Math.round(n * 10) / 10;
const rad = (d) => (d * Math.PI) / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (from, to) => ((((to - from) % 360) + 540) % 360) - 180;
const pick = (R, list) => list[Math.floor(R() * list.length)];

// zachte ruis (waarde-ruis) voor schorsvorm
function makeNoise(R) {
  const table = Array.from({ length: 64 }, () => R() * 2 - 1);
  return (x) => {
    const i = Math.floor(x), t = x - i, s = t * t * (3 - 2 * t);
    return lerp(table[((i % 64) + 64) % 64], table[(((i + 1) % 64) + 64) % 64], s);
  };
}

// ---------- kleuren ----------
const TONES = [   // [voet, midden, rand]: bijna wit met een roze gloed bij het hart
  ['#ee9db6', '#fad3df', '#fff7f9'],
  ['#e98aa8', '#f7c3d2', '#fff1f5'],
  ['#f3b3c6', '#fbe0e8', '#fffbfc'],
  ['#e57d9c', '#f4b4c7', '#fde6ed'],
];
const BARK = { old: '#4d3d3b', mid: '#6a5452', young: '#7d4a46', light: '#a58b86' };

// ---------- definities (per tekening, met voorvoegsel zodat ze niet botsen) ----------
function defs(P) {
  const grads = TONES.map(([a, b, c], i) =>
    `<radialGradient id="${P}p${i}" cx="50%" cy="104%" r="108%"><stop offset="0" stop-color="${a}"/><stop offset=".34" stop-color="${b}"/><stop offset=".78" stop-color="${c}"/><stop offset="1" stop-color="#fff"/></radialGradient>`).join('');
  return `<defs>${grads}`
    + `<radialGradient id="${P}ct"><stop offset="0" stop-color="#c63f6b"/><stop offset=".55" stop-color="#e17fa0"/><stop offset="1" stop-color="#f3b3c6" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${P}sh"><stop offset="0" stop-color="#6b2a43" stop-opacity=".22"/><stop offset=".7" stop-color="#6b2a43" stop-opacity=".07"/><stop offset="1" stop-color="#6b2a43" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="${P}bd" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#cf5580"/><stop offset=".7" stop-color="#f1a7bf"/><stop offset="1" stop-color="#fbd9e3"/></linearGradient>`
    + `<linearGradient id="${P}ca" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e3a3f"/><stop offset=".5" stop-color="#a0575b"/><stop offset="1" stop-color="#6e3a3f"/></linearGradient>`
    + `<linearGradient id="${P}l1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a4e3f"/><stop offset="1" stop-color="#b98059"/></linearGradient>`
    + `<linearGradient id="${P}l2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f8a55"/><stop offset="1" stop-color="#a3b878"/></linearGradient>`
    + `<filter id="${P}bk" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="2" seed="4" result="w"/>`
    + `<feDisplacementMap in="SourceGraphic" in2="w" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="d"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency=".03 .55" numOctaves="2" seed="9" result="n"/>`
    + `<feColorMatrix in="n" type="matrix" values="0 0 0 0 .16  0 0 0 0 .1  0 0 0 0 .1  0 0 0 1.1 -.42" result="g"/>`
    + `<feComposite in="g" in2="d" operator="in" result="gi"/>`
    + `<feMerge><feMergeNode in="d"/><feMergeNode in="gi"/></feMerge></filter>`
    + '</defs>';
}

// ---------- bloemdelen (tekenen in een symbool met straal 30) ----------
const U = 30;

function petalShape(L, w) {
  const X = (v) => f(v * L * w), Y = (v) => f(-v * L);
  return `M0 0C${X(-.30)} ${Y(.10)} ${X(-.58)} ${Y(.55)} ${X(-.40)} ${Y(.86)}C${X(-.34)} ${Y(.97)} ${X(-.16)} ${Y(1.02)} ${X(-.07)} ${Y(.93)}L0 ${Y(.84)}L${X(.07)} ${Y(.93)}C${X(.16)} ${Y(1.02)} ${X(.34)} ${Y(.97)} ${X(.40)} ${Y(.86)}C${X(.58)} ${Y(.55)} ${X(.30)} ${Y(.10)} 0 0Z`;
}

function petal(P, R, L, w, tone) {
  const X = (v) => f(v * L * w), Y = (v) => f(-v * L);
  const edge = `M${X(-.40)} ${Y(.86)}C${X(-.34)} ${Y(.97)} ${X(-.16)} ${Y(1.02)} ${X(-.07)} ${Y(.93)}M${X(.07)} ${Y(.93)}C${X(.16)} ${Y(1.02)} ${X(.34)} ${Y(.97)} ${X(.40)} ${Y(.86)}`;
  const veins = [-.1, 0, .1].map((s) => `M0 ${Y(.05)}Q${X(s * 1.2)} ${Y(.35)} ${X(s * 2.2)} ${Y(.66 + R() * .08)}`).join('');
  return `<path d="${petalShape(L, w)}" fill="url(#${P}p${tone})" stroke="#e39ab4" stroke-opacity=".5" stroke-width=".5"/>`
    + `<path d="${veins}" fill="none" stroke="#dc7596" stroke-opacity=".3" stroke-width=".42"/>`
    + `<path d="M${X(.30)} ${Y(.15)}C${X(.56)} ${Y(.5)} ${X(.5)} ${Y(.7)} ${X(.4)} ${Y(.86)}L${X(.28)} ${Y(.7)}Z" fill="#a8456a" fill-opacity=".07"/>`
    + `<path d="${edge}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".7" stroke-linecap="round"/>`;
}

function stamens(P, R, reach, count, origin = [0, 0], spread = [0, 360]) {
  let fil = '', a1 = '', a2 = '', a3 = '';
  for (let k = 0; k < count; k++) {
    const a = rad(lerp(spread[0], spread[1], (k + R() * .8) / count));
    const len = reach * (.4 + R() * .6);
    const ex = Math.cos(a) * len, ey = Math.sin(a) * len;
    const bend = (R() - .5) * len * .45;
    const cx = Math.cos(a) * len * .55 - Math.sin(a) * bend, cy = Math.sin(a) * len * .55 + Math.cos(a) * bend;
    fil += `M${f(origin[0])} ${f(origin[1])}Q${f(origin[0] + cx)} ${f(origin[1] + cy)} ${f(origin[0] + ex)} ${f(origin[1] + ey)}`;
    const dot = `M${f(origin[0] + ex)} ${f(origin[1] + ey)}h0`;
    const c = R();
    if (c < .5) a1 += dot; else if (c < .82) a2 += dot; else a3 += dot;
  }
  return `<path d="${fil}" fill="none" stroke="#e48aa9" stroke-width=".55" stroke-linecap="round"/>`
    + `<path d="${a1}" stroke="#c0426b" stroke-width="1.9" stroke-linecap="round"/>`
    + `<path d="${a2}" stroke="#f0c75a" stroke-width="1.7" stroke-linecap="round"/>`
    + `<path d="${a3}" stroke="#fff0c0" stroke-width="1.5" stroke-linecap="round"/>`;
}

// bloem van boven gezien
function openFlower(P, R, tone, size = U) {
  const out = [`<circle cx="1.6" cy="2.6" r="${f(size * 1.06)}" fill="url(#${P}sh)"/>`];
  const base = R() * 72;
  for (let i = 0; i < 5; i++) {
    out.push(`<g transform="rotate(${f(base + i * 72 + (R() - .5) * 9)})">${petal(P, R, size * (.93 + R() * .12), .92 + R() * .14, tone)}</g>`);
  }
  out.push(`<circle r="${f(size * .22)}" fill="url(#${P}ct)"/>`);
  out.push(stamens(P, R, size * .62, 18));
  out.push(`<path d="M0 0L${f((R() - .5) * size * .3)} ${f(-size * .34)}" stroke="#d58aa2" stroke-width=".9" stroke-linecap="round"/><circle cx="0" cy="${f(-size * .34)}" r="1.3" fill="#c9dc9f"/>`);
  return out.join('');
}

// half open (van opzij): kelk met een waaier van bloemblaadjes
function cupFlower(P, R, tone, size = U, open = 1) {
  const out = [`<ellipse cx="1.5" cy="${f(-size * .35)}" rx="${f(size * .95)}" ry="${f(size * .8)}" fill="url(#${P}sh)"/>`];
  out.push(`<path d="M${f(-size * .17)} ${f(-size * .02)}C${f(-size * .2)} ${f(size * .18)} ${f(-size * .1)} ${f(size * .38)} 0 ${f(size * .46)}C${f(size * .1)} ${f(size * .38)} ${f(size * .2)} ${f(size * .18)} ${f(size * .17)} ${f(-size * .02)}Z" fill="url(#${P}ca)"/>`);
  out.push(`<path d="M${f(-size * .17)} ${f(-size * .02)}L${f(-size * .08)} ${f(-size * .2)}L0 ${f(-size * .02)}L${f(size * .08)} ${f(-size * .2)}L${f(size * .17)} ${f(-size * .02)}Z" fill="#8c4a50"/>`);
  out.push(`<ellipse cx="0" cy="${f(-size * .38)}" rx="${f(size * .5)}" ry="${f(size * .52)}" fill="url(#${P}ct)" opacity=".75"/>`);
  out.push(stamens(P, R, size * .8, 16, [0, f(-size * .12)], [-150, -30]));
  const angles = open > .8 ? [-74, -38, 38, 74, 0] : [-48, -24, 24, 48, 0];
  for (const a of angles) {
    const L = size * (.86 + R() * .14) * (a === 0 ? 1.05 : 1);
    out.push(`<g transform="translate(0 ${f(-size * .05)}) rotate(${f(a + (R() - .5) * 8)}) scale(${a === 0 ? 1 : .94} 1)">${petal(P, R, L, a === 0 ? .98 : .86 + R() * .1, tone)}</g>`);
  }
  return out.join('');
}

// knop
function budShape(P, R, size = U, stage = 0) {
  const s = size, W = [.34, .4, .46][stage] * s, H = [.86, .82, .74][stage] * s;
  const out = [];
  out.push(`<path d="M0 0C${f(-W)} ${f(-H * .1)} ${f(-W * 1.1)} ${f(-H * .75)} 0 ${f(-H)}C${f(W * 1.1)} ${f(-H * .75)} ${f(W)} ${f(-H * .1)} 0 0Z" fill="url(#${P}bd)" stroke="#d0668a" stroke-width=".5" stroke-opacity=".5"/>`);
  out.push(`<path d="M0 ${f(-H * .15)}C${f(-W * .25)} ${f(-H * .5)} ${f(-W * .2)} ${f(-H * .8)} 0 ${f(-H * .95)}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".8" stroke-linecap="round"/>`);
  if (stage > 0) out.push(`<path d="M0 ${f(-H * .98)}L${f(-W * .35)} ${f(-H * .7)}M0 ${f(-H * .98)}L${f(W * .35)} ${f(-H * .7)}" stroke="#fff" stroke-opacity=".7" stroke-width=".7" fill="none"/>`);
  out.push(`<path d="M${f(-W * .85)} ${f(-H * .02)}L${f(-W * .4)} ${f(-H * .26)}L0 ${f(-H * .06)}L${f(W * .4)} ${f(-H * .26)}L${f(W * .85)} ${f(-H * .02)}L0 ${f(H * .1)}Z" fill="#8c4a50"/>`);
  return out.join('');
}

// blad (jong, brons tot groen), met getande rand en nerven
function leafShape(P, R, len, kind) {
  const W = len * .27, steps = 9, up = [], dn = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, w = Math.sin(Math.PI * Math.pow(t, .8)) * W, x = t * len, tooth = i % 2 && i < steps ? 1.1 : 0;
    up.push(`${f(x)} ${f(-(w + tooth))}`); dn.unshift(`${f(x)} ${f(w + tooth)}`);
  }
  const ribs = Array.from({ length: 5 }, (_, k) => {
    const x = len * (.18 + k * .15);
    return `M${f(x)} 0L${f(x + len * .1)} ${f(-W * .62)}M${f(x)} 0L${f(x + len * .1)} ${f(W * .62)}`;
  }).join('');
  return `<path d="M0 0L${up.join('L')}L${dn.join('L')}Z" fill="url(#${P}${kind})" stroke="#5e4a2e" stroke-opacity=".35" stroke-width=".5"/>`
    + `<path d="M0 0L${f(len * .96)} 0${ribs}" fill="none" stroke="#f2e6c9" stroke-opacity=".5" stroke-width=".6"/>`;
}

// ---------- takken ----------
function grow({ x, y, a, len, w0, w1, bend, N, steps = 30, kink = 0, noiseAmp = 0 }) {
  const pts = [];
  const ds = len / steps;
  let k = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (kink && i > 0 && i % 5 === 0) k += (N(i * 1.7) * kink);       // knik bij elke knoop
    const ang = a + bend(t) + k + N(i * .35) * noiseAmp;
    pts.push({ x, y, ang, t, h: lerp(w0, w1, Math.pow(t, .8)) / 2 });
    x += Math.cos(rad(ang)) * ds; y += Math.sin(rad(ang)) * ds;
  }
  return pts;
}

function limb(pts, colors, R, N, P) {
  const left = [], right = [], lite = [];
  pts.forEach((p, i) => {
    const nx = -Math.sin(rad(p.ang)), ny = Math.cos(rad(p.ang));
    const wl = p.h * (1 + .1 * N(i * .5 + 3)), wr = p.h * (1 + .1 * N(i * .5 + 17));
    left.push(`${f(p.x + nx * wl)} ${f(p.y + ny * wl)}`);
    right.push(`${f(p.x - nx * wr)} ${f(p.y - ny * wr)}`);
    const up = ny > 0 ? -1 : 1;       // naar de lichtkant (boven)
    lite.push(`${f(p.x + up * nx * p.h * .38)} ${f(p.y + up * ny * p.h * .38)}`);
  });
  const end = pts[pts.length - 1];
  let svg = `<path d="M${left.join('L')}L${right.reverse().join('L')}Z" fill="${colors.base}"/>`;
  svg += `<circle cx="${f(end.x)}" cy="${f(end.y)}" r="${f(end.h * .95)}" fill="${colors.base}"/>`;
  if (pts[0].h > 1.5) {
    svg += `<path d="M${lite.join('L')}" fill="none" stroke="${colors.light}" stroke-opacity=".55" stroke-width="${f(Math.max(.9, pts[Math.floor(pts.length / 2)].h * .8))}" stroke-linecap="round" stroke-linejoin="round"/>`;
    svg += `<path d="M${lite.join('L')}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="${f(Math.max(.5, pts[Math.floor(pts.length / 2)].h * .3))}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  // lenticellen: korte lichte dwarsstreepjes, typisch voor kersenschors
  for (const p of pts) {
    if (p.h < 1.9 || R() > .3) continue;
    const tx = Math.cos(rad(p.ang)), ty = Math.sin(rad(p.ang)), nx = -ty, ny = tx;
    const o = (R() - .5) * p.h * 1.2, w = p.h * (.5 + R() * .5);
    svg += `<path d="M${f(p.x + nx * o - tx * w * .5)} ${f(p.y + ny * o - ty * w * .5)}L${f(p.x + nx * o + tx * w * .5)} ${f(p.y + ny * o + ty * w * .5)}" stroke="#d8c2bb" stroke-opacity=".5" stroke-width="${f(.7 + R() * .6)}" stroke-linecap="round"/>`;
  }
  // korstmos op de dikke takken
  if (pts[0].h > 4) {
    for (let k = 0; k < 7; k++) {
      const p = pts[Math.floor(R() * pts.length)];
      svg += `<ellipse cx="${f(p.x + (R() - .5) * p.h)}" cy="${f(p.y + (R() - .5) * p.h)}" rx="${f(1.2 + R() * 2.4)}" ry="${f(.8 + R() * 1.4)}" fill="#a9b59a" fill-opacity=".28"/>`;
    }
  }
  return svg;
}

// ---------- een hele tekening ----------
function compose(name, seed, o) {
  const R = rng(seed), N = makeNoise(rng(seed + 99));
  const P = `${name}-`;
  const limbs = [], leaves = [], items = [];     // items: bloemen en knoppen met diepte
  const syms = [];                               // de bloemsymbolen (hergebruikt via <use>)
  let order = 0;

  // bloemsymbolen: een paar varianten, elk anders getekend
  const kinds = { open: [], cup: [], bud: [] };
  for (let i = 0; i < o.variants.open; i++) { syms.push(`<g id="${P}o${i}">${openFlower(P, R, i % 4)}</g>`); kinds.open.push(`${P}o${i}`); }
  for (let i = 0; i < o.variants.cup; i++) { syms.push(`<g id="${P}c${i}">${cupFlower(P, R, (i + 1) % 4, U, i % 2 ? .6 : 1)}</g>`); kinds.cup.push(`${P}c${i}`); }
  for (let i = 0; i < o.variants.bud; i++) { syms.push(`<g id="${P}b${i}">${budShape(P, R, U, i % 3)}</g>`); kinds.bud.push(`${P}b${i}`); }
  const LEAVES = [leafShape(P, R, 40, 'l1'), leafShape(P, R, 40, 'l2'), leafShape(P, R, 34, 'l1')];
  LEAVES.forEach((l, i) => syms.push(`<g id="${P}lf${i}">${l}</g>`));

  const B = o.bounds;
  const inside = (x, y, m) => x > B.x0 + m && x < B.x1 - m && y > B.y0 + m && y < B.y1 - m;

  function place(kind, x, y, rot, r, depth) {
    const id = pick(R, kinds[kind]);
    const flip = R() < .5 ? -1 : 1;
    const sc = r / U;
    items.push({ depth, y, i: order++, svg:
      `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(sc * flip)} ${f(sc)})" opacity="${f(lerp(.88, 1, depth))}"><g class="fl" style="--i:${order}"><use href="#${id}"/></g></g>` });
  }

  // een bloemtros op een kort steeltje (spoor) met 2 tot 5 bloemen
  function spur(x, y, ang, r, big) {
    const n = big ? 2 + Math.floor(R() * 3) : 1 + Math.floor(R() * 2);
    const sx = x + Math.cos(rad(ang)) * 6, sy = y + Math.sin(rad(ang)) * 6;
    limbs.push(`<path d="M${f(x)} ${f(y)}L${f(sx)} ${f(sy)}" stroke="${BARK.young}" stroke-width="2.4" stroke-linecap="round"/>`);
    // kleine schutblaadjes bij de voet
    for (let k = 0; k < 2; k++) leaves.push(`<g transform="translate(${f(sx)} ${f(sy)}) rotate(${f(ang + (k ? 60 : -60))}) scale(.22)"><use href="#${P}lf${k}"/></g>`);
    for (let k = 0; k < n; k++) {
      const spreadA = ang + (k - (n - 1) / 2) * (30 + R() * 16) + (R() - .5) * 18 + angDiff(ang, 90) * .12;
      const len = r * (.55 + R() * .75);
      const fx = sx + Math.cos(rad(spreadA)) * len, fy = sy + Math.sin(rad(spreadA)) * len;
      if (!inside(fx, fy, r * .3)) continue;
      const cx = sx + Math.cos(rad(spreadA + 14)) * len * .55, cy = sy + Math.sin(rad(spreadA + 14)) * len * .55;
      limbs.push(`<path d="M${f(sx)} ${f(sy)}Q${f(cx)} ${f(cy)} ${f(fx)} ${f(fy)}" fill="none" stroke="#8d5b57" stroke-width="1.15" stroke-linecap="round"/>`);
      const depth = R();
      const roll = R();
      const rr = r * lerp(.78, 1.12, depth);
      if (roll < .56) place('open', fx, fy, R() * 360, rr, depth);
      else if (roll < .8) place('cup', fx, fy, spreadA + 90 + (R() - .5) * 40, rr * .95, depth);
      else place('bud', fx, fy, spreadA + 90 + (R() - .5) * 30, rr * .85, depth);
    }
  }

  function twig(x, y, a, len, w0, depth, side) {
    const w1 = Math.max(1.3, w0 * .3);
    const sideBend = side * (8 + R() * 30) * (R() < .5 ? 1 : -.5);
    const toDown = angDiff(a, 90) * (o.gravity ?? .25);
    const pts = grow({ x, y, a, len, w0, w1, N, steps: 22, kink: 9, noiseAmp: 6, bend: (t) => sideBend * t + toDown * t * t });
    const colors = { base: depth >= 2 ? BARK.young : BARK.mid, light: BARK.light };
    limbs.push(limb(pts, colors, R, N, P));
    const end = pts[pts.length - 1];
    if (depth < o.depth) {
      const kids = 1 + Math.floor(R() * 2);
      for (let k = 0; k < kids; k++) {
        const p = pts[Math.floor(lerp(.35, .9, (k + R() * .5) / kids) * (pts.length - 1))];
        const s = k % 2 === 0 ? -side : side;
        limbs.push(`<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="${f(p.h * 1.5)}" ry="${f(p.h * 1.1)}" fill="${BARK.old}" fill-opacity=".35" transform="rotate(${f(p.ang)} ${f(p.x)} ${f(p.y)})"/>`);
        twig(p.x, p.y, p.ang + s * (26 + R() * 30), len * (.5 + R() * .2), Math.max(2.2, w0 * .55), depth + 1, s);
      }
    }
    // klein blad en bloemtrossen langs de twijg
    for (let i = 3; i < pts.length - 2; i += 3 + Math.floor(R() * 3)) {
      const p = pts[i], s = R() < .5 ? -1 : 1;
      if (R() < .4 * (o.density || 1)) spur(p.x, p.y, p.ang + s * (50 + R() * 35), o.r * (.78 + R() * .3), false);
      else if (R() < .55) leaves.push(`<g transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.ang + s * (40 + R() * 40))}) scale(${f(o.r / 60 + R() * .25)})"><use href="#${P}lf${Math.floor(R() * 3)}"/></g>`);
    }
    spur(end.x, end.y, end.ang, o.r * (depth === 0 ? 1.05 : .95), true);
  }

  // hoofdtak
  const main = grow({ x: o.start.x, y: o.start.y, a: o.start.a, len: o.len, w0: o.w0, w1: o.w1, N, steps: 54, kink: 5, noiseAmp: 4, bend: o.bend });
  limbs.push(limb(main, { base: BARK.old, light: BARK.light }, R, N, P));
  for (const b of o.branches) {
    const p = main[Math.floor(b.t * (main.length - 1))];
    limbs.push(`<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="${f(p.h * 1.5)}" ry="${f(p.h * 1.2)}" fill="${BARK.old}" transform="rotate(${f(p.ang)} ${f(p.x)} ${f(p.y)})"/>`);
    twig(p.x, p.y, p.ang + b.side * (o.fork + R() * 14), o.len * b.lenK, b.w, 1, b.side);
  }
  // bloemtrossen direct aan de hoofdtak
  for (let i = Math.floor(main.length * .22); i < main.length - 1; i += 5 + Math.floor(R() * 5)) {
    const p = main[i];
    if (R() < .5 * (o.density || 1)) spur(p.x, p.y, p.ang + (R() < .5 ? -1 : 1) * (60 + R() * 35), o.r * (.85 + R() * .25), false);
  }
  const end = main[main.length - 1];
  spur(end.x, end.y, end.ang, o.r * 1.1, true);

  items.sort((a, b) => a.depth - b.depth);
  // Twee lagen boven elkaar: de schors (zwaar filter, wordt maar één keer getekend) en de bloemen
  // (die bewegen). Zo hoeft het filter niet bij elke animatiestap opnieuw te worden berekend.
  const attrs = `viewBox="0 0 ${o.w} ${o.h}" aria-hidden="true" focusable="false"`;
  const bark = `<svg class="art-bark" xmlns="http://www.w3.org/2000/svg" ${attrs}>${defs(P)}<defs>${syms.join('')}</defs>`
    + `<g filter="url(#${P}bk)">${limbs.join('')}</g><g>${leaves.join('')}</g></svg>`;
  const bloom = `<svg class="art-bloom" xmlns="http://www.w3.org/2000/svg" ${attrs}>${items.map((x) => x.svg).join('')}</svg>`;
  return `<div class="art-stack">${bark}${bloom}</div>`;
}

// ---------- de ontwerpen ----------
const DESIGNS = {
  // hangt vanuit de rechterbovenhoek (Spellen, Spel)
  'hang-rechts': () => ({
    w: 640, h: 300, r: 27, depth: 2, gravity: .24, fork: 40,
    variants: { open: 6, cup: 3, bud: 3 },
    bounds: { x0: -40, y0: -40, x1: 680, y1: 340 },
    start: { x: 700, y: -28, a: 156 }, len: 640, w0: 26, w1: 5,
    bend: (t) => -16 * Math.sin(t * Math.PI * .9) + 26 * t * t,
    branches: [{ t: .16, side: 1, lenK: .34, w: 9 }, { t: .32, side: -1, lenK: .3, w: 8 }, { t: .48, side: 1, lenK: .3, w: 7 }, { t: .64, side: -1, lenK: .28, w: 6 }, { t: .8, side: 1, lenK: .26, w: 5 }],
  }),
  // hangt vanuit de linkerbovenhoek (Instellingen)
  'hang-links': () => ({
    w: 640, h: 300, r: 27, depth: 2, gravity: .3, fork: 36,
    variants: { open: 6, cup: 3, bud: 3 },
    bounds: { x0: -40, y0: -40, x1: 680, y1: 340 },
    start: { x: -60, y: -20, a: 26 }, len: 600, w0: 24, w1: 5,
    bend: (t) => 18 * Math.sin(t * Math.PI * 1.1) - 12 * t * t,
    branches: [{ t: .18, side: -1, lenK: .36, w: 9 }, { t: .36, side: 1, lenK: .3, w: 8 }, { t: .54, side: -1, lenK: .3, w: 7 }, { t: .72, side: 1, lenK: .27, w: 6 }],
  }),
  // brede boog over de bovenkant (Start)
  'boog': () => ({
    w: 900, h: 300, r: 38, density: 1.7, depth: 2, gravity: .3, fork: 42,
    variants: { open: 7, cup: 4, bud: 3 },
    bounds: { x0: -40, y0: -40, x1: 940, y1: 340 },
    start: { x: 950, y: -10, a: 168 }, len: 1000, w0: 28, w1: 6,
    bend: (t) => 22 * Math.sin(t * Math.PI * 1.4) + 8 * t,
    branches: [{ t: .1, side: 1, lenK: .22, w: 9 }, { t: .22, side: -1, lenK: .2, w: 8 }, { t: .34, side: 1, lenK: .22, w: 9 }, { t: .46, side: -1, lenK: .2, w: 8 }, { t: .58, side: 1, lenK: .22, w: 8 }, { t: .7, side: -1, lenK: .2, w: 7 }, { t: .82, side: 1, lenK: .2, w: 6 }],
  }),
  // korte takspray, minder druk (Hulp, Account)
  'spray': () => ({
    w: 640, h: 300, r: 31, depth: 1, gravity: .2, fork: 44,
    variants: { open: 5, cup: 3, bud: 2 },
    bounds: { x0: -40, y0: -40, x1: 680, y1: 340 },
    start: { x: 690, y: 40, a: 178 }, len: 470, w0: 20, w1: 5,
    bend: (t) => -10 * Math.sin(t * Math.PI) + 16 * t * t,
    branches: [{ t: .22, side: 1, lenK: .4, w: 8 }, { t: .5, side: -1, lenK: .36, w: 7 }, { t: .76, side: 1, lenK: .3, w: 6 }],
  }),
  // takjes: klein, voor de hoofdkaart en dialogen
  'takje-a': () => ({
    w: 360, h: 220, r: 23, depth: 1, gravity: .22, fork: 40,
    variants: { open: 4, cup: 2, bud: 2 },
    bounds: { x0: -30, y0: -30, x1: 390, y1: 250 },
    start: { x: 392, y: -20, a: 154 }, len: 340, w0: 15, w1: 4,
    bend: (t) => -10 * Math.sin(t * Math.PI) + 22 * t * t,
    branches: [{ t: .28, side: 1, lenK: .4, w: 6 }, { t: .5, side: -1, lenK: .36, w: 5 }, { t: .72, side: 1, lenK: .3, w: 4 }],
  }),
  'takje-b': () => ({
    w: 360, h: 220, r: 23, depth: 1, gravity: .26, fork: 38,
    variants: { open: 4, cup: 2, bud: 2 },
    bounds: { x0: -30, y0: -30, x1: 390, y1: 250 },
    start: { x: -30, y: -16, a: 28 }, len: 330, w0: 14, w1: 4,
    bend: (t) => 14 * Math.sin(t * Math.PI) - 12 * t * t,
    branches: [{ t: .3, side: -1, lenK: .4, w: 6 }, { t: .56, side: 1, lenK: .34, w: 5 }, { t: .78, side: -1, lenK: .28, w: 4 }],
  }),
  'takje-c': () => ({
    w: 360, h: 220, r: 24, depth: 1, gravity: .4, fork: 34,
    variants: { open: 4, cup: 2, bud: 2 },
    bounds: { x0: -30, y0: -30, x1: 390, y1: 250 },
    start: { x: 250, y: -24, a: 112 }, len: 240, w0: 13, w1: 4,
    bend: (t) => -16 * Math.sin(t * Math.PI * 1.1) + 24 * t * t,
    branches: [{ t: .3, side: 1, lenK: .5, w: 6 }, { t: .55, side: -1, lenK: .45, w: 5 }],
  }),
};

// gekozen seeds (zie PREVIEW voor het uitzoeken)
const SEEDS = { 'hang-rechts': 6, 'hang-links': 1, 'boog': 4, 'spray': 2, 'takje-a': 5, 'takje-b': 1, 'takje-c': 2 };

// ---------- losse onderdelen ----------
function singleFlower(seed) {
  const R = rng(seed), P = 'bl-';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-36 -36 72 72" width="72" height="72">${defs(P)}${openFlower(P, R, 0, 33)}</svg>`;
}
function singlePetal(seed, tone) {
  const R = rng(seed), P = 'pt-';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -34 28 36" width="28" height="36">${defs(P)}${petal(P, R, 32, .95, tone)}</svg>`;
}

// ---------- schrijven ----------
const only = process.argv[2];
if (process.env.PREVIEW) {
  const dir = process.env.PREVIEW;
  await mkdir(dir, { recursive: true });
  for (const name of Object.keys(DESIGNS)) {
    if (only && only !== name) continue;
    for (let s = 1; s <= 6; s++) await writeFile(`${dir}/${name}-${s}.svg`, compose(name.replace(/\W/g, ''), s, DESIGNS[name]()));
  }
  console.log('voorvertoning in', dir);
} else {
  await mkdir(new URL('js/decor/', ROOT), { recursive: true });
  await mkdir(new URL('assets/', ROOT), { recursive: true });
  const sizes = {};
  for (const [name, make] of Object.entries(DESIGNS)) {
    const o = make();
    const svg = compose(name.replace(/\W/g, ''), SEEDS[name], o);
    sizes[name] = `${(svg.length / 1024).toFixed(0)} kB`;
    await writeFile(new URL(`js/decor/${name}.js`, ROOT),
      `// Gegenereerd door tools/make-blossoms.mjs, niet met de hand aanpassen.\nexport const ratio = ${o.w} / ${o.h};\nexport default ${JSON.stringify(svg)};\n`);
  }
  await writeFile(new URL('assets/blossom.svg', ROOT), singleFlower(11));
  await writeFile(new URL('assets/petal-a.svg', ROOT), singlePetal(21, 0));
  await writeFile(new URL('assets/petal-b.svg', ROOT), singlePetal(22, 1));
  await writeFile(new URL('assets/petal-c.svg', ROOT), singlePetal(23, 2));
  console.log('geschreven:', sizes);
}
