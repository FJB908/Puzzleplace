// De thema's en woorden van Woordzoeker per taal. Elke taal heeft eigen woorden (geen vertalingen van elkaar), met alleen letters
// van het alfabet van die taal (zie js/shared/talen.js). Ze worden pas geladen als ze nodig zijn.

import { FREQ } from './frequentie.js';

const geladen = new Map();

export async function laadThemas(taal) {
  if (!geladen.has(taal)) {
    const { THEMES } = await import(`./talen/${taal}.js`);
    geladen.set(taal, { THEMES, FREQ: FREQ[taal] });
  }
  return geladen.get(taal);
}

export function themas(taal) {
  const t = geladen.get(taal);
  if (!t) throw new Error(`De woorden voor Woordzoeker in ${taal} zijn nog niet geladen`);
  return t;
}
