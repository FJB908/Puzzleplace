// Tekent de kersenbloesem-versiering (SVG) met een vaste seed, zodat het resultaat
// altijd hetzelfde is. Draai:  node tools/make-blossoms.mjs
//
// Uitvoer in assets/:
//   branch-top.svg   brede tak, hangt vanuit de rechterbovenhoek (paginakop)
//   sprig.svg        kleiner takje met lichte schors, voor op het donkerblauwe vlak
//   petals.svg                    losse bloemblaadjes
//   blossom.svg                   één bloem (pictogram, logo)

import { writeFile, mkdir } from 'node:fs/promises';

const OUT = new URL('../assets/', import.meta.url);

// ---------- kleine hulpjes ----------
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
const angDiff = (from, to) => ((((to - from) % 360) + 540) % 360) - 180;

const BARK = {
  mid:   { bark: '#7f6767', hi: '#b09a9a', len: '#d3c1c1' },   // brede tak: leesbaar op licht én donker
  light: { bark: '#c9b3b3', hi: '#efe3e3', len: '#8b7373' },   // takje op het donkerblauwe vlak
};

const UNIT = 'M0 0C-.3 -.1 -.58 -.55 -.4 -.86C-.34 -.97 -.16 -1.02 -.07 -.93L0 -.84L.07 -.93C.16 -1.02 .34 -.97 .4 -.86C.58 -.55 .3 -.1 0 0Z';
const VEIN = 'M0 -.05Q.03 -.34 0 -.6';
const petalDef = (id) => `<g id="pt-${id}"><path d="${UNIT}" fill="url(#${id})" stroke="#e59ab4" stroke-opacity=".6" stroke-width=".55" vector-effect="non-scaling-stroke"/><path d="${VEIN}" fill="none" stroke="#db7596" stroke-opacity=".34" stroke-width=".5" vector-effect="non-scaling-stroke"/></g>`;

const DEFS = `<defs>
<radialGradient id="pa" cx="50%" cy="104%" r="108%"><stop offset="0" stop-color="#e98aa8"/><stop offset=".30" stop-color="#f5b9ca"/><stop offset=".70" stop-color="#fbdee6"/><stop offset="1" stop-color="#fff4f7"/></radialGradient>
<radialGradient id="pb" cx="50%" cy="104%" r="108%"><stop offset="0" stop-color="#e2799a"/><stop offset=".30" stop-color="#f1a6bd"/><stop offset=".70" stop-color="#f8ccd9"/><stop offset="1" stop-color="#fde8ee"/></radialGradient>
<radialGradient id="pc" cx="50%" cy="104%" r="108%"><stop offset="0" stop-color="#f0a0b8"/><stop offset=".30" stop-color="#f9cad8"/><stop offset=".70" stop-color="#fde8ee"/><stop offset="1" stop-color="#fffafb"/></radialGradient>
<radialGradient id="ct"><stop offset="0" stop-color="#c2446d"/><stop offset=".6" stop-color="#df7d9c"/><stop offset="1" stop-color="#f3b3c6" stop-opacity="0"/></radialGradient>
<linearGradient id="bd" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#d4628a"/><stop offset="1" stop-color="#f7bccd"/></linearGradient>
<linearGradient id="lf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8aa37c"/><stop offset="1" stop-color="#b9cba4"/></linearGradient>
${petalDef('pa')}${petalDef('pb')}${petalDef('pc')}</defs>`;

// ---------- bloem, knop, blad ----------
const petal = (L, w, tone) => `<use href="#pt-${tone}" transform="scale(${f(L * w)} ${f(L)})"/>`;

function flower(R, x, y, r, rot, squash, tone) {
  const parts = [];
  const base = R() * 72;
  for (let i = 0; i < 5; i++) {
    const a = base + i * 72 + (R() - .5) * 9;
    parts.push(`<g transform="rotate(${f(a)})">${petal(r * (.92 + R() * .14), .94 + R() * .14, tone)}</g>`);
  }
  parts.push(`<circle r="${f(r * .2)}" fill="url(#ct)"/>`);
  const n = 9;
  let fil = '', dotA = '', dotB = '';
  for (let k = 0; k < n; k++) {
    const a = rad((k * 360) / n + R() * 26), len = r * (.4 + R() * .3);
    const ex = f(Math.cos(a) * len), ey = f(Math.sin(a) * len);
    fil += `M0 0L${ex} ${ey}`;
    if (R() < .72) dotA += `M${ex} ${ey}h0`; else dotB += `M${ex} ${ey}h0`;
  }
  const dr = f(Math.max(1.8, r * .1));
  parts.push(`<path d="${fil}" stroke="#e07c9d" stroke-width=".7" stroke-linecap="round" fill="none"/>`);
  parts.push(`<path d="${dotA}" stroke="#b8385f" stroke-width="${dr}" stroke-linecap="round"/>`);
  if (dotB) parts.push(`<path d="${dotB}" stroke="#e3b04b" stroke-width="${dr}" stroke-linecap="round"/>`);
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(1 ${squash})">${parts.join('')}</g>`;
}

function bud(x, y, s, rot) {
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">`
    + `<path d="M0 0C${f(-.55 * s)} ${f(-.25 * s)} ${f(-.6 * s)} ${f(-1.05 * s)} 0 ${f(-1.5 * s)}C${f(.6 * s)} ${f(-1.05 * s)} ${f(.55 * s)} ${f(-.25 * s)} 0 0Z" fill="url(#bd)" stroke="#d0668a" stroke-width=".5" stroke-opacity=".6"/>`
    + `<path d="M0 ${f(-.2 * s)}L${f(-.3 * s)} ${f(-.55 * s)}M0 ${f(-.2 * s)}L${f(.3 * s)} ${f(-.55 * s)}" stroke="#a24a63" stroke-width=".6" fill="none"/>`
    + `<path d="M${f(-.3 * s)} ${f(-.12 * s)}L0 ${f(.1 * s)}L${f(.3 * s)} ${f(-.12 * s)}Z" fill="#9a4d5e"/></g>`;
}

function leaf(x, y, len, rot) {
  const l = len;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})"><path d="M0 0C${f(l * .2)} ${f(-l * .3)} ${f(l * .72)} ${f(-l * .28)} ${f(l)} 0C${f(l * .72)} ${f(l * .28)} ${f(l * .2)} ${f(l * .3)} 0 0Z" fill="url(#lf)" stroke="#7d9470" stroke-width=".5" stroke-opacity=".6"/><path d="M0 0L${f(l * .9)} 0" stroke="#e8f0dc" stroke-opacity=".7" stroke-width=".6"/></g>`;
}

// ---------- takken ----------
// Hoeken in graden op het scherm: 0 = rechts, 90 = omlaag.
function grow({ x, y, a, len, w0, w1, bend, steps = 24 }) {
  const pts = [];
  const ds = len / steps;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, ang = a + bend(t);
    pts.push({ x, y, ang, t, h: lerp(w0, w1, Math.pow(t, .85)) / 2 });
    x += Math.cos(rad(ang)) * ds; y += Math.sin(rad(ang)) * ds;
  }
  return pts;
}

function barkShape(pts, pal, R) {
  const L = [], Rr = [];
  for (const p of pts) {
    const nx = -Math.sin(rad(p.ang)), ny = Math.cos(rad(p.ang));
    L.push(`${f(p.x + nx * p.h)} ${f(p.y + ny * p.h)}`);
    Rr.push(`${f(p.x - nx * p.h)} ${f(p.y - ny * p.h)}`);
  }
  const end = pts[pts.length - 1];
  let svg = `<path d="M${L.join('L')}L${Rr.reverse().join('L')}Z" fill="${pal.bark}"/>`;
  svg += `<circle cx="${f(end.x)}" cy="${f(end.y)}" r="${f(end.h)}" fill="${pal.bark}"/>`;
  // lichte streep aan de bovenkant en kleine dwarsstreepjes (lenticellen)
  const hi = pts.filter((_, i) => i % 2 === 0).map((p) => {
    const nx = -Math.sin(rad(p.ang)), ny = Math.cos(rad(p.ang));
    const s = ny > 0 ? -1 : 1;                       // normaal die omhoog wijst
    return `${f(p.x + s * nx * p.h * .45)} ${f(p.y + s * ny * p.h * .45)}`;
  });
  if (pts[0].h > 1.6) svg += `<path d="M${hi.join('L')}" fill="none" stroke="${pal.hi}" stroke-opacity=".5" stroke-width="${f(Math.max(.8, pts[Math.floor(pts.length / 2)].h * .55))}" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const p of pts) {
    if (p.h < 2.4 || R() > .16) continue;
    const tx = Math.cos(rad(p.ang)), ty = Math.sin(rad(p.ang)), nx = -ty, ny = tx;
    const o = (R() - .5) * p.h * 1.1, w = p.h * .6;
    svg += `<path d="M${f(p.x + nx * o - tx * w * .5)} ${f(p.y + ny * o - ty * w * .5)}L${f(p.x + nx * o + tx * w * .5)} ${f(p.y + ny * o + ty * w * .5)}" stroke="${pal.len}" stroke-opacity=".55" stroke-width=".9" stroke-linecap="round"/>`;
  }
  return svg;
}

function build(seed, o, pal) {
  const R = rng(seed);
  const bark = [], leaves = [], buds = [], flowers = [];
  const tones = ['pa', 'pb', 'pc', 'pa', 'pc'];
  const bounds = o.bounds;
  const inside = (x, y, m = 0) => x > bounds.x0 + m && x < bounds.x1 - m && y > bounds.y0 + m && y < bounds.y1 - m;

  function bloom(x, y, ang, r) {
    const squash = R() < .55 ? lerp(.9, 1, R()) : lerp(.5, .75, R());
    flowers.push({ y, svg: flower(R, x, y, r, ang + (R() - .5) * 80, squash, tones[Math.floor(R() * tones.length)]) });
  }

  function cluster(x, y, ang, r, big) {
    const n = big ? 2 + Math.floor(R() * 2) : 1 + Math.floor(R() * 2);
    for (let k = 0; k < n; k++) {
      const a = ang + (k - (n - 1) / 2) * (38 + R() * 24) + (R() - .5) * 20;
      const len = r * (.45 + R() * .5);
      const fx = x + Math.cos(rad(a)) * len, fy = y + Math.sin(rad(a)) * len;
      if (!inside(fx, fy, r * .5)) continue;
      bark.push(`<path d="M${f(x)} ${f(y)}L${f(fx)} ${f(fy)}" stroke="${pal.bark}" stroke-width="1.5" stroke-linecap="round"/>`);
      bloom(fx, fy, a + 90, r * (.82 + R() * .3));
    }
    if (R() < .7) {
      const a = ang + (R() - .5) * 90, len = r * .5;
      const bx = x + Math.cos(rad(a)) * len, by = y + Math.sin(rad(a)) * len;
      bark.push(`<path d="M${f(x)} ${f(y)}L${f(bx)} ${f(by)}" stroke="${pal.bark}" stroke-width="1.3" stroke-linecap="round"/>`);
      buds.push(bud(bx, by, r * (.26 + R() * .1), a + 90));
    }
  }

  function twig(x, y, a, len, w0, depth, side) {
    const w1 = Math.max(1.1, w0 * .28);
    const sideBend = side * (10 + R() * 34) * (R() < .5 ? 1 : -.6);
    const toDown = angDiff(a, 90) * (o.gravity ?? .32);
    const pts = grow({ x, y, a, len, w0, w1, bend: (t) => sideBend * t + toDown * t * t });
    bark.push(barkShape(pts, pal, R));
    const end = pts[pts.length - 1];
    if (depth < o.depth) {
      const kids = depth === 0 ? o.kids : 1 + Math.floor(R() * 2);
      for (let k = 0; k < kids; k++) {
        const t = lerp(.3, .88, (k + R() * .6) / kids);
        const p = pts[Math.floor(t * (pts.length - 1))];
        const s = k % 2 === 0 ? side * -1 : side;
        const ca = p.ang + s * (28 + R() * 34);
        twig(p.x, p.y, ca, len * (.5 + R() * .22), Math.max(2, w0 * .5), depth + 1, s);
      }
    }
    // losse bloemen en blaadjes langs de twijg
    if (depth >= 1) {
      for (let i = 4; i < pts.length - 3; i += 4 + Math.floor(R() * 4)) {
        const p = pts[i];
        if (R() < .68) {
          const a2 = p.ang + (R() < .5 ? -1 : 1) * (50 + R() * 35);
          const fl = o.r * (.74 + R() * .3);
          const fx = p.x + Math.cos(rad(a2)) * fl * .8, fy = p.y + Math.sin(rad(a2)) * fl * .8;
          if (inside(fx, fy, fl * .5)) bloom(fx, fy, a2 + 90, fl);
        } else if (R() < .6) {
          leaves.push(leaf(p.x, p.y, o.r * (.55 + R() * .35), p.ang + (R() < .5 ? -1 : 1) * (35 + R() * 30)));
        }
      }
    }
    cluster(end.x, end.y, end.ang, o.r * (depth === 0 ? 1 : .9 - depth * .06), depth <= 1);
  }

  // hoofdtak
  const main = grow({ x: o.start.x, y: o.start.y, a: o.start.a, len: o.len, w0: o.w0, w1: o.w1, bend: o.bend, steps: 44 });
  bark.push(barkShape(main, pal, R));
  o.branches.forEach(({ t, side, lenK, w }) => {
    const p = main[Math.floor(t * (main.length - 1))];
    twig(p.x, p.y, p.ang + side * (o.fork + R() * 12), o.len * lenK, w, 1, side);
  });
  for (let i = Math.floor(main.length * .25); i < main.length - 2; i += 5 + Math.floor(R() * 4)) {
    const p = main[i];
    if (R() < .6) {
      const a2 = p.ang + (R() < .5 ? -1 : 1) * (55 + R() * 40), fl = o.r * (.8 + R() * .3);
      const sx = p.x + Math.cos(rad(a2)) * fl * .9, sy = p.y + Math.sin(rad(a2)) * fl * .9;
      if (inside(sx, sy, fl * .5)) {
        bark.push(`<path d="M${f(p.x)} ${f(p.y)}L${f(sx)} ${f(sy)}" stroke="${pal.bark}" stroke-width="1.6" stroke-linecap="round"/>`);
        bloom(sx, sy, a2 + 90, fl);
      }
    }
  }
  const end = main[main.length - 1];
  cluster(end.x, end.y, end.ang, o.r * 1.05, true);

  flowers.sort((a, b) => a.y - b.y);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.w} ${o.h}" width="${o.w}" height="${o.h}">${DEFS}`
    + `<g>${bark.join('')}</g><g>${leaves.join('')}</g><g>${buds.join('')}</g><g>${flowers.map((x) => x.svg).join('')}</g></svg>`;
}

// brede tak vanuit de rechterbovenhoek
const BRANCH = (seed) => ({
  w: 640, h: 300, r: 26, depth: 2, kids: 2, gravity: .24, fork: 40,
  bounds: { x0: -40, y0: -40, x1: 680, y1: 340 },
  start: { x: 700, y: -26, a: 156 }, len: 600, w0: 24, w1: 5,
  bend: (t) => -16 * Math.sin(t * Math.PI * .9) + 26 * t * t,
  branches: [
    { t: .16, side: 1, lenK: .34, w: 9 }, { t: .32, side: -1, lenK: .3, w: 8 },
    { t: .48, side: 1, lenK: .3, w: 7 }, { t: .64, side: -1, lenK: .28, w: 6 },
    { t: .80, side: 1, lenK: .26, w: 5 },
  ],
});

// klein takje
const SPRIG = {
  w: 360, h: 220, r: 22, depth: 1, kids: 2, gravity: .22, fork: 40,
  bounds: { x0: -30, y0: -30, x1: 390, y1: 250 },
  start: { x: 390, y: -20, a: 154 }, len: 330, w0: 15, w1: 4,
  bend: (t) => -10 * Math.sin(t * Math.PI) + 22 * t * t,
  branches: [{ t: .28, side: 1, lenK: .4, w: 6 }, { t: .5, side: -1, lenK: .36, w: 5 }, { t: .72, side: 1, lenK: .3, w: 4 }],
};

function petals(seed) {
  const R = rng(seed), out = [];
  for (let i = 0; i < 26; i++) {
    const x = R() * 400, y = R() * 300, s = 8 + R() * 11, rot = R() * 360;
    const tone = ['pa', 'pb', 'pc'][Math.floor(R() * 3)];
    out.push(`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(1 ${f(.75 + R() * .25)})" opacity="${f(.55 + R() * .45)}">${petal(s, .95, tone)}</g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">${DEFS}${out.join('')}</svg>`;
}

function single(seed) {
  const R = rng(seed);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" width="100" height="100">${DEFS}${flower(R, 0, 0, 44, 0, 1, 'pa')}</svg>`;
}

// ---------- schrijven ----------
const seeds = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')).map(([k, v]) => [k, Number(v)]));
const BS = seeds.branch ?? 6, SS = seeds.sprig ?? 1;
await mkdir(OUT, { recursive: true });
await writeFile(new URL('branch-top.svg', OUT), build(BS, BRANCH(BS), BARK.mid));
await writeFile(new URL('sprig.svg', OUT), build(SS, SPRIG, BARK.light));
if (process.env.SHEET) for (let k = 1; k <= 8; k++) {
  await writeFile(new URL(`try-branch-${k}.svg`, OUT), build(k, BRANCH(k), BARK.mid));
  await writeFile(new URL(`try-sprig-${k}.svg`, OUT), build(k, SPRIG, BARK.light));
}
await writeFile(new URL('petals.svg', OUT), petals(5));
await writeFile(new URL('blossom.svg', OUT), single(11));
console.log('assets/ geschreven (branch seed', BS, ', sprig seed', SS, ')');
