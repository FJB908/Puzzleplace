// Solitaire: de boer, de vrouw en de heer. Zelf getekend, in dezelfde stijl als de Mahjong-tegels: porseleinen gezichten, gouden sieraden,
// kersenbloesem en lak. Elk hof is een staand portret in een gouden nis met een boog (een maanpoort). Elke kleur heeft haar eigen hof:
// schoppen indigo (de nacht), harten karmozijn (de bloesem), ruiten amber (het goud), klaver jade (het bamboe). In het plaatje staat geen
// kleurteken: dat staat al in de hoek van de kaart.
//
// Alles is gebouwd rond de as x = 30 van de kaart (60 bij 84). Een symmetrisch vlak wordt maar voor de helft beschreven (zie symVlak).

import { bloesemFig, PETAAL } from '../mahjong/tegels.js';

const f = (n) => Number(n.toFixed(2));
const polair = (cx, cy, r, hoek) => [cx + r * Math.sin(hoek * Math.PI / 180), cy - r * Math.cos(hoek * Math.PI / 180)];

// ----- De vier hoven -----
const HOVEN = [
  { robe: ['#5b72c8', '#1b2565'], donker: ['#3a4c9c', '#0f1748'], tint: ['#f3f5fc', '#c9d3ee'], licht: '#e4e9f8', pas: '#f0d98a' },       // schoppen
  { robe: ['#f2677d', '#a3162f'], donker: ['#d23850', '#740e21'], tint: ['#fff4f6', '#f8c9d6'], licht: '#ffe8ed', pas: '#ffd9e2' },       // harten
  { robe: ['#fcd35e', '#c27a0e'], donker: ['#eaa82f', '#8f5206'], tint: ['#fffae6', '#f4da96'], licht: '#fff3cc', pas: '#fff0b8' },       // ruiten
  { robe: ['#55c792', '#0e6a41'], donker: ['#2d9f6b', '#07472b'], tint: ['#f0faf4', '#bfe5cf'], licht: '#e0f5e9', pas: '#d9f3e4' },       // klaver
];

const lineair = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const minibloem = (cx, cy, r, kleur) => [0, 1, 2, 3, 4].map((k) => { const [x, y] = polair(cx, cy, r * 0.78, k * 72); return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.56)}" fill="${kleur}"/>`; }).join('') + `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.3)}" fill="#e9c766"/>`;
const golven = (d, kleur, op) => `<g fill="none" stroke="${kleur}" stroke-opacity="${op}" stroke-width=".32">` + [[0, 0], [d, 0], [d / 2, d / 2], [0, d], [d, d]].map(([x, y]) => [d / 2, d * 0.35, d * 0.2].map((r) => `<circle cx="${x}" cy="${y}" r="${f(r)}"/>`).join('')).join('') + '</g>';

export const HOF_DEFS = '<defs>'
  + '<radialGradient id="hofHuid" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fff7ef"/><stop offset=".62" stop-color="#f9e0cb"/><stop offset="1" stop-color="#ecc3a4"/></radialGradient>'
  + lineair('hofHals', '#d3a081', '#f6dcc6')
  + '<linearGradient id="hofHaar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b3e5a"/><stop offset=".4" stop-color="#241b2e"/><stop offset="1" stop-color="#0e0a13"/></linearGradient>'
  + '<radialGradient id="hofSchijf" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#fffef9"/><stop offset=".7" stop-color="#fdf3da"/><stop offset="1" stop-color="#f6e3b4"/></radialGradient>'
  + '<radialGradient id="hofParel" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f3e8d0"/><stop offset="1" stop-color="#cdbb92"/></radialGradient>'
  + '<radialGradient id="hofJade" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#bfeed3"/><stop offset=".55" stop-color="#4fb987"/><stop offset="1" stop-color="#14663f"/></radialGradient>'
  + '<linearGradient id="hofKaak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a4a30" stop-opacity=".26"/><stop offset=".3" stop-color="#8a4a30" stop-opacity="0"/><stop offset=".8" stop-color="#8a4a30" stop-opacity="0"/><stop offset="1" stop-color="#8a4a30" stop-opacity=".16"/></linearGradient>'
  + '<radialGradient id="hofRand" cx=".5" cy=".5" r=".62"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a2410" stop-opacity=".22"/></radialGradient>'
  + '<radialGradient id="hofSchijn" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
  + '<pattern id="hofPatK" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r=".34" fill="#cda24a" fill-opacity=".9"/><circle cx="0" cy="0" r=".22" fill="#cda24a" fill-opacity=".7"/><circle cx="5" cy="0" r=".22" fill="#cda24a" fill-opacity=".7"/><circle cx="0" cy="5" r=".22" fill="#cda24a" fill-opacity=".7"/><circle cx="5" cy="5" r=".22" fill="#cda24a" fill-opacity=".7"/></pattern>'
  + '<linearGradient id="hofStaal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fbfdff"/><stop offset=".5" stop-color="#c3cfdf"/><stop offset="1" stop-color="#8393ad"/></linearGradient>'
  + '<linearGradient id="hofGlans" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
  + '<linearGradient id="hofSchaduw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>'
  + `<pattern id="hofGolf" width="10" height="10" patternUnits="userSpaceOnUse">${golven(10, '#cda24a', 0.3)}</pattern>`
  + HOVEN.map((h, s) => lineair(`hofRobe${s}`, ...h.robe) + lineair(`hofDonker${s}`, ...h.donker) + lineair(`hofTint${s}`, ...h.tint)).join('')
  + `<pattern id="hofPat0" width="8" height="8" patternUnits="userSpaceOnUse">${golven(8, '#f0d98a', 0.6)}</pattern>`
  + `<pattern id="hofPat1" width="9" height="9" patternUnits="userSpaceOnUse">${minibloem(2.25, 2.25, 1.5, '#ffd9e2')}${minibloem(6.75, 6.75, 1.5, '#ffd9e2')}</pattern>`
  + '<pattern id="hofPat2" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 3.5L3.5 0 7 3.5 3.5 7Z" fill="none" stroke="#fff3bd" stroke-opacity=".75" stroke-width=".4"/><circle cx="3.5" cy="3.5" r=".6" fill="#fff3bd" fill-opacity=".8"/></pattern>'
  + '<pattern id="hofPat3" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M1.5 7.5Q2.8 4.2 6.8 2Q6.4 6 1.5 7.5Z" fill="#d9f3e4" fill-opacity=".6"/><path d="M7.4 8.6Q6.6 6.6 8.6 4.6Q9 7 7.4 8.6Z" fill="#d9f3e4" fill-opacity=".45"/></pattern>'
  + '</defs>';

// Een symmetrisch vlak rond de as x = 30: de linkerhelft loopt van boven (op de as) naar beneden (op de as) en wordt dan gespiegeld teruggetrokken.
// segs: ['L', x, y] | ['Q', cx, cy, x, y] | ['C', x1, y1, x2, y2, x, y]
function symVlak(x0, y0, ...segs) {
  const sp = (x) => f(60 - x);
  const punten = [[x0, y0]];
  let d = `M${x0} ${y0}`;
  for (const s of segs) { d += s[0] + s.slice(1).join(' '); punten.push([s[s.length - 2], s[s.length - 1]]); }
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i], [ax, ay] = punten[i];
    d += s[0] === 'L' ? `L${sp(ax)} ${ay}` : s[0] === 'Q' ? `Q${sp(s[1])} ${s[2]} ${sp(ax)} ${ay}` : `C${sp(s[3])} ${s[4]} ${sp(s[1])} ${s[2]} ${sp(ax)} ${ay}`;
  }
  return d + 'Z';
}
const spiegel = (inh) => `<g transform="translate(60 0) scale(-1 1)">${inh}</g>`;
const twee = (inh) => inh + spiegel(inh);

const INKT = '#34201a', GOUD = 'url(#mjGoudB)', LAK = 'url(#mjLak)', HUID = 'url(#hofHuid)', HAAR = 'url(#hofHaar)';
const parel = (x, y, r = 0.55) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#hofParel)" stroke="#b79a5a" stroke-width=".15"/>`;
const blad = (x, y, hoek, lang, breed, kleur) => `<ellipse cx="${x}" cy="${y}" rx="${breed}" ry="${lang}" fill="${kleur}" transform="rotate(${hoek} ${x} ${y})"/>`;

const NIS = 'M10 67.2V36.8A20 20 0 0 1 50 36.8V67.2Z';
const ROK = symVlak(30, 46.2, ['C', 28, 44.8, 25.6, 44.4, 23.2, 45], ['L', 13.4, 47.6], ['C', 11.2, 48.4, 10, 49.6, 10, 52], ['L', 10, 67.2], ['L', 30, 67.2]);
const HALS = symVlak(30, 39, ['L', 27.6, 39], ['L', 27.3, 44.6], ['Q', 28.6, 46.6, 30, 46.6]);
const GEZICHT = symVlak(30, 26.2, ['C', 26, 26.2, 24.2, 29.2, 24.3, 33.2], ['C', 24.4, 37.2, 26.6, 40.4, 30, 41.4]);

// ----- Gemeenschappelijke lagen -----
const funkel = (x, y, r, kleur = '#f0c64a') => `<path d="M${x} ${f(y - r)}Q${x} ${y} ${f(x + r)} ${y}Q${x} ${y} ${x} ${f(y + r)}Q${x} ${y} ${f(x - r)} ${y}Q${x} ${y} ${x} ${f(y - r)}Z" fill="${kleur}" stroke="none"/>`;

// Wat er achter het hoofd gebeurt, per kleur: harten bloesemblaadjes, ruiten een zon met stralen, schoppen maan en sterren, klaver bamboe
function decor(s, r = 12) {
  if (s === 1) {
    return [[14.2, 29, -35, 0.2], [45.8, 31, 30, 0.18], [16.8, 42.5, 60, 0.16], [44.4, 43.5, -50, 0.2], [18.6, 22.6, 15, 0.15], [41.8, 22.4, -25, 0.16]]
      .map(([x, y, r, k]) => `<path transform="translate(${x} ${y}) rotate(${r}) scale(${k})" d="${PETAAL}" fill="url(#mjPetaal)" stroke="#c4456b" stroke-width="${f(0.25 / k)}" stroke-linejoin="round" opacity=".92"/>`).join('');
  }
  if (s === 2) {
    const stralen = Array.from({ length: 16 }, (_, i) => {
      const a = i * 22.5, [x1, y1] = polair(30, 33.4, 13, a - 4.2), [x2, y2] = polair(30, 33.4, 13, a + 4.2), [x3, y3] = polair(30, 33.4, i % 2 ? 19 : 24, a);
      return `M${f(x1)} ${f(y1)}L${f(x3)} ${f(y3)}L${f(x2)} ${f(y2)}Z`;
    }).join('');
    return `<path d="${stralen}" fill="#f6cf5c" fill-opacity=".6" stroke="none"/>` + funkel(15, 25, 1.7) + funkel(46, 28, 1.3) + funkel(13.4, 40, 1.3) + funkel(45.4, 41, 1.8) + funkel(40, 20, 1.1);
  }
  if (s === 0) {
    const maan = '<path d="M46.65 24.14A4.8 4.8 0 1 0 43.25 31.78A4.2 4.2 0 1 1 46.65 24.14Z" fill="url(#mjGoudB)" stroke="#a97312" stroke-width=".2"/>';
    const klein = `<g transform="translate(9 4.5) scale(.78)">${maan}</g>`;
    return (r === 13 ? `<g transform="translate(60 0) scale(-1 1)">${klein}</g>` : klein)
      + funkel(15.6, 24.4, 1.7, '#e9c766') + funkel(12.6, 38.4, 1.2, '#e9c766') + funkel(46.4, 41.6, 1.5, '#e9c766') + funkel(36.4, 19.4, 1.1, '#e9c766') + funkel(17.6, 46, 1, '#e9c766');
  }
  const stengel = (x) => `<rect x="${f(x - 0.8)}" y="27" width="1.6" height="41" fill="url(#mjGroen)" stroke="#0e4a2c" stroke-width=".15"/>`
    + [33, 42, 51, 60].map((y) => `<path d="M${f(x - 0.85)} ${y}h1.7" stroke="#e8f6df" stroke-width=".5"/>`).join('')
    + [blad(x + (x < 30 ? 2.4 : -2.4), 30.6, x < 30 ? 62 : -62, 2.6, 0.8, '#3aa56d'), blad(x + (x < 30 ? 2.6 : -2.6), 36.6, x < 30 ? 58 : -58, 2.4, 0.75, '#2f9760'), blad(x + (x < 30 ? 2.2 : -2.2), 45.6, x < 30 ? 64 : -64, 2.3, 0.7, '#3aa56d')].join('').replace(/<ellipse /g, '<ellipse stroke-width=".15" ');
  return stengel(12.4) + stengel(47.6) + [blad(19, 26.4, 40, 2.1, 0.7, '#5ec08c'), blad(42, 25.4, -35, 2.1, 0.7, '#5ec08c'), blad(18, 47.4, -30, 1.9, 0.65, '#5ec08c'), blad(43.4, 48.6, 28, 1.9, 0.65, '#5ec08c')].join('').replace(/<ellipse /g, '<ellipse stroke-width=".15" ');
}
function achtergrond(s, r) {
  return `<path d="${NIS}" fill="url(#hofTint${s})"/><path d="${NIS}" fill="url(#hofGolf)"/>${s === 2 ? decor(s) : ''}`
    + `<circle cx="30" cy="33.4" r="13.4" fill="url(#hofSchijf)" stroke="#cda24a" stroke-width=".55"/><circle cx="30" cy="33.4" r="12.3" fill="none" stroke="#cda24a" stroke-width=".25" stroke-dasharray=".7 .9"/>`
    + (s === 2 ? '' : decor(s, r));
}
function lijf(s) {
  const vouwen = twee('<path d="M14 52C16.4 57 15.8 62 13.2 67M20.6 50.6C22.4 56 22 61 20.4 66" fill="none" stroke="#000" stroke-opacity=".16" stroke-width=".5"/><path d="M15 52.4C17.4 57 16.8 62 14.4 67M21.6 51C23.4 56 23 61 21.4 66" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width=".4"/>');
  return `<path d="${ROK}" fill="url(#hofRobe${s})"/><path d="${ROK}" fill="url(#hofPat${s})"/>${vouwen}<path d="${ROK}" fill="url(#hofSchaduw)"/>`
    + `<ellipse cx="17.4" cy="51.6" rx="8.4" ry="3.1" transform="rotate(-14 17.4 51.6)" fill="url(#hofSchijn)" stroke="none"/><ellipse cx="42.6" cy="51.6" rx="8.4" ry="3.1" transform="rotate(14 42.6 51.6)" fill="url(#hofSchijn)" stroke="none"/>`;
}
// Een mouw onderin: een manchet met een gouden rand en daaronder de wijde mouw; cx is het midden
const ermel = (cx, s, licht, y = 61.8) => {
  const l = f(cx - 3.7), r = f(cx + 3.7), mouw = `M${l} ${f(y + 2.4)}Q${cx} ${f(y + 3.6)} ${r} ${f(y + 2.4)}L${f(cx + 6.6)} 67.4H${f(cx - 6.6)}Z`;
  return `<path d="${mouw}" fill="url(#hofDonker${s})"/><path d="${mouw}" fill="url(#hofPat${s})" opacity=".5"/>`
    + `<path d="M${l} ${y}Q${cx} ${f(y + 1.2)} ${r} ${y}L${f(cx + 3.9)} ${f(y + 2.6)}Q${cx} ${f(y + 3.8)} ${f(cx - 3.9)} ${f(y + 2.6)}Z" fill="url(#mjGoudB)" stroke="#8a5a10" stroke-width=".3"/><path d="M${l} ${f(y + 0.9)}Q${cx} ${f(y + 2.1)} ${r} ${f(y + 0.9)}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".25"/>`;
};
// Een vuist om een stok of een steel; x en y zijn het midden
const vuist = (x, y) => `<g transform="translate(${x} ${y}) scale(.86)"><path d="M-1.9 -1.5C-1.9 -2.4-1-2.9 0-2.9 1-2.9 1.9-2.4 1.9-1.5L2 1C2 2.2 1 3 0 3-1 3-2 2.2-2 1Z" fill="${HUID}"/><path d="M-1.9 -.5H1.9M-1.9 .9H1.9" stroke="#c4967a" stroke-width=".2" fill="none"/><ellipse cx=".2" cy="-2.7" rx="1.1" ry=".75" fill="${HUID}"/></g>`;
const hals = () => `<path d="${HALS}" fill="url(#hofHals)"/>`;
const gezicht = () => `<path d="${GEZICHT}" fill="${HUID}"/><path d="${GEZICHT}" fill="url(#hofKaak)" stroke="none"/>`;
const oog = '<path d="M25.2 33.8Q26.9 32.5 28.6 33.8Q26.9 34.9 25.2 33.8Z" fill="#fffdf8" stroke="#3a2418" stroke-width=".15"/><circle cx="26.9" cy="33.75" r=".82" fill="#2b1a14" stroke="none"/><circle cx="27.2" cy="33.45" r=".28" fill="#fff" stroke="none"/><path d="M24.9 33.9Q26.9 31.9 28.9 33.8" fill="none" stroke="#1d120e" stroke-width=".42" stroke-linecap="round"/>';
const blos = '<ellipse cx="26" cy="36.8" rx="1.9" ry="1.05" fill="#f28d86" opacity=".32" stroke="none"/>';
const neus = '<path d="M30 34.8Q29.5 36.3 30.4 36.9" fill="none" stroke="#c4967a" stroke-width=".28" stroke-linecap="round"/>';
const brauw = (d) => `<path d="${d}" fill="#2a1a14" stroke="none"/>`;
const BROW = {
  vrouw: 'M29.1 31.1Q27.4 29.5 24.9 31.2Q27.2 30.4 29.1 31.1Z',
  heer: 'M29.2 31Q26.8 29.2 24.3 30.9Q26.8 31.2 29.2 31.9Z',
  boer: 'M29.1 31.1Q27 29.7 24.7 31.1Q27 30.6 29.1 31.5Z',
};
const haarGlans = (d, k = 0.3) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${k}" stroke-width=".6" stroke-linecap="round"/>`;

// ----- De heer -----
function heer(s, h) {
  const kroonSpits = symVlak(30, 17.2, ['C', 29.2, 19, 27.6, 20.6, 27.4, 24.8], ['L', 30, 24.8]);
  const kroonBand = symVlak(30, 24.6, ['L', 23.9, 24.6], ['C', 23.5, 25.6, 23.4, 26.8, 23.7, 28.2], ['Q', 27, 27.2, 30, 27.2]);
  const kroonZij = twee('<path d="M24.8 25.2C23.6 22.8 24.2 20.8 25.8 19.2 26.8 20.8 27.4 22.8 27 25.2Z" fill="url(#mjGoudB)"/>');
  const snor = twee('<path d="M30 37.3C28.6 36.7 27.1 37 26.3 38.3 25.7 39.3 25.4 40.8 25.6 42.6 26.1 41.3 26.9 40.3 27.9 39.7 28.7 39.3 29.5 39.1 30 39.2Z" fill="url(#hofHaar)" stroke-width=".18"/>');
  const baard = symVlak(30, 40.6, ['C', 28.8, 40.6, 27.7, 41.2, 27.5, 42.6], ['C', 27.3, 44.4, 28.5, 46.4, 30, 47.6]);
  const baardLijnen = '<path d="M30 41.4V46.8M28.6 42.2Q28.5 44.6 29.4 46.2M31.4 42.2Q31.5 44.6 30.6 46.2" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width=".3" stroke-linecap="round"/>';
  const wolkenkraag = symVlak(30, 45.4, ['C', 27.6, 44.4, 25.4, 44.2, 23.6, 44.6], ['L', 17, 46.4], ['C', 13, 47.8, 11.4, 51.6, 13.4, 54.6], ['C', 15.2, 57.4, 19.8, 57, 21.6, 53.8], ['C', 22, 58.8, 25.6, 62.2, 30, 63]);
  const kraagSchaduw = `<path d="${wolkenkraag}" transform="translate(0 .9)" fill="#000" fill-opacity=".25" stroke="none"/>`;
  const kraag = `<path d="${wolkenkraag}" fill="${h.licht}" stroke="#cda24a" stroke-width=".7"/><path d="${wolkenkraag}" fill="url(#hofPatK)" stroke="none" opacity=".75"/>`
    + `<path d="${wolkenkraag}" transform="translate(30 53.6) scale(.9) translate(-30 -53.6)" fill="none" stroke="#cda24a" stroke-width=".3"/>`
    + twee(parel(17.6, 56.4, 0.7)) + parel(30, 62.4, 0.8);
  const wolkjes = twee('<path d="M15.4 51.4c1.2-1.9 3.9-1 3.5 1-.4 1.5-2.5 1.3-2.4-.1M23.4 56.4c.4-1.4 2.2-1.6 2.6-.4.3 1-.8 1.8-1.6 1.2" fill="none" stroke="#b9852a" stroke-width=".4" stroke-linecap="round"/>');
  const gordel = `<path d="M10 63.4Q30 66.6 50 63.4V67.2H10Z" fill="url(#hofDonker${s})"/><path d="M10 63.4Q30 66.6 50 63.4" fill="none" stroke="#cda24a" stroke-width=".6"/>`
    + [23.4, 36.6].map((x) => `<rect x="${f(x - 1.4)}" y="64.4" width="2.8" height="2.4" rx=".5" fill="url(#mjGoudB)" stroke="#8a5a10" stroke-width=".18"/>`).join('')
    + '<circle cx="30" cy="65.4" r="2.2" fill="url(#hofJade)" stroke="#cda24a" stroke-width=".5"/><circle cx="30" cy="65.4" r=".7" fill="#0e4a2c" opacity=".7" stroke="none"/>';
  const medaljon = `<circle cx="30" cy="55.4" r="4.6" fill="url(#mjGoudB)" stroke="#8a5a10" stroke-width=".25"/><circle cx="30" cy="55.4" r="3.4" fill="url(#hofRobe${s})"/>${bloesemFig(30, 55.4, 2.9, true)}`;
  const zwaard = '<path d="M43.6 23.6L44.45 26.6V57.4H42.75V26.6Z" fill="url(#hofStaal)" stroke="#6f7f99" stroke-width=".2"/><path d="M43.6 27V57.2" stroke="#fff" stroke-opacity=".75" stroke-width=".3"/>'
    + '<rect x="40.2" y="57.2" width="6.8" height="1.5" rx=".7" fill="url(#mjGoudB)" stroke="#8a5a10" stroke-width=".2"/><rect x="42.7" y="58.6" width="1.8" height="5.4" fill="url(#mjLak)" stroke="#7a1218" stroke-width=".2"/><circle cx="43.6" cy="64.2" r="1.1" fill="url(#mjGoudB)" stroke="#8a5a10" stroke-width=".2"/>';
  return [
    `<path d="${symVlak(30, 23, ['C', 25.8, 23, 23.6, 26, 23.8, 31], ['C', 24, 35, 24.6, 37.6, 25.6, 40], ['L', 30, 40])}" fill="${HAAR}"/>`,
    lijf(s), hals(), kraagSchaduw, kraag, wolkjes, medaljon, gordel,
    gezicht(),
    twee(oog + blos + brauw(BROW.heer)), neus,
    '<path d="M28.9 39.9Q30 40.5 31.1 39.9" fill="none" stroke="#9a4a42" stroke-width=".35" stroke-linecap="round"/>',
    `<path d="${baard}" fill="${HAAR}"/>${baardLijnen}`, snor,
    `<path d="${kroonSpits}" fill="url(#mjGoudB)"/>`, kroonZij, `<path d="${kroonBand}" fill="url(#mjGoudB)" stroke="#8a5a10" stroke-width=".25"/>`,
    '<path d="M24.6 25.5Q30 24.4 35.4 25.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".3"/>',
    twee(parel(25.8, 25.9) + parel(27.8, 26.2)), '<circle cx="30" cy="26" r="1.25" fill="url(#mjLak)" stroke="#7a1218" stroke-width=".2"/><circle cx="29.6" cy="25.6" r=".3" fill="#fff" opacity=".8" stroke="none"/>',
    twee('<path d="M23.4 28L22.7 32.6" stroke="#cda24a" stroke-width=".3"/>' + parel(22.7, 29.4, 0.5) + parel(22.6, 31, 0.5) + parel(22.6, 32.6, 0.5)),
    zwaard, ermel(16.4, s, h.licht), ermel(43.6, s, h.licht), vuist(43.6, 60.4),
  ].join('');
}

// ----- De vrouw -----
function vrouw(s, h) {
  const haarAchter = symVlak(30, 18.6, ['C', 25.4, 18.6, 22.2, 20.6, 21.8, 24], ['C', 20.2, 26.4, 20.2, 31, 20.8, 36], ['C', 21.2, 40, 21.6, 43.6, 21, 47], ['L', 30, 47]);
  const kuif = symVlak(30, 17.8, ['C', 29.3, 19.2, 28.4, 20.4, 28.2, 23], ['L', 30, 23]);
  const pony = symVlak(30, 25.4, ['C', 26, 25.4, 24, 27.4, 24.2, 31.8], ['C', 25.4, 29.6, 27.6, 28.2, 30, 28.2]);
  const lok = twee('<path d="M24.6 30C22.8 33.4 22.9 38.2 23.6 42.2 24 44.2 25 45 25.8 44.6 25.2 42.2 25 39 25.1 36.2 25.2 33.6 25.8 31.6 26.6 30Z" fill="url(#hofHaar)"/>');
  const sluier = twee('<path d="M24.4 44.6C18 45 12.6 47.6 10.8 52.4 10.2 55 10.6 58.4 12 61 14.4 57.4 16.6 54 20.2 51 22 49.4 23.6 47.4 24.4 44.6Z" fill="#fff" fill-opacity=".34" stroke="#cda24a" stroke-width=".4"/>');
  const kraag = twee(`<path d="M26.2 44.9L30 56.8" stroke="#cda24a" stroke-width="3.6" stroke-linecap="round" fill="none"/><path d="M26.2 44.9L30 56.8" stroke="${h.licht}" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M26.4 46.2L29.6 55.6" stroke="url(#hofPatK)" stroke-width="2.2" fill="none"/>`);
  const band = `<path d="M10 59.6Q30 63.2 50 59.6V63.6Q30 67.2 10 63.6Z" fill="url(#hofDonker${s})"/><path d="M10 59.6Q30 63.2 50 59.6M10 63.6Q30 67.2 50 63.6" fill="none" stroke="#cda24a" stroke-width=".5"/>`
    + '<circle cx="30" cy="63.4" r="2.6" fill="url(#hofJade)" stroke="#cda24a" stroke-width=".55"/><circle cx="30" cy="63.4" r=".8" fill="#0e4a2c" opacity=".7" stroke="none"/>';
  const waaier = '<path d="M40.4 61L40.4 66" stroke="url(#mjGoudB)" stroke-width="1.1" stroke-linecap="round"/><circle cx="40.4" cy="55.4" r="5.8" fill="#fff8e8" stroke="#cda24a" stroke-width=".8"/><circle cx="40.4" cy="55.4" r="4.7" fill="none" stroke="#cda24a" stroke-width=".25"/>'
    + `<path d="M36.6 58.6C38 56.6 40 55.4 43.6 53.2" fill="none" stroke="#6b4a2a" stroke-width=".5" stroke-linecap="round"/>${bloesemFig(41.8, 53.2, 2.6)}${bloesemFig(38.4, 57, 1.9)}`;
  const haarbloemen = [[22.2, 24.6], [37.8, 24.6]].map(([x, y]) => blad(x + (x < 30 ? -2.6 : 2.6), y + 1.2, x < 30 ? -50 : 50, 2.2, 1, '#4aa86f') + bloesemFig(x, y, 3.5, true)).join('');
  const haarspelden = twee('<path d="M21.4 28L20.7 36.2M23 27.6L22.8 33.6" stroke="#cda24a" stroke-width=".35" fill="none"/>' + parel(20.7, 37, 0.75) + parel(22.8, 34.2, 0.6));
  return [
    `<path d="${haarAchter}" fill="${HAAR}"/>`, haarGlans('M23.6 22.4Q26 19.6 30 19.2', 0.3),
    lijf(s), hals(), sluier, '<path d="M26.4 45L30 56.4 33.6 45Z" fill="#fff6e6"/>', kraag, band,
    gezicht(),
    twee(oog + blos + brauw(BROW.vrouw)), neus,
    '<path d="M28.7 38.3Q29.4 37.5 30 37.9 30.6 37.5 31.3 38.3 30 39.6 28.7 38.3Z" fill="#c8324a" stroke="none"/><circle cx="29.8" cy="38.7" r=".25" fill="#fff" opacity=".6" stroke="none"/>',
    `<path d="${pony}" fill="${HAAR}"/>`, lok, haarGlans('M23.2 33Q23.1 37 23.8 40.4', 0.25), haarGlans('M36.8 33Q36.9 37 36.2 40.4', 0.25),
    '<path d="M30 28.8L30.7 29.8 30 30.8 29.3 29.8Z" fill="#c8324a" stroke="none"/>',
    '<path d="M24.6 25.4Q30 21.8 35.4 25.4Q30 23.6 24.6 25.4Z" fill="url(#mjGoudB)" stroke="#8a5a10" stroke-width=".2"/>', [26.4, 28.2, 30, 31.8, 33.6].map((x) => parel(x, f(24.5 - (1 - Math.abs(x - 30) / 3.6) * 0.5 - 0.2), 0.5)).join(''),
    `<path d="${kuif}" fill="url(#mjGoudB)" stroke="#8a5a10" stroke-width=".22"/>`, '<circle cx="30" cy="22.6" r="1" fill="url(#mjLak)" stroke="#7a1218" stroke-width=".18"/>',
    haarbloemen, haarspelden, ermel(19.4, s, h.licht), waaier, ermel(40.4, s, h.licht), vuist(40.4, 59.6),
  ].join('');
}

// ----- De boer -----
function boer(s, h) {
  const haarAchter = symVlak(30, 24.4, ['C', 25.6, 24.4, 23.4, 27.4, 23.6, 32.4], ['C', 23.7, 35, 24, 37, 24.6, 38.4], ['L', 30, 37]);
  const pony = symVlak(30, 25.2, ['C', 26, 25.2, 23.9, 27.4, 24.1, 31.4], ['C', 25.6, 29.6, 27.6, 28.4, 30, 28.4]);
  const kraag = `<path d="M25.4 45C27 47.4 33 47.4 34.6 45L35.4 47C32.6 49.6 27.4 49.6 24.6 47Z" fill="${h.licht}" stroke="#cda24a" stroke-width=".5"/>`;
  const sjerp = '<path d="M15 48L20 46.2 50 62.6V66.6Z" fill="url(#mjLak)" stroke="#7a1218" stroke-width=".3"/><path d="M15.8 48.6L49.4 66" fill="none" stroke="#cda24a" stroke-width=".4"/>'
    + `<circle cx="36.6" cy="57" r="2.3" fill="url(#mjGoudB)" stroke="#8a5a10" stroke-width=".25"/>${bloesemFig(36.6, 57, 1.8)}`;
  const gordel = `<path d="M10 62.4Q30 65.6 50 62.4V67.2H10Z" fill="url(#hofDonker${s})"/><path d="M10 62.4Q30 65.6 50 62.4" fill="none" stroke="#cda24a" stroke-width=".6"/>`;
  const speer = '<path d="M16.4 30V67" stroke="#8a5a2a" stroke-width="1.1" stroke-linecap="round"/><path d="M16.4 24C17.9 26.8 18.1 29.4 16.4 31.6 14.7 29.4 14.9 26.8 16.4 24Z" fill="url(#hofStaal)" stroke="#6f7f99" stroke-width=".25"/>'
    + '<path d="M16.4 31.6q-2.7 2.6-2.4 6.4 1-1.6 2.4-2.1 1.4.5 2.4 2.1.3-3.8-2.4-6.4Z" fill="url(#mjLak)" stroke="#7a1218" stroke-width=".2"/><rect x="15.5" y="31" width="1.8" height=".9" fill="url(#mjGoudB)"/>';
  const linten = '<path d="M36.2 30.2C38.4 29.4 41 30.4 42.6 33.2 40.6 32.4 38.4 32.4 36.4 32.2Z" fill="url(#mjLak)" stroke="#7a1218" stroke-width=".2"/><path d="M36.3 31C38.6 31.4 40.6 33.4 41.2 36.6 39.4 35 37.8 34.2 36.4 33.6Z" fill="url(#mjLak)" stroke="#7a1218" stroke-width=".2"/>';
  return [
    `<path d="${haarAchter}" fill="${HAAR}"/>`,
    lijf(s), hals(), kraag, sjerp, gordel,
    gezicht(),
    twee(oog + blos + brauw(BROW.boer)), neus,
    '<path d="M28.6 38.2Q30 39.6 31.4 38.2" fill="none" stroke="#a8433f" stroke-width=".45" stroke-linecap="round"/>',
    `<path d="${pony}" fill="${HAAR}"/>`, haarGlans('M24.6 28.6Q24 31 24.4 33.4', 0.25), haarGlans('M35.4 28.6Q36 31 35.6 33.4', 0.25),
    linten,
    '<path d="M23.8 29.4Q30 26.6 36.2 29.4L36.4 31.6Q30 28.8 23.6 31.6Z" fill="url(#mjLak)" stroke="#7a1218" stroke-width=".25"/><circle cx="30" cy="28.6" r=".8" fill="url(#mjGoudB)" stroke="none"/>',
    `<ellipse cx="30" cy="21.4" rx="3.4" ry="3.6" fill="${HAAR}"/>${haarGlans('M28.2 19.6C29.2 18.8 30.8 18.8 32 19.8', 0.4)}<path d="M25.8 22.2H34.2" stroke="#d9a93a" stroke-width=".9" stroke-linecap="round"/><path d="M26 21.9H34" stroke="#fbe9a8" stroke-width=".25" stroke-linecap="round"/>`, parel(25.4, 22.2, 0.6), parel(34.6, 22.2, 0.6),
    '<path d="M27 24.6Q30 26 33 24.6" fill="none" stroke="#c8324a" stroke-width=".9" stroke-linecap="round"/>',
    speer, ermel(16.4, s, h.licht, 62.2), vuist(16.4, 59.8),
  ].join('');
}

// De tekening van een hofkaart (rang 11 boer, 12 vrouw, 13 heer; s = kleur 0 tot 3): de binnenkant van een svg met viewBox 0 0 60 84. k maakt het
// id van het klemvlak uniek.
export function hofSvg(k, s, r) {
  const h = HOVEN[s];
  const figuur = r === 11 ? boer(s, h) : r === 12 ? vrouw(s, h) : heer(s, h);
  return `<defs><clipPath id="hofKlem${k}"><path d="${NIS}"/></clipPath></defs>`
    + `<g clip-path="url(#hofKlem${k})" stroke="${INKT}" stroke-width=".24" stroke-linejoin="round" stroke-linecap="round">${achtergrond(s, r)}${figuur}<path d="${NIS}" fill="url(#hofRand)" stroke="none"/></g>`
    + `<path d="${NIS}" fill="none" stroke="#7a5a1c" stroke-width="1.9"/><path d="${NIS}" fill="none" stroke="url(#mjGoudB)" stroke-width="1.4"/><path d="${NIS}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".25" transform="translate(30 42) scale(.96) translate(-30 -42)"/>`;
}
