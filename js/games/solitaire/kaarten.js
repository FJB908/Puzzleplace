// Solitaire: het plaatje van een speelkaart (een SVG van 60 bij 84), de kaartrug en de vier kleuren. Alles zelf getekend, in dezelfde stijl als de
// Mahjong-tegels: glanzende lak, een gouden inlegrand, kersenbloesem.
//
// Rechtsboven in het plaatje staat niets: de hoekmarkering (rang + kleur) staat linksboven, naast elkaar, zodat hij leesbaar blijft
// als de kaarten over elkaar liggen. Rood en zwart zijn ook aan de vorm te onderscheiden.

import { rang, kleur, isRood } from './engine.js';
import { bloesemFig, PLAATJE_DEFS } from '../mahjong/tegels.js';
import { hofSvg, HOF_DEFS } from './hofkaarten.js';

// De kleurverlopen en het golfpatroon van de kaartrug. Eén keer in de pagina zetten (onzichtbaar maar wel aanwezig); de kaarten verwijzen ernaar.
export const SOL_DEFS = PLAATJE_DEFS + HOF_DEFS
  + `<defs><linearGradient id="solInkt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d6c88"/><stop offset=".5" stop-color="#232d44"/><stop offset="1" stop-color="#0b101c"/></linearGradient>`
  + `<radialGradient id="solRing" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#fffdf4"/><stop offset="1" stop-color="#f3e7c6"/></radialGradient>`
  + `<linearGradient id="solRug" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3c5aa8"/><stop offset=".55" stop-color="#26397f"/><stop offset="1" stop-color="#18235a"/></linearGradient>`
  + `<pattern id="solGolf" width="12" height="12" patternUnits="userSpaceOnUse"><g fill="none" stroke="#e9c766" stroke-opacity=".5" stroke-width=".45">`
  + [[0, 0], [12, 0], [6, 6], [0, 12], [12, 12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6"/><circle cx="${x}" cy="${y}" r="4.200"/><circle cx="${x}" cy="${y}" r="2.400"/>`).join('')
  + `</g></pattern></defs>`;

const ROOD = '#c62f3b', ZWART = '#1b2333';
const GOUD = '#cda24a';

// De kleuren in een vakje van 24 bij 24: schoppen, harten, ruiten, klaver
const KLEUREN = [
  'M12 1.600C12 1.600 2 9 2 14.600a5 5 0 0 0 8.800 3.200C10.600 20 10.200 21.200 8.600 22.400h6.800C13.800 21.200 13.400 20 13.200 17.800A5 5 0 0 0 22 14.600C22 9 12 1.600 12 1.600z',
  'M12 22C5 16.200 1 12.600 1 8.200a5.600 5.600 0 0 1 11-1.500A5.600 5.600 0 0 1 23 8.200c0 4.400-4 8-11 13.800z',
  'M12 1 20.800 12 12 23 3.200 12z',
  '',                                                                                  // klaver: drie cirkels, zie KLAVER
];
// Klaver: drie cirkels op een steeltje
const KLAVER = '<circle cx="12" cy="6.400" r="4.800"/><circle cx="6.200" cy="14.200" r="4.800"/><circle cx="17.800" cy="14.200" r="4.800"/><path d="M12 11.800c0 4.200-1 7.800-3.400 10.600h6.800C13 19.600 12 16 12 11.800z"/>';
// Glans: een lichte streep (of bij de ruit een lichte helft) op de lak, alleen bij de grote kleuren
const GLANS = [
  '<path d="M6.400 15.200C5 13.800 5.200 12.200 7 10.400" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.400" stroke-linecap="round"/><path d="M12 4.600C10.600 6 9.600 7 8.800 8.200" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.200" stroke-linecap="round"/>',
  '<path d="M4.400 8.400C4.800 6.400 6.400 5.200 8.200 5.400" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.500" stroke-linecap="round"/>',
  '<path d="M12 1 3.200 12H12z" fill="#fff" fill-opacity=".2"/><path d="M12 3.400 6 10.800" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1" stroke-linecap="round"/>',
  '<path d="M8.600 4.800C9.600 3.600 11 3.200 12.200 3.600M3.400 12.800C3.800 11.400 4.800 10.600 6.200 10.400M14.400 12.200C15.200 11 16.400 10.400 17.600 10.600" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.200" stroke-linecap="round"/>',
];

// Een kleur op een plek: x, y linksboven, grootte s. Met `glans`: gelakt (verloop en een lichte streep), anders vlak (extra bevat dan de kleur).
export function kleurSvg(k, x, y, s, extra = '', glans = false) {
  const t = `translate(${x} ${y}) scale(${s / 24})`;
  const vorm = k === 3 ? `<g ${glans ? `fill="url(#solInkt)"` : extra}>${KLAVER}</g>` : `<path d="${KLEUREN[k]}" ${glans ? `fill="${k === 1 || k === 2 ? 'url(#mjLak)' : 'url(#solInkt)'}"` : extra}/>`;
  return `<g transform="${t}">${vorm}${glans ? GLANS[k] : ''}</g>`;
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

// De rand van een kaart: een dun gouden lijntje net binnen de rand, zoals de inlegrand op de tegels
const RAND = `<rect x="2.200" y="2.200" width="55.600" height="79.600" rx="4.200" fill="none" stroke="${GOUD}" stroke-width=".55" opacity=".95"/>`;

// Het aas: één grote kleur in een gouden ring met een zachte glans, tussen acht gouden knopjes
function aas(s) {
  const knopjes = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<circle cx="${(30 + 16.6 * Math.sin(a)).toFixed(2)}" cy="${(44 - 16.6 * Math.cos(a)).toFixed(2)}" r="1" fill="${GOUD}"/>`; }).join('');
  return `<circle cx="30" cy="44" r="16" fill="url(#solRing)" stroke="${GOUD}" stroke-width="1.100"/><circle cx="30" cy="44" r="13.800" fill="none" stroke="${GOUD}" stroke-width=".4" stroke-dasharray="1 1.400"/>`
    + knopjes + kleurSvg(s, 18.500, 32.500, 23, '', true);
}

const cache = new Map();
// letters: de letter in de hoek voor aas, boer, vrouw en heer ({1: 'A', 11: 'J', 12: 'Q', 13: 'K'} of in de taal van de app)
export function kaartSvg(k, letters) {
  const sl = `${k}|${letters[1]}${letters[11]}${letters[12]}${letters[13]}`;
  if (cache.has(sl)) return cache.get(sl);
  const r = rang(k) + 1, s = kleur(k);
  const kl = isRood(k) ? ROOD : ZWART;
  const tekst = r === 1 || r > 10 ? letters[r] : String(r);
  const breed = tekst.length > 1 ? 17 : 10;
  const hoek = `<text x="4.500" y="15" font-size="15.500" font-weight="800" fill="${kl}" font-family="Georgia, 'Times New Roman', serif">${tekst}</text>` + kleurSvg(s, 4.500 + breed + 1.500, 4, 11.500, `fill="${kl}"`);
  let midden = '';
  if (r === 1) midden = aas(s);
  else if (r <= 10) {
    const xs = [21, 30, 39], y0 = 23, by = 38, p = r <= 3 ? 16 : r <= 6 ? 14 : r === 10 ? 11 : 12;
    midden = PIPS[r].map(([x, y]) => {
      const cx = xs[x === L ? 0 : x === R ? 2 : 1], cy = y0 + y * by, omlaag = y > 0.5;
      const kleurPlaatje = kleurSvg(s, cx - p / 2, cy - p / 2, p, '', true);
      return omlaag ? `<g transform="rotate(180 ${cx} ${cy})">${kleurPlaatje}</g>` : kleurPlaatje;
    }).join('');
  } else {
    midden = hofSvg(k, s, r);
  }
  const uit = `${RAND}${midden}${hoek}<g transform="rotate(180 30 42)">${hoek}</g>`;
  cache.set(sl, uit);
  return uit;
}

// De rug: diep blauw met een golfpatroon in goud, een crème en gouden rand en een kersenbloesem in een gouden ring in het midden
export function rugSvg() {
  return `<svg viewBox="0 0 60 84" focusable="false"><rect width="60" height="84" fill="url(#solRug)"/><rect width="60" height="84" fill="url(#solGolf)"/>`
    + `<rect x="2.600" y="2.600" width="54.800" height="78.800" rx="3.600" fill="none" stroke="#f7f0dc" stroke-width="1.300"/><rect x="5" y="5" width="50" height="74" rx="2.400" fill="none" stroke="${GOUD}" stroke-width=".7"/>`
    + `<circle cx="30" cy="42" r="14.500" fill="#1d2b6c" stroke="${GOUD}" stroke-width="1.200"/><circle cx="30" cy="42" r="12.600" fill="url(#solRing)"/>`
    + bloesemFig(30, 42, 11.200, true)
    + [[30, 24.500], [30, 59.500], [12.500, 42], [47.500, 42]].map(([x, y]) => `<path d="M${x} ${y - 2.200}L${x + 1.500} ${y}L${x} ${y + 2.200}L${x - 1.500} ${y}Z" fill="${GOUD}"/>`).join('')
    + [[9.500, 9.500], [50.500, 9.500], [9.500, 74.500], [50.500, 74.500]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.300" fill="${GOUD}"/>`).join('')
    + `</svg>`;
}
