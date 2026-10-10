// De woordenlijsten van Woordtuin per taal (js/games/woordtuin/talen/<taal>.js, gemaakt door tools/woordenlijst/bouw.mjs).
// Ze worden pas geladen als ze nodig zijn (de app: laadWoordenboek bij het starten van een spel; de server laadt ze allemaal bij het opstarten).
// Daarna zijn `woordenboek(taal)`, `isWord` en de rest van de engine gewoon synchroon.

const geladen = new Map();

function bouw(taal, mod) {
  const trie = { kids: new Map(), end: false, com: false };
  for (const w of mod.WOORDEN) {
    let node = trie;
    for (const ch of w) { let next = node.kids.get(ch); if (!next) node.kids.set(ch, (next = { kids: new Map(), end: false, com: false })); node = next; }
    node.end = true; node.com = mod.ALLEDAAGS.has(w);
  }
  return {
    taal,
    WOORDEN: mod.WOORDEN, ALLEDAAGS: mod.ALLEDAAGS,
    set: new Set(mod.WOORDEN),
    trie,
    zak: Object.entries(mod.ZAK).flatMap(([c, n]) => Array(n).fill(c)),          // de letters voor het bord, zo vaak als ze voorkomen
  };
}

export async function laadWoordenboek(taal) {
  if (!geladen.has(taal)) geladen.set(taal, bouw(taal, await import(`./talen/${taal}.js`)));
  return geladen.get(taal);
}

export function woordenboek(taal) {
  const w = geladen.get(taal);
  if (!w) throw new Error(`Het woordenboek voor Woordtuin in ${taal} is nog niet geladen`);
  return w;
}

export const isGeladen = (taal) => geladen.has(taal);
