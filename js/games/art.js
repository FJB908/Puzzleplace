// Illustraties per spel: kleine, getekende plaatjes voor op de kaarten en de startschermen.
// Ze gebruiken alleen kleurvariabelen uit de stijl (klassen .ga-*), dus ze passen zich vanzelf aan
// licht, donker en hoog contrast aan.

import { KUNST } from './art-woorden.js';
import { FREQ } from './woordzoeker/frequentie.js';
import { getTaal } from '../i18n/index.js';
import { plaatjeSvg } from './mahjong/tegels.js';
import { kaartSvg } from './solitaire/kaarten.js';

const wrap = (inner, size = 11) => `<svg class="game-art" viewBox="0 0 160 120" style="font-size:${size}px" aria-hidden="true" focusable="false">${inner}</svg>`;

// Sudoku: een rooster met cijfers, één eigen cijfer en een gekozen vakje
function sudoku() {
  const rows = ['53..7....', '6..195...', '.98....6.', '8...6...3', '4..8.3..1', '7...2...6', '.6....28.', '...419..5', '....8..79'];
  const user = new Map([['0,2', '4'], ['1,1', '2'], ['2,0', '1']]);
  const S = 12;
  let lines = '', nums = '';
  for (let i = 1; i < 9; i++) if (i % 3) lines += `M${i * S} 2V106M2 ${i * S}H106`;
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const u = user.get(`${r},${c}`);
    if (ch === '.' && !u) return;
    nums += `<text class="${u ? 'ga-u' : 'ga-g'}" x="${c * S + S / 2}" y="${r * S + S / 2 + 3}" text-anchor="middle">${u || ch}</text>`;
  }));
  return wrap(`<g transform="translate(26 6)">
    <rect class="ga-board" width="108" height="108" rx="9"/>
    <rect class="ga-sel" x="${3 * S + 1}" y="${4 * S + 1}" width="${S - 2}" height="${S - 2}" rx="2"/>
    <path class="ga-thin" d="${lines}"/><path class="ga-thick" d="M36 2V106M72 2V106M2 36H106M2 72H106"/>
    <rect class="ga-frame" width="108" height="108" rx="9"/>${nums}</g>`, 8);
}

// De woorden in de illustraties zijn echte woorden uit de taal van de speler (tools/inhoud/maak.mjs kiest ze uit de puzzels van die taal)
const woorden = () => KUNST[getTaal()] || KUNST.en || KUNST.nl;
// Opvulletters die eruitzien als tekst in die taal: willekeurig maar vast per taal, naar de letterfrequentie van de taal
function opvul(taal, aantal) {
  const f = FREQ[taal] || FREQ.en, letters = Object.keys(f), totaal = letters.reduce((a, c) => a + f[c], 0);
  let zaad = [...taal].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const rnd = () => { zaad = (Math.imul(zaad, 1664525) + 1013904223) >>> 0; return zaad / 4294967296; };
  return Array.from({ length: aantal }, () => { let x = rnd() * totaal; for (const c of letters) { x -= f[c]; if (x <= 0) return c; } return letters[0]; });
}

// Woordzoeker: letters met twee markeerstiften (twee woorden en een schuin woord)
function woordzoeker() {
  const [w6, w5, w4] = woorden().wz;
  const N = 6, S = 18;
  const cel = opvul(getTaal(), N * N);
  [...w6].forEach((ch, c) => { cel[c] = ch; });                                    // rij 0
  [...w5].forEach((ch, c) => { cel[N + 1 + c] = ch; });                            // rij 1, kolom 1 tot en met 5
  [...w4].forEach((ch, i) => { cel[(2 + i) * N + 1 + i] = ch; });                  // schuin vanaf rij 2, kolom 1
  let letters = '';
  cel.forEach((ch, i) => { const r = Math.floor(i / N), c = i % N; letters += `<text class="ga-g" x="${c * S + S / 2}" y="${r * S + S / 2 + 4}" text-anchor="middle">${ch}</text>`; });
  const pill = (r, c1, c2, cls) => `<line class="ga-pill ${cls}" x1="${c1 * S + S / 2}" y1="${r * S + S / 2}" x2="${c2 * S + S / 2}" y2="${r * S + S / 2}"/>`;
  return wrap(`<g transform="translate(26 6)">
    <rect class="ga-board" width="108" height="108" rx="9"/>
    ${pill(0, 0, 5, 'p1')}${pill(1, 1, 5, 'p0')}
    <path class="ga-pill ga-diag" d="M${1 * S + S / 2} ${2 * S + S / 2}L${4 * S + S / 2} ${5 * S + S / 2}"/>
    <rect class="ga-frame" width="108" height="108" rx="9"/>${letters}</g>`);
}

// Kruiswoord: kruisende woorden (een horizontaal woord van 5 letters en twee verticale van 4 die het kruisen)
function kruiswoord() {
  const S = 18;
  const { h, v1, v2 } = woorden().kw;
  const cells = [];
  [...v1].forEach((ch, i) => cells.push([i, 2, ch, i === 0 ? 1 : 0]));
  [...h].forEach((ch, i) => { if (i !== 2) cells.push([2, i, ch, i === 0 ? 2 : i === 4 ? 3 : 0]); });
  [...v2].forEach((ch, i) => { if (i) cells.push([2 + i, 4, ch, 0]); });
  const sel = '2,3';
  let out = '';
  for (const [r, c, ch, n] of cells) {
    const empty = (r === 3 && c === 2) || (r === 4 && c === 4);
    out += `<rect class="ga-cw${r + ',' + c === sel ? ' ga-sel' : ''}" x="${c * S + 1}" y="${r * S + 1}" width="${S - 2}" height="${S - 2}" rx="3"/>`;
    if (n) out += `<text class="ga-n" font-size="5.5" x="${c * S + 3}" y="${r * S + 7.5}">${n}</text>`;
    if (!empty) out += `<text class="${r + ',' + c === sel ? 'ga-on' : 'ga-g'}" x="${c * S + S / 2}" y="${r * S + S / 2 + 5}" text-anchor="middle">${ch}</text>`;
  }
  return wrap(`<g transform="translate(26 6)">${out}</g>`);
}

// Woordtuin: een bordje met roze en blauwgroene vakjes en een woord dat net gekozen wordt
function woordtuin() {
  const rows = woorden().wt;
  const own = ['mmmm.', 'tttt.', 'm.mmm', '..ttt', '.....'];
  const pick = new Set(['2,0', '2,1', '2,2', '2,3', '2,4']);
  const S = 21;
  let out = '';
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const k = pick.has(`${r},${c}`) ? ' ga-sel' : own[r][c] === 'm' ? ' ga-mine' : own[r][c] === 't' ? ' ga-theirs' : '';
    out += `<rect class="ga-tile${k}" x="${c * S + 1.5}" y="${r * S + 1.5}" width="${S - 3}" height="${S - 3}" rx="5"/>`;
    out += `<text class="${k.includes('sel') ? 'ga-on' : 'ga-g'}" x="${c * S + S / 2}" y="${r * S + S / 2 + 4.5}" text-anchor="middle" font-weight="800">${ch}</text>`;
  }));
  return wrap(`<g transform="translate(27 7)">${out}</g>`, 10);
}

// Mahjong: drie tegels op een rij met één tegel bovenop, met echte plaatjes
function mahjong() {
  const tegel = (x, y, p) => `<g transform="translate(${x} ${y})"><rect class="ga-mj-dikte" x="4" y="4" width="40" height="52" rx="5.500"/><rect class="ga-mj-gezicht" width="40" height="52" rx="5.500"/><g transform="translate(0 0)">${plaatjeSvg(p)}</g></g>`;
  return wrap(`<g transform="translate(8 4)">${tegel(2, 50, 4)}${tegel(52, 50, 12)}${tegel(102, 50, 34)}${tegel(52, 14, 31)}</g>`);
}

// Patience: een groene mat met drie kaarten in een waaier
function solitaire() {
  const letters = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  const kaart = (k, x, y, hoek) => `<g transform="translate(${x} ${y}) rotate(${hoek}) scale(.78)"><rect class="ga-sol-kaart" width="60" height="84" rx="6"/>${kaartSvg(k, letters)}</g>`;
  return wrap(`<rect class="ga-sol-vilt" x="8" y="8" width="144" height="104" rx="16"/><rect class="ga-sol-rand" x="8" y="8" width="144" height="104" rx="16"/>${kaart(0, 32, 30, -14)}${kaart(13, 58, 24, 0)}${kaart(26, 88, 30, 14)}`);
}

const ART = { sudoku, woordzoeker, kruiswoord, woordtuin, mahjong, solitaire };

export function gameArt(id) {
  const make = ART[id];
  return make ? make() : wrap('<g transform="translate(26 6)"><rect class="ga-board" width="108" height="108" rx="9"/></g>');
}
