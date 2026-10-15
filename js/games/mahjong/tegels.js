// De plaatjes op de tegels, zelf getekend (viewBox 0 0 40 52). De soorten zijn te onderscheiden op vorm, niet alleen op kleur:
//   0-8 bloesems 1-9, 9-17 bamboe 1-9, 18-26 lantaarns 1-9, 27-30 winden (kompasroos met een gekleurde punt N, O, Z, W), 31-33 draken (koi, blad, kader),
//   34-37 bloemen (pruimentak, pioen, chrysant, orchidee), 38-41 seizoenen (spruit, zon, herfstblad, sneeuwvlok)

// De kleuren zijn glazuur en lak: verlopen in plaats van vlakke kleuren (zie PLAATJE_DEFS). Ze verlopen van boven (licht) naar onder (diep), per tegel.
const INK = 'url(#mjInkt)', BLAUW = 'url(#mjBlauw)', GROEN = 'url(#mjGroen)', ROOD = 'url(#mjRood)', GOUD = 'url(#mjGoud)', ROZE = 'url(#mjRoze)', PAARS = 'url(#mjPaars)', IVOOR = '#fbf7ec';
const VERLOPEN = [
  ['mjRood', '#f0705c', '#a31d24'], ['mjBlauw', '#5b92d9', '#1c4789'], ['mjGroen', '#4cb784', '#12633d'], ['mjInkt', '#46556d', '#121a29'],
  ['mjRoze', '#fbb3c8', '#d4547d'], ['mjPaars', '#bd94e2', '#65399a'],
];
// Eén keer in de pagina zetten (onzichtbaar maar wel aanwezig); alle tegels verwijzen ernaar
export const PLAATJE_DEFS = `<defs>${VERLOPEN.map(([id, a, b]) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="50"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('')}`
  + `<linearGradient id="mjGoud" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="50"><stop offset="0" stop-color="#fbe9a8"/><stop offset=".45" stop-color="#d9a93a"/><stop offset="1" stop-color="#a97312"/></linearGradient>`
  + `<radialGradient id="mjPetaal" cx=".5" cy=".85" r="1"><stop offset="0" stop-color="#d4547d"/><stop offset=".5" stop-color="#f4a0ba"/><stop offset="1" stop-color="#fff1f5"/></radialGradient>`
  + `<linearGradient id="mjLak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4705a"/><stop offset=".55" stop-color="#cf2f2c"/><stop offset="1" stop-color="#8f1420"/></linearGradient>`
  + `<linearGradient id="mjGoudB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe9a8"/><stop offset=".5" stop-color="#d9a93a"/><stop offset="1" stop-color="#a97312"/></linearGradient>`
  + `<radialGradient id="mjPioen" cx=".5" cy=".9" r="1"><stop offset="0" stop-color="#b3205a"/><stop offset=".6" stop-color="#e5588f"/><stop offset="1" stop-color="#fbb4cc"/></radialGradient></defs>`;
const f = (n) => Number(n.toFixed(2));
const cirkel = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
const polair = (cx, cy, r, hoek) => [cx + r * Math.sin(hoek * Math.PI / 180), cy - r * Math.cos(hoek * Math.PI / 180)];

// ----- Bloesems (1 tot 9): kersenbloesems, zoals stippen maar dan een tuin -----
const STIP = {
  1: [[20, 26, 12.5]],
  2: [[20, 15, 8], [20, 37, 8]],
  3: [[11, 12, 6.5], [20, 26, 6.5], [29, 40, 6.5]],
  4: [[12, 16, 7.5], [28, 16, 7.5], [12, 36, 7.5], [28, 36, 7.5]],
  5: [[12, 13, 6.2], [28, 13, 6.2], [20, 26, 6.2], [12, 39, 6.2], [28, 39, 6.2]],
  6: [[12, 12, 6], [28, 12, 6], [12, 26, 6], [28, 26, 6], [12, 40, 6], [28, 40, 6]],
  7: [[11, 9, 5], [20, 15, 5], [29, 21, 5], [12, 34, 5.5], [28, 34, 5.5], [12, 45, 5.5], [28, 45, 5.5]],
  8: [[12, 9, 5], [28, 9, 5], [12, 21, 5], [28, 21, 5], [12, 33, 5], [28, 33, 5], [12, 45, 5], [28, 45, 5]],
  9: [[9, 11, 5], [20, 11, 5], [31, 11, 5], [9, 26, 5], [20, 26, 5], [31, 26, 5], [9, 41, 5], [20, 41, 5], [31, 41, 5]],
};
const PETAAL = 'M0 0C-7.200-4.200-9.600-12.400-4.800-15.600-2.800-16.800-1-16 0-14.200 1-16 2.800-16.800 4.800-15.600 9.600-12.400 7.200-4.200 0 0Z';
// Eén kersenbloesem: vijf blaadjes met een inkeping, adertjes en meeldraden van goud. cx, cy en r (de straal) bepalen de plek en de grootte.
function bloesemFig(cx, cy, r, rijk = false) {
  const sc = r / 16.8, sw = f(0.5 / sc);
  const blaadjes = [0, 1, 2, 3, 4].map((k) => `<path transform="rotate(${k * 72})" d="${PETAAL}" fill="url(#mjPetaal)" stroke="#c4456b" stroke-width="${sw}" stroke-linejoin="round"/>`).join('');
  const aderen = rijk || r > 8 ? [0, 1, 2, 3, 4].map((k) => `<path transform="rotate(${k * 72})" d="M0 -3.600L0 -10" stroke="#d96a8d" stroke-width="${f(0.45 / sc)}" stroke-linecap="round"/>`).join('') : '';
  const draden = r > 6 ? [0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const [x, y] = polair(0, 0, 5.8, k * 45 + 10), [x0, y0] = polair(0, 0, 1.3, k * 45 + 10); return `<path d="M${f(x0)} ${f(y0)}L${f(x)} ${f(y)}" stroke="#c98a2a" stroke-width="${f(0.5 / sc)}"/>` + cirkel(x, y, 0.95, '#d9a93a'); }).join('') : '';
  return `<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(sc)})">${blaadjes}${aderen}${cirkel(0, 0, 3.6, '#f7b6c8')}${draden}${cirkel(0, 0, r > 6 ? 1.4 : 2.2, r > 6 ? '#b8325f' : '#d9a93a')}</g>`;
}
function bloesems(n) {
  if (n === 1) {                                  // één grote bloesem in een gouden ring, met drie vallende blaadjes
    const val = (x, y, hoek, k) => `<path transform="translate(${x} ${y}) rotate(${hoek}) scale(${k})" d="${PETAAL}" fill="url(#mjPetaal)" stroke="#c4456b" stroke-width="1.6" opacity=".9"/>`;
    return `<circle cx="20" cy="26" r="18" fill="none" stroke="${GOUD}" stroke-width="1.5"/><circle cx="20" cy="26" r="16.4" fill="none" stroke="#c9972d" stroke-width=".4" stroke-dasharray="1.2 1.6"/>`
      + bloesemFig(20, 26, 13.4, true) + val(6.5, 10.5, -30, 0.2) + val(34, 41, 40, 0.18) + val(33.5, 11, 80, 0.16);
  }
  return STIP[n].map(([x, y, r]) => bloesemFig(x, y, r * 1.12)).join('');
}

// ----- Bamboe -----
const BAMBOE = {
  2: [[20, 14, 22, 0], [20, 38, 22, 0]],
  3: [[20, 14, 22, 0], [12, 38, 22, 0], [28, 38, 22, 0]],
  4: [[12, 14, 22, 0], [28, 14, 22, 0], [12, 38, 22, 0], [28, 38, 22, 0]],
  5: [[11, 13, 20, 0], [29, 13, 20, 0], [20, 26, 20, 1], [11, 39, 20, 0], [29, 39, 20, 0]],
  6: [[10, 14, 21, 0], [20, 14, 21, 0], [30, 14, 21, 0], [10, 38, 21, 0], [20, 38, 21, 0], [30, 38, 21, 0]],
  7: [[20, 9, 14, 1], [10, 26, 14, 0], [20, 26, 14, 0], [30, 26, 14, 0], [10, 43, 14, 0], [20, 43, 14, 0], [30, 43, 14, 0]],
  8: [[8, 14, 22, 0], [16, 14, 22, 0], [24, 14, 22, 0], [32, 14, 22, 0], [8, 38, 22, 0], [16, 38, 22, 0], [24, 38, 22, 0], [32, 38, 22, 0]],
  9: [[10, 9, 14, 0], [20, 9, 14, 1], [30, 9, 14, 0], [10, 26, 14, 1], [20, 26, 14, 0], [30, 26, 14, 1], [10, 43, 14, 0], [20, 43, 14, 1], [30, 43, 14, 0]],
};
function stok(x, y, h, rood, w = 5.2) {
  const kleur = rood ? ROOD : GROEN, licht = rood ? '#e57a70' : '#5fb784';
  const top = y - h / 2, knopen = h > 15 ? [y] : [];
  return `<rect x="${f(x - w / 2)}" y="${f(top)}" width="${w}" height="${h}" rx="${w / 2}" fill="${kleur}"/>`
    + `<rect x="${f(x - w / 2 + 0.9)}" y="${f(top + 1.4)}" width="1.1" height="${f(h - 2.8)}" rx="0.55" fill="${licht}"/>`
    + knopen.map((k) => `<path d="M${f(x - w / 2)} ${k}h${w}" stroke="#f6e7ae" stroke-width="1.1"/>`).join('')
    + (h > 15 ? `<path d="M${f(x - w / 2)} ${f(top + h * 0.28)}h${w}M${f(x - w / 2)} ${f(top + h * 0.72)}h${w}" stroke="#f6e7ae" stroke-width=".8" opacity=".95"/>` : `<path d="M${f(x - w / 2)} ${y}h${w}" stroke="${IVOOR}" stroke-width=".9"/>`);
}
function bamboe(n) {
  if (n === 1) {                                 // een jonge scheut met blaadjes
    return `<path d="M20 46 C20 36 19 28 21 14" fill="none" stroke="${GROEN}" stroke-width="4" stroke-linecap="round"/>`
      + `<path d="M21 22 C28 20 33 15 34 8 C26 8 21 14 21 22Z" fill="${GROEN}"/><path d="M20 31 C13 30 8 26 7 19 C14 19 19 24 20 31Z" fill="#3a9f68"/>`
      + `<path d="M20 38h0M17 35h6" stroke="${IVOOR}" stroke-width="1"/><circle cx="21" cy="12" r="2.2" fill="${ROOD}"/>`;
  }
  return BAMBOE[n].map(([x, y, h, r]) => stok(x, y, h, r, n <= 4 ? 7 : n <= 6 ? 6.2 : n === 8 ? 4.9 : 5.7)).join('');
}

// ----- Lantaarns (1 tot 9): rode lakken lantaarns met gouden doppen en een kwastje -----
function lantaarn(cx, cy, H) {
  const k = H / 18.6;
  return `<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(k)})">`
    + `<path d="M0 -8.200V-6.800" stroke="#d9a93a" stroke-width=".7" stroke-linecap="round"/>`
    + `<rect x="-3.200" y="-6.900" width="6.400" height="1.600" rx=".6" fill="url(#mjGoudB)"/>`
    + `<path d="M-3.200 -5.300C-7 -4.200-7 4.200-3.200 5.300H3.200C7 4.200 7 -4.200 3.200 -5.300Z" fill="url(#mjLak)" stroke="#7a1218" stroke-width=".4"/>`
    + `<path d="M-1.800 -5.300C-3.900 -2.200-3.900 2.200-1.800 5.300M1.800 -5.300C3.900 -2.200 3.900 2.200 1.800 5.300M0 -5.300V5.300" fill="none" stroke="#f6dc8e" stroke-width=".45" stroke-opacity=".9"/>`
    + `<rect x="-3.200" y="5.200" width="6.400" height="1.400" rx=".6" fill="url(#mjGoudB)"/>`
    + `<path d="M0 6.600V9" stroke="#d9a93a" stroke-width=".5"/><path d="M-1.100 8.800L0 10.600 1.100 8.800Z" fill="#d9a93a"/>`
    + `<ellipse cx="-3" cy="-2.600" rx="1" ry="2.300" fill="#fff" opacity=".42" transform="rotate(8 -3 -2.600)"/>`
    + `</g>`;
}
function lantaarns(n) {
  if (n === 1) {                                  // één grote lantaarn voor een gouden maan
    return `<circle cx="20" cy="26" r="17.5" fill="none" stroke="${GOUD}" stroke-width="1.3"/><circle cx="20" cy="26" r="15.4" fill="#fff6d6" opacity=".7"/>` + lantaarn(20, 26, 30)
      + `<path d="M7 12 l1 2.400 2.400 1 -2.400 1 -1 2.400 -1 -2.400 -2.400 -1 2.400 -1Z M33 38 l.8 1.900 1.900 .8 -1.900 .8 -.8 1.900 -.8 -1.900 -1.900 -.8 1.900 -.8Z" fill="#d9a93a"/>`;
  }
  return STIP[n].map(([x, y, r]) => lantaarn(x, y, Math.min(2 * r * 1.45, 30))).join('');
}

// ----- Winden: een kompasroos in een gouden ring; de punt van de windrichting is groot en gekleurd (noord omhoog, oost rechts, zuid omlaag, west links) -----
function wind(i) {
  const kleur = [BLAUW, ROOD, GROEN, PAARS][i];
  return `<circle cx="20" cy="26" r="17" fill="none" stroke="${GOUD}" stroke-width="2.6"/><circle cx="20" cy="26" r="14.6" fill="none" stroke="#7a5a1a" stroke-width=".4"/>`
    + `<circle cx="20" cy="26" r="13.2" fill="#fff8e4" opacity=".75"/>`
    + `<path d="M20 15L22 24 31 26 22 28 20 37 18 28 9 26 18 24Z" fill="#efe0b0" stroke="#b88a2a" stroke-width=".5" stroke-linejoin="round"/>`
    + `<path d="M25.800 20.200L22.400 23.600M14.200 20.200L17.600 23.600M25.800 31.800L22.400 28.400M14.200 31.800L17.600 28.400" stroke="#c9972d" stroke-width="1" stroke-linecap="round"/>`
    + `<g transform="rotate(${i * 90} 20 26)"><path d="M20 10.200L23.600 23.800 20 26 16.400 23.800Z" fill="${kleur}" stroke="#2a1d12" stroke-width=".7" stroke-linejoin="round"/><path d="M20 12.400L21.200 20" stroke="#fff" stroke-opacity=".6" stroke-width=".8" stroke-linecap="round"/></g>`
    + `<circle cx="20" cy="26" r="2.1" fill="${GOUD}" stroke="#7a5a1a" stroke-width=".4"/><circle cx="19.400" cy="25.300" r=".6" fill="#fff" opacity=".8"/>`;
}

// ----- Draken: een rode koi, jade en een leeg porseleinen kader -----
function draak(i) {
  if (i === 0) {                                  // rood: een rode koi, de karper die een draak wordt, met gouden rimpels in het water
    return `<g transform="rotate(10 20 26)">`
      + `<path d="M20 35C13 38.500 9.500 43 10.500 49.500 14.500 46.500 17.500 47 20 43.500 22.500 47 25.500 46.500 29.500 49.500 30.500 43 27 38.500 20 35Z" fill="#e8564a" stroke="#7a1218" stroke-width=".5" stroke-linejoin="round"/>`
      + `<path d="M20 37V43M16.500 38.500L14.500 45M23.500 38.500L25.500 45" stroke="#f9b8a8" stroke-width=".6" stroke-linecap="round"/>`
      + `<path d="M14.500 15C9 15.500 6.500 20 7.500 24.500 11 22.500 13.500 21.500 15.500 20.500Z M25.500 15C31 15.500 33.500 20 32.500 24.500 29 22.500 26.500 21.500 24.500 20.500Z" fill="#f08a78" stroke="#7a1218" stroke-width=".5" stroke-linejoin="round"/>`
      + `<path d="M20 3.500C26.500 5.500 29 13 27.500 22 26.500 29 24.500 33 22.500 38H17.500C15.500 33 13.500 29 12.500 22 11 13 13.500 5.500 20 3.500Z" fill="${ROOD}" stroke="#7a1218" stroke-width=".6" stroke-linejoin="round"/>`
      + `<path d="M15.800 19C17.500 16.500 21.500 16.500 23.500 18.500 25.500 21 24 24.500 21.500 25 18.500 25.500 15.200 22.500 15.800 19Z M18.500 28C20.500 26.500 23.500 27.500 23.800 30 24 32.500 21.500 34.500 19.500 33.500 17.800 32.500 17.500 29.200 18.500 28Z" fill="#fff6e6" opacity=".95"/>`
      + [[20, 12], [17, 16], [23, 16], [14.800, 21.500], [25.200, 21.500], [17.500, 26.500], [23, 27], [19.500, 31.500]].map(([x, y]) => `<path d="M${x - 1.500} ${y}Q${x} ${y + 2} ${x + 1.500} ${y}" fill="none" stroke="#b98826" stroke-width=".5" opacity=".75" stroke-linecap="round"/>`).join('')
      + `<path d="M13.800 12.500Q20 15.500 26.200 12.500" fill="none" stroke="#7a1218" stroke-width=".6" stroke-linecap="round"/>`
      + `<circle cx="16.400" cy="8.800" r="1.700" fill="#fff6e6" stroke="#2a1d12" stroke-width=".3"/><circle cx="23.600" cy="8.800" r="1.700" fill="#fff6e6" stroke="#2a1d12" stroke-width=".3"/><circle cx="16.200" cy="8.900" r=".95" fill="#1a1210"/><circle cx="23.800" cy="8.900" r=".95" fill="#1a1210"/>`
      + `<path d="M18.700 5.200Q20 6.200 21.300 5.200" fill="none" stroke="#7a1218" stroke-width=".5" stroke-linecap="round"/>`
      + `<ellipse cx="15" cy="27" rx="1.200" ry="5" fill="#fff" opacity=".28"/></g>`
      + `<path d="M3 44Q6 41 9 44M31 11Q34 8 37 11M33.500 46.500Q35.500 44.500 37.500 46.500" fill="none" stroke="${GOUD}" stroke-width=".9" stroke-linecap="round"/>`;
  }
  if (i === 1) {                                  // groen: twee jadebladeren en een gouden dauwdruppel
    return `<path d="M8 44C3 25 14 8 32 7C36 25 28 42 8 44Z" fill="${GROEN}" stroke="#0e4a2c" stroke-width=".6"/><path d="M9 43C16 32 23 21 31 9" fill="none" stroke="#e8f6df" stroke-width="1.6" stroke-linecap="round"/>`
      + `<path d="M17 33.500C19 28 15 27 13 29M23 25.500C26 22 22 19 20 21M13 40C16 38 12 36 10.500 38" fill="none" stroke="#e8f6df" stroke-width="1.1" stroke-linecap="round"/>`
      + `<path d="M25 46C20 36 25 24 35 20C38 31 34 43 25 46Z" fill="#3aa56d" stroke="#0e4a2c" stroke-width=".5" opacity=".95"/><path d="M26 45C28 38 31 30 34 22" fill="none" stroke="#e8f6df" stroke-width="1.1" stroke-linecap="round"/>`
      + `<path d="M31.500 10c1.500 2.200 2.300 3.200 2.300 4.600 0 1.400-1 2.400-2.300 2.400s-2.300-1-2.300-2.400c0-1.400.8-2.400 2.300-4.600Z" fill="${GOUD}" stroke="#a97312" stroke-width=".4"/>`
      + `<ellipse cx="14" cy="21" rx="1.400" ry="4.500" fill="#fff" opacity=".28" transform="rotate(-30 14 21)"/>`;
  }
  return `<rect x="7" y="7" width="26" height="38" rx="5" fill="none" stroke="${BLAUW}" stroke-width="2.800"/><rect x="11.200" y="11.200" width="17.600" height="29.600" rx="3" fill="none" stroke="${GOUD}" stroke-width="1"/>`
    + bloesemFig(11.600, 11.800, 2.8) + bloesemFig(28.400, 11.800, 2.8) + bloesemFig(11.600, 40.200, 2.8) + bloesemFig(28.400, 40.200, 2.8)
    + `<path d="M20 20L23.500 26 20 32 16.500 26Z" fill="${GOUD}" stroke="#a97312" stroke-width=".5"/><circle cx="19.200" cy="24.400" r=".7" fill="#fff" opacity=".8"/>`;
}

// ----- Bloemen en seizoenen -----
const blad = (x, y, hoek, lang, breed, kleur) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${breed}" ry="${lang}" fill="${kleur}" transform="rotate(${hoek} ${f(x)} ${f(y)})"/>`;
function bloem(i) {
  const M = [20, 25];
  if (i === 0) {                                  // pruimenbloesem: een kronkelende tak met bloemen en knoppen (anders dan de ene grote bloesem op de bloesems-1)
    const pruim = (x, y, r) => `<g transform="translate(${x} ${y})">` + [0, 1, 2, 3, 4].map((k) => { const [px, py] = polair(0, 0, r * 0.62, k * 72); return `<circle cx="${f(px)}" cy="${f(py)}" r="${f(r * 0.6)}" fill="url(#mjPetaal)" stroke="#c4456b" stroke-width=".35"/>`; }).join('')
      + cirkel(0, 0, r * 0.3, '#fff1f5') + [0, 1, 2, 3, 4].map((k) => { const [px, py] = polair(0, 0, r * 0.5, k * 72 + 36); return cirkel(px, py, r * 0.1, GOUD); }).join('') + `</g>`;
    return `<path d="M5 49C9 43 13 41 17 37C21 33 20 29 24 25C28 21 28 15 31 9" fill="none" stroke="#3b271c" stroke-width="3.200" stroke-linecap="round"/>`
      + `<path d="M5 49C9 43 13 41 17 37C21 33 20 29 24 25C28 21 28 15 31 9" fill="none" stroke="#7a5238" stroke-width=".9" stroke-linecap="round" transform="translate(-.7 -.3)"/>`
      + `<path d="M17 37C12 35 9 31 8 26M24 25C29 26 32 29 34 34M21 31C17 28 15 24 15 19M26.500 18C30 16 33 14 35 10" fill="none" stroke="#3b271c" stroke-width="1.500" stroke-linecap="round"/>`
      + pruim(8, 24, 4.600) + pruim(15, 17.500, 4.200) + pruim(34, 36, 4.400) + pruim(33, 21, 4.100) + pruim(31, 7, 4.800) + pruim(14, 41, 3.800)
      + cirkel(36, 8.500, 1.500, '#e58aa8') + cirkel(27, 31, 1.400, '#e58aa8') + cirkel(10, 33, 1.300, '#f4a0ba') + cirkel(21, 12, 1.400, '#e58aa8');
  }
  if (i === 1) {                                  // pioen: twee lagen puntige bladeren
    return [0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const [x, y] = polair(M[0], M[1], 9, k * 45); return blad(x, y, k * 45, 8.5, 4.6, 'url(#mjPioen)'); }).join('')
      + [0, 1, 2, 3, 4, 5].map((k) => { const [x, y] = polair(M[0], M[1], 5.2, k * 60 + 30); return blad(x, y, k * 60 + 30, 5.6, 3.3, '#f08cae'); }).join('') + cirkel(...M, 2.4, GOUD);
  }
  if (i === 2) {                                  // chrysant: veel smalle bladeren
    return Array.from({ length: 18 }, (_, k) => { const [x, y] = polair(M[0], M[1], 9.4, k * 20); return blad(x, y, k * 20, 7, 1.7, k % 2 ? 'url(#mjGoud)' : '#f6d36a'); }).join('')
      + cirkel(...M, 4, '#b8741a') + cirkel(...M, 1.8, '#f7d68a');
  }
  return blad(20, 17, 0, 10, 5.4, PAARS) + blad(11.5, 28, -62, 9, 4.6, '#9a6fc4') + blad(28.5, 28, 62, 9, 4.6, '#9a6fc4') + blad(15, 35, -150, 5.5, 3.2, '#c7a6e3') + blad(25, 35, 150, 5.5, 3.2, '#c7a6e3') + cirkel(20, 28, 2.6, GOUD);
}
function seizoen(i) {
  if (i === 0) return `<path d="M20 44 V28" stroke="${GROEN}" stroke-width="3" stroke-linecap="round"/>` + blad(26, 22, 55, 8, 4.4, '#4aa86f') + blad(14, 22, -55, 8, 4.4, '#2b8a57') + `<path d="M9 44 h22" stroke="#8a6a3b" stroke-width="3" stroke-linecap="round"/>` + `<path d="M11 40 q3 -3 6 0 M23 40 q3 -3 6 0" fill="none" stroke="#8a6a3b" stroke-width="1.2" stroke-linecap="round"/>`;
  if (i === 1) return cirkel(20, 26, 8.5, GOUD) + cirkel(20, 26, 5.2, '#f2c75a') + Array.from({ length: 12 }, (_, k) => { const [x1, y1] = polair(20, 26, 11.5, k * 30), [x2, y2] = polair(20, 26, k % 2 ? 14.5 : 17, k * 30); return `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" stroke="${GOUD}" stroke-width="2.4" stroke-linecap="round"/>`; }).join('');
  if (i === 2) return `<path d="M20 8 L24 15 L32 13 L29 21 L36 26 L28 29 L30 37 L22 35 L20 44 L18 35 L10 37 L12 29 L4 26 L11 21 L8 13 L16 15Z" fill="#d9772b" stroke="#a9541a" stroke-width="1" stroke-linejoin="round"/><path d="M20 44 V16 M20 30 L12 24 M20 30 L28 24" fill="none" stroke="#f6c28f" stroke-width="1.3" stroke-linecap="round"/>`;
  return Array.from({ length: 6 }, (_, k) => {
    const a = k * 60, [x2, y2] = polair(20, 26, 16, a), [bx, by] = polair(20, 26, 10.5, a), [b1x, b1y] = polair(bx, by, 4.6, a - 55), [b2x, b2y] = polair(bx, by, 4.6, a + 55);
    return `<path d="M20 26L${f(x2)} ${f(y2)}M${f(bx)} ${f(by)}L${f(b1x)} ${f(b1y)}M${f(bx)} ${f(by)}L${f(b2x)} ${f(b2y)}" stroke="${BLAUW}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
  }).join('') + cirkel(20, 26, 2.6, '#7fb2e6');
}

// De tekening van plaatje `p` (0 tot en met 41): de binnenkant van een svg met viewBox 0 0 40 52
export function plaatjeSvg(p) {
  if (p < 9) return bloesems(p + 1);
  if (p < 18) return bamboe(p - 8);
  if (p < 27) return lantaarns(p - 17);
  if (p < 31) return wind(p - 27);
  if (p < 34) return draak(p - 31);
  if (p < 38) return bloem(p - 34);
  return seizoen(p - 38);
}

// Hoe een schermlezer het plaatje noemt: [sleutel, params] voor t()
export function plaatjeNaam(p) {
  if (p < 9) return ['mahjong.suit.dots', { n: p + 1 }];
  if (p < 18) return ['mahjong.suit.bamboo', { n: p - 8 }];
  if (p < 27) return ['mahjong.suit.numbers', { n: p - 17 }];
  if (p < 31) return [`mahjong.wind.${p - 27}`, {}];
  if (p < 34) return [`mahjong.dragon.${p - 31}`, {}];
  return p < 38 ? ['mahjong.flower', {}] : ['mahjong.season', {}];
}
