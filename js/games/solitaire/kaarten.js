// Patience: het plaatje van een speelkaart (een SVG van 60 bij 84) en de vier kleuren. Alles zelf getekend.
//
// Rechtsboven in het plaatje staat niets: de hoekmarkering (rang + kleur) staat linksboven, naast elkaar, zodat hij leesbaar blijft
// als de kaarten over elkaar liggen. Rood en zwart zijn ook aan de vorm te onderscheiden.

import { rang, kleur, isRood } from './engine.js';

// De kleuren in een vakje van 24 bij 24: schoppen, harten, ruiten, klaver
const KLEUREN = [
  'M12 1.600C12 1.600 2 9 2 14.600a5 5 0 0 0 8.800 3.200C10.600 20 10.200 21.200 8.600 22.400h6.800C13.800 21.200 13.400 20 13.200 17.800A5 5 0 0 0 22 14.600C22 9 12 1.600 12 1.600z',
  'M12 22C5 16.200 1 12.600 1 8.200a5.600 5.600 0 0 1 11-1.500A5.600 5.600 0 0 1 23 8.200c0 4.400-4 8-11 13.800z',
  'M12 1 20.800 12 12 23 3.200 12z',
  '',                                                                                  // klaver: drie cirkels, zie KLAVER
];
// Klaver: drie cirkels op een steeltje
const KLAVER = '<circle cx="12" cy="6.400" r="4.800"/><circle cx="6.200" cy="14.200" r="4.800"/><circle cx="17.800" cy="14.200" r="4.800"/><path d="M12 11.800c0 4.200-1 7.800-3.400 10.600h6.800C13 19.600 12 16 12 11.800z"/>';

// Een kleur op een plek: x, y linksboven, grootte s
export function kleurSvg(k, x, y, s, extra = '') {
  const t = `translate(${x} ${y}) scale(${s / 24})`;
  return k === 3 ? `<g transform="${t}" ${extra}>${KLAVER}</g>` : `<path transform="${t}" d="${KLEUREN[k]}" ${extra}/>`;
}
export const kleurIcoon = (k, grootte = 24) => `<svg viewBox="0 0 24 24" width="${grootte}" height="${grootte}" aria-hidden="true" focusable="false">${kleurSvg(k, 0, 0, 24, 'fill="currentColor"')}</svg>`;

// Waar de plaatjes (pips) liggen op een kaart van 2 tot 10: x en y als deel van het veld
const L = 0.27, M = 0.5, R = 0.73;
const PIPS = {
  1: [[M, 0.5]],
  2: [[M, 0], [M, 1]],
  3: [[M, 0], [M, 0.5], [M, 1]],
  4: [[L, 0], [R, 0], [L, 1], [R, 1]],
  5: [[L, 0], [R, 0], [M, 0.5], [L, 1], [R, 1]],
  6: [[L, 0], [R, 0], [L, 0.5], [R, 0.5], [L, 1], [R, 1]],
  7: [[L, 0], [R, 0], [M, 0.25], [L, 0.5], [R, 0.5], [L, 1], [R, 1]],
  8: [[L, 0], [R, 0], [M, 0.25], [L, 0.5], [R, 0.5], [M, 0.75], [L, 1], [R, 1]],
  9: [[L, 0], [R, 0], [L, 0.333], [R, 0.333], [M, 0.5], [L, 0.667], [R, 0.667], [L, 1], [R, 1]],
  10: [[L, 0], [R, 0], [M, 0.167], [L, 0.333], [R, 0.333], [L, 0.667], [R, 0.667], [M, 0.833], [L, 1], [R, 1]],
};

// Boer, vrouw en heer: een kader met twee gespiegelde halve figuren (zoals op een echte kaart): kroon of muts, gezicht, mantel met boord,
// en de kleur als embleem. Een halve figuur is 32 breed en 19 hoog (bovenste helft van het kader op x 14, y 23), de onderste is een draaiing.
const GOUD = '#e3b948', GOUD_DONKER = '#a97c1f', HUID = '#f6dcc0', INKT = '#2b2320';
function halveFiguur(r, s, kl) {
  const rood = isRood(s * 13), mantel = rood ? '#c62f3b' : '#2c3d7c', boord = GOUD, haar = r === 12 ? '#9aa3ad' : '#8a5a2b';
  let f = `<path d="M2.500 19 5.500 13.500Q16 10.600 26.500 13.500L29.500 19Z" fill="${mantel}" stroke="${GOUD_DONKER}" stroke-width=".5"/>`
    + `<path d="M5.500 13.500Q16 10.600 26.500 13.500M16 11.600V19" fill="none" stroke="${boord}" stroke-width=".9"/>`
    + `<path d="M7 17.600H11M21 17.600H25" stroke="${boord}" stroke-width=".7"/>`;
  if (r === 13) f += `<path d="M12.500 9.200Q12.400 13.800 16 14.600Q19.600 13.800 19.500 9.200Q16 12.600 12.500 9.200Z" fill="${haar}" stroke="${INKT}" stroke-width=".25"/>`;     // baard
  if (r === 12) f += `<path d="M12 6.600Q10.600 12.800 12.600 14.400L13.400 9.200ZM20 6.600Q21.400 12.800 19.400 14.400L18.600 9.200Z" fill="${haar}" stroke="${INKT}" stroke-width=".25"/>`; // lang haar
  f += `<ellipse cx="16" cy="8.600" rx="3.500" ry="3.900" fill="${HUID}" stroke="${INKT}" stroke-width=".3"/>`
    + `<circle cx="14.600" cy="8.200" r=".5" fill="${INKT}"/><circle cx="17.400" cy="8.200" r=".5" fill="${INKT}"/>`
    + `<path d="M15 10.300Q16 11 17 10.300" fill="none" stroke="#b5483f" stroke-width=".5" stroke-linecap="round"/>`;
  if (r === 13) f += `<path d="M11.600 5.600 11.800 1.800 13.800 3.600 16 .6 18.200 3.600 20.200 1.800 20.400 5.600Z" fill="${GOUD}" stroke="${GOUD_DONKER}" stroke-width=".5"/>`
    + `<circle cx="16" cy="2.800" r=".7" fill="${mantel}"/><path d="M11.600 5.600H20.400" stroke="${GOUD_DONKER}" stroke-width=".5"/>`;
  if (r === 12) f += `<path d="M12.200 5.800 12.600 3 14.400 4.400 16 1.600 17.600 4.400 19.400 3 19.800 5.800Z" fill="${GOUD}" stroke="${GOUD_DONKER}" stroke-width=".5"/>`
    + `<circle cx="16" cy="3.600" r=".6" fill="${mantel}"/><circle cx="13.800" cy="5" r=".4" fill="${mantel}"/><circle cx="18.200" cy="5" r=".4" fill="${mantel}"/>`;
  if (r === 11) f += `<path d="M11.800 6.400Q12 1.600 16 1.600T20.200 6.400Q16 4.400 11.800 6.400Z" fill="${mantel}" stroke="${GOUD_DONKER}" stroke-width=".4"/>`
    + `<path d="M19 3Q24.600 .2 27.400 4.600Q22.400 3.400 19.800 5.200Z" fill="#f4efe0" stroke="${GOUD_DONKER}" stroke-width=".35"/><path d="M19.600 4Q23 2.600 26 4.200" fill="none" stroke="${GOUD}" stroke-width=".4"/>`
    + `<path d="M12.200 6.800Q11.400 9.600 12.600 10.400L13 7.600ZM19.800 6.800Q20.600 9.600 19.400 10.400L19 7.600Z" fill="${haar}"/>`;
  return f;
}
function hofkaart(r, s, kl) {
  const half = halveFiguur(r, s, kl);
  const embleem = (x, y, g) => kleurSvg(s, x, y, g, `fill="${kl}"`);
  const boven = `<g transform="translate(10.800 19) scale(1.200)">${half}</g>`;
  return `<rect x="9" y="19" width="42" height="46" rx="4" fill="#fffaf0" stroke="${kl}" stroke-width="1.100"/>`
    + `<rect x="10.600" y="20.600" width="38.800" height="42.800" rx="2.800" fill="none" stroke="${GOUD_DONKER}" stroke-width=".4" opacity=".75"/>`
    + `<path d="M9 42H51" stroke="${kl}" stroke-width=".45" opacity=".4"/>`
    + boven + `<g transform="rotate(180 30 42)">${boven}</g>`
    + embleem(11.200, 21.200, 7) + `<g transform="rotate(180 30 42)">${embleem(11.200, 21.200, 7)}</g>`;
}

const cache = new Map();
// letters: de letter in de hoek voor aas, boer, vrouw en heer ({1: 'A', 11: 'J', 12: 'Q', 13: 'K'} of in de taal van de app)
export function kaartSvg(k, letters) {
  const sl = `${k}|${letters[1]}${letters[11]}${letters[12]}${letters[13]}`;
  if (cache.has(sl)) return cache.get(sl);
  const r = rang(k) + 1, s = kleur(k);
  const kl = isRood(k) ? '#c62f3b' : '#1f2937';
  const tekst = r === 1 || r > 10 ? letters[r] : String(r);
  const breed = tekst.length > 1 ? 17 : 10;
  const hoek = `<text x="4.500" y="15" font-size="15.500" font-weight="800" fill="${kl}" font-family="Georgia, 'Times New Roman', serif">${tekst}</text>${kleurSvg(s, 4.500 + breed + 1.500, 4, 11.500, `fill="${kl}"`)}`;
  let midden = '';
  if (r === 1) midden = kleurSvg(s, 17, 30, 26, `fill="${kl}"`);
  else if (r <= 10) {
    const x0 = 12.500, y0 = 22, bx = 35, by = 44, p = r > 6 ? 11 : 12.500;
    midden = PIPS[r].map(([x, y]) => {
      const cx = x0 + x * bx, cy = y0 + y * by, omlaag = y > 0.5 || (y === 0.5 && false);
      return omlaag ? `<g transform="rotate(180 ${cx} ${cy})">${kleurSvg(s, cx - p / 2, cy - p / 2, p, `fill="${kl}"`)}</g>` : kleurSvg(s, cx - p / 2, cy - p / 2, p, `fill="${kl}"`);
    }).join('');
  } else {
    midden = hofkaart(r, s, kl);
  }
  const uit = `${hoek}<g transform="rotate(180 30 42)">${hoek}</g>${midden}`;
  cache.set(sl, uit);
  return uit;
}
