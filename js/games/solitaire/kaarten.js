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

// Boer, vrouw en heer: de figuur is een plaatje (zie hofplaatjes.js), met een zelfgetekende hoekmarkering eromheen. Zonder plaatje een eenvoudig kader.
function hofkaart(k, s, kl, hof) {
  const plaatje = hof?.[k];
  if (plaatje) return `<image href="${plaatje}" x="12.750" y="14.500" width="34.500" height="55.500" preserveAspectRatio="none"/>`;
  return `<rect x="12" y="17" width="36" height="50" rx="3.500" fill="none" stroke="${kl}" stroke-width="1" opacity=".6"/>`;
}

const cache = new Map();
// letters: de letter in de hoek voor aas, boer, vrouw en heer ({1: 'A', 11: 'J', 12: 'Q', 13: 'K'} of in de taal van de app)
export function kaartSvg(k, letters, hof = null) {
  const sl = `${k}|${letters[1]}${letters[11]}${letters[12]}${letters[13]}${hof ? 'h' : ''}`;
  if (cache.has(sl)) return cache.get(sl);
  const r = rang(k) + 1, s = kleur(k);
  const kl = isRood(k) ? '#c62f3b' : '#1f2937';
  const tekst = r === 1 || r > 10 ? letters[r] : String(r);
  const breed = tekst.length > 1 ? 17 : 10;
  // Een hofkaart met plaatje heeft de kleur al groot in het plaatje: dan staat in de hoek alleen de letter (groter)
  const alleenLetter = r > 10 && !!hof?.[k];
  const hoek = `<text x="${alleenLetter ? 4.500 : 4.500}" y="${alleenLetter ? 15.500 : 15}" font-size="${alleenLetter ? 17 : 15.500}" font-weight="800" fill="${kl}" font-family="Georgia, 'Times New Roman', serif">${tekst}</text>`
    + (alleenLetter ? '' : kleurSvg(s, 4.500 + breed + 1.500, 4, 11.500, `fill="${kl}"`));
  let midden = '';
  if (r === 1) midden = kleurSvg(s, 17, 30, 26, `fill="${kl}"`);
  else if (r <= 10) {
    const x0 = 12.500, y0 = 22, bx = 35, by = 44, p = r > 6 ? 11 : 12.500;
    midden = PIPS[r].map(([x, y]) => {
      const cx = x0 + x * bx, cy = y0 + y * by, omlaag = y > 0.5 || (y === 0.5 && false);
      return omlaag ? `<g transform="rotate(180 ${cx} ${cy})">${kleurSvg(s, cx - p / 2, cy - p / 2, p, `fill="${kl}"`)}</g>` : kleurSvg(s, cx - p / 2, cy - p / 2, p, `fill="${kl}"`);
    }).join('');
  } else {
    midden = hofkaart(k, s, kl, hof);
  }
  const uit = `${midden}${hoek}<g transform="rotate(180 30 42)">${hoek}</g>`;
  cache.set(sl, uit);
  return uit;
}
