// De woorden en omschrijvingen van de kruiswoordpuzzel per taal (js/games/kruiswoord/talen/<taal>.js). Elke taal heeft eigen woorden en
// omschrijvingen, geen vertalingen van elkaar: een omschrijving past bij het woord in die taal. Ze worden pas geladen als ze nodig zijn.

const geladen = new Map();

export async function laadWoorden(taal) {
  if (!geladen.has(taal)) geladen.set(taal, (await import(`./talen/${taal}.js`)).ENTRIES);
  return geladen.get(taal);
}

export function woorden(taal) {
  const w = geladen.get(taal);
  if (!w) throw new Error(`De woorden voor het kruiswoord in ${taal} zijn nog niet geladen`);
  return w;
}
