// De plaatjes op de tegels, zelf getekend (viewBox 0 0 40 52). De soorten zijn te onderscheiden op vorm, niet alleen op kleur:
//   0-8 stippen 1-9, 9-17 bamboe 1-9, 18-26 getallen 1-9, 27-30 winden (pijl N, O, Z, W), 31-33 draken (vlam, blad, kader),
//   34-37 bloemen (kersenbloesem, pioen, chrysant, orchidee), 38-41 seizoenen (spruit, zon, herfstblad, sneeuwvlok)

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
  + `<radialGradient id="mjPioen" cx=".5" cy=".9" r="1"><stop offset="0" stop-color="#b3205a"/><stop offset=".6" stop-color="#e5588f"/><stop offset="1" stop-color="#fbb4cc"/></radialGradient></defs>`;
const f = (n) => Number(n.toFixed(2));
const cirkel = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
const polair = (cx, cy, r, hoek) => [cx + r * Math.sin(hoek * Math.PI / 180), cy - r * Math.cos(hoek * Math.PI / 180)];

// ----- Stippen -----
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
function stippen(n) {
  const kleuren = [BLAUW, GROEN, ROOD];
  return STIP[n].map(([x, y, r], i) => {
    const k = n === 1 ? ROOD : kleuren[i % 3], ring = n === 1 ? BLAUW : k;
    const glans = `<ellipse cx="${f(x - r * 0.34)}" cy="${f(y - r * 0.42)}" rx="${f(r * 0.3)}" ry="${f(r * 0.15)}" fill="#fff" opacity=".55" transform="rotate(-38 ${f(x - r * 0.34)} ${f(y - r * 0.42)})"/>`;
    return cirkel(x, y, r, ring) + cirkel(x, y, r * 0.66, IVOOR) + cirkel(x, y, r * 0.38, k) + cirkel(x, y, r * 0.14, '#fbe9a8')
      + (r > 10 ? `<circle cx="${x}" cy="${y}" r="${f(r * 0.82)}" fill="none" stroke="#fbe9a8" stroke-width="1"/>` + [0, 1, 2, 3, 4, 5, 6, 7].map((q) => { const [bx, by] = polair(x, y, r * 0.52, q * 45 + 22); return cirkel(bx, by, 0.9, GOUD); }).join('') : '') + glans;
  }).join('');
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

// ----- Getallen -----
function getal(n) {
  const bloesem = [0, 1, 2, 3, 4].map((i) => { const [x, y] = polair(20, 43, 3.5, i * 72); return cirkel(x, y, 2.4, ROZE) + cirkel(x, y, 2.4, 'none', 'stroke="#c0446b" stroke-width=".35"'); }).join('') + cirkel(20, 43, 1.5, GOUD);
  return `<text x="20" y="32" font-size="31" font-weight="800" text-anchor="middle" fill="${ROOD}" stroke="#fff" stroke-opacity=".55" stroke-width=".9" paint-order="stroke" font-family="Georgia, 'Times New Roman', serif">${n}</text>`
    + bloesem;
}

// ----- Winden: een pijl in een ring (noord omhoog, oost naar rechts, zuid omlaag, west naar links) -----
function wind(i) {
  const kleur = [BLAUW, ROOD, GROEN, GOUD][i];
  return `<circle cx="20" cy="26" r="16" fill="none" stroke="${GOUD}" stroke-width="2.4"/><circle cx="20" cy="26" r="13.4" fill="none" stroke="${INK}" stroke-width=".5"/><circle cx="20" cy="26" r="12" fill="none" stroke="${kleur}" stroke-width=".9" stroke-dasharray="2 2.2"/>`
    + `<g transform="rotate(${i * 90} 20 26)"><path d="M20 12 L28 26 L22.2 24 L22.2 38 L17.8 38 L17.8 24 L12 26Z" fill="${kleur}" stroke="#2a1d12" stroke-width=".8" stroke-linejoin="round"/></g>`;
}

// ----- Draken -----
function draak(i) {
  if (i === 0) return `<path d="M20 6 C25 15 32 20 32 31 C32 40 27 46 20 46 C13 46 8 40 8 31 C8 24 12 21 14 15 C16 19 17 20 19 21 C18 16 18 11 20 6Z" fill="${ROOD}"/><path d="M20 24 C23 29 26 31 26 36 C26 40 23 42 20 42 C17 42 14 40 14 36 C14 33 16 31 17 28 C18 30 19 31 20 31Z" fill="#ffd9a6"/>`;
  if (i === 1) return `<path d="M9 43 C5 24 17 8 33 8 C36 25 27 41 9 43Z" fill="${GROEN}"/><path d="M10 42 C16 32 23 22 32 10" fill="none" stroke="${IVOOR}" stroke-width="1.8" stroke-linecap="round"/><path d="M17 33 C19 28 15 27 13 29M23 25 C26 22 22 19 20 21" fill="none" stroke="${IVOOR}" stroke-width="1.2" stroke-linecap="round"/>`;
  return `<rect x="8" y="8" width="24" height="36" rx="4.5" fill="none" stroke="${BLAUW}" stroke-width="2.6"/><rect x="12.5" y="12.5" width="15" height="27" rx="2.5" fill="none" stroke="${BLAUW}" stroke-width="1.2"/>`;
}

// ----- Bloemen en seizoenen -----
const blad = (x, y, hoek, lang, breed, kleur) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${breed}" ry="${lang}" fill="${kleur}" transform="rotate(${hoek} ${f(x)} ${f(y)})"/>`;
function bloem(i) {
  const M = [20, 25];
  if (i === 0) {                                  // kersenbloesem: vijf blaadjes met een inkeping, meeldraden van goud
    const petal = 'M0 0C-7.200-4.200-9.600-12.400-4.800-15.600-2.800-16.800-1-16 0-14.200 1-16 2.800-16.800 4.800-15.600 9.600-12.400 7.200-4.200 0 0Z';
    return [0, 1, 2, 3, 4].map((k) => `<path transform="translate(${M[0]} ${M[1]}) rotate(${k * 72}) scale(.98)" d="${petal}" fill="url(#mjPetaal)" stroke="#c4456b" stroke-width=".6" stroke-linejoin="round"/>`).join('')
      + [0, 1, 2, 3, 4].map((k) => `<path transform="translate(${M[0]} ${M[1]}) rotate(${k * 72})" d="M0 -3.600L0 -9.400" stroke="#d96a8d" stroke-width=".5" stroke-linecap="round"/>`).join('')
      + cirkel(...M, 3.4, '#f7b6c8') + [0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const [x, y] = polair(M[0], M[1], 5.4, k * 45 + 10), [x0, y0] = polair(M[0], M[1], 1.2, k * 45 + 10); return `<path d="M${f(x0)} ${f(y0)}L${f(x)} ${f(y)}" stroke="#c98a2a" stroke-width=".5"/>` + cirkel(x, y, 0.85, GOUD); }).join('') + cirkel(...M, 1.3, '#b8325f');
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
  if (p < 9) return stippen(p + 1);
  if (p < 18) return bamboe(p - 8);
  if (p < 27) return getal(p - 17);
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
