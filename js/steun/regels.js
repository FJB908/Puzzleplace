// De spelregels van de steun, zonder scherm en zonder opslag, zodat ze zich laten testen (tests/steun.test.mjs).
//
// Het uitgangspunt: wat je nodig hebt om te spelen is en blijft gratis. Een extra tip is een extraatje: een spel geeft één gratis tip,
// voor nog een tip kijk je een korte video, en wie "Supporter" is (eenmalige bijdrage) heeft ze onbeperkt en ziet het videoaanbod nooit meer.
// Aanbiedingen komen nooit in de eerste dagen, en de vraag om te steunen komt zelden en stopt als je twee keer "Nu niet" kiest.

export const DAG = 86400000;
export const KAART_NA_SPELLEN = 7;         // pas na zoveel uitgespeelde spellen vragen we of je de app wilt steunen
export const KAART_MAX_NEE = 2;            // na zoveel keer "Nu niet" vragen we het niet meer (alleen nog via de instellingen)
export const KAART_PAUZE_DAGEN = 30;       // en na een "Nu niet" minstens zoveel dagen niet

/** Zijn we nog in de rustige eerste dagen? Zonder bekend eerste gebruik zijn we er nog in. */
export const isRustig = (sinds, nu, dagen) => sinds == null || nu - sinds < dagen * DAG;

/**
 * Wat kan de speler doen als de gratis tip op is?
 * 'supporter' = gewoon doorgaan (onbeperkt), 'video' = eerst een video kijken, null = niets (de knop blijft uit, zoals altijd).
 * Een Supporter blijft Supporter, ook als de schakelaars later uitgaan: wie betaald heeft, houdt wat hij kreeg.
 */
export function extraTipWeg({ supporter, video, rustig }) {
  if (supporter) return 'supporter';
  if (video && !rustig) return 'video';
  return null;
}

/**
 * In welke stand is de tip van dit spel? `state` is de bewaarde stand van het spel: state.tip = de gratis tip is gebruikt,
 * state.tipTegoed = het aantal tips dat al met een video is verdiend maar nog niet gebruikt (bijvoorbeeld omdat er toen geen tip te geven was).
 * Geeft 'gratis' | 'supporter' | 'tegoed' | 'video' | null.
 */
export function tipStand(state, kans) {
  if (!state.tip) return 'gratis';
  const weg = extraTipWeg(kans);
  if (weg === 'supporter') return 'supporter';
  if (state.tipTegoed > 0) return 'tegoed';
  return weg;                                     // 'video' of null
}

/** Een tip is echt gegeven: de gratis tip is op, of een verdiend tegoed is gebruikt. (Een Supporter gebruikt niets op.) */
export function tipGebruikt(state, kans) {
  if (!state.tip) { state.tip = true; return; }
  if (extraTipWeg(kans) === 'supporter') return;
  if (state.tipTegoed > 0) state.tipTegoed--;
}

/** Een video is afgekeken: dat levert één tip op, die we bewaren tot hij echt gegeven is. */
export function tipVerdiend(state) { state.tipTegoed = (state.tipTegoed || 0) + 1; }

/** Mag het kaartje "Bevalt het? Je kunt de app steunen" nu op Start staan? */
export function kaartTonen({ bijdrage, supporter, rustig, voltooid, nee, laatsteVraag, nu }) {
  if (!bijdrage || supporter || rustig) return false;
  if (voltooid < KAART_NA_SPELLEN || nee >= KAART_MAX_NEE) return false;
  return laatsteVraag == null || nu - laatsteVraag >= KAART_PAUZE_DAGEN * DAG;
}
