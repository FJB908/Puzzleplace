// Teksten opmaken: {naam} invullen en het juiste meervoud kiezen. Zuivere functies, gedeeld door de app, de server en de tests.
//
// Een tekst met een getal staat in meerdere vormen, bijvoorbeeld
//   'vakjes_one': '{n} vakje',   'vakjes_other': '{n} vakjes'
// De taal bepaalt welke vormen er zijn (Engels: one, other; Pools: one, few, many, other; Sloveens: one, two, few, other; ...),
// zie Intl.PluralRules. Ontbreekt een vorm, dan geldt `_other`, en anders de sleutel zelf.

import { TALEN } from './talen.js';

export function invullen(tekst, params) {
  if (!params) return tekst;
  return tekst.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : m));
}

const regels = new Map();
export function meervoudsregel(taal) {
  let r = regels.get(taal);
  if (!r) { r = new Intl.PluralRules(TALEN[taal]?.locale || taal); regels.set(taal, r); }
  return r;
}
// Welke vormen gebruikt een taal voor hele getallen? We tellen alleen hele aantallen (0 tot en met 1000), dus een vorm die alleen voor
// kommagetallen (Pools, Tsjechisch: "other"/"many") of voor miljoenen (Frans, Spaans, Italiaans: "many") bestaat, hoeft niet vertaald te worden.
// Geeft per vorm terug voor hoeveel van die getallen hij geldt: "one" is in het Engels alleen 1, maar in het Lets ook 21, 31, ...
// (een tekst voor zo'n vorm moet dus {n} bevatten, niet een vast getal).
const dekkingen = new Map();
export function meervoudsdekking(taal) {
  let d = dekkingen.get(taal);
  if (!d) {
    d = {};
    for (let i = 0; i <= 1000; i++) { const v = meervoudsregel(taal).select(i); d[v] = (d[v] || 0) + 1; }
    dekkingen.set(taal, d);
  }
  return d;
}
export const meervoudsvormen = (taal) => Object.keys(meervoudsdekking(taal));

// Zoek de tekst in een vertaalpakket; geeft undefined als hij er niet in staat.
export function zoek(pakket, sleutel, params, taal) {
  if (params && params.n !== undefined && Number.isFinite(Number(params.n))) {
    const vorm = meervoudsregel(taal).select(Number(params.n));
    const hit = pakket[`${sleutel}_${vorm}`] ?? pakket[`${sleutel}_other`];
    if (hit !== undefined) return hit;
  }
  return pakket[sleutel];
}
