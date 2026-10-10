// Het register van alle spellen. Dit is het ENIGE bestand dat je aanpast om een
// spel aan het platform toe te voegen. Zie docs/SPEL-TOEVOEGEN.md.
//
// Een spel heeft:
//   id        korte naam zonder spaties (komt in de link voor)
//   name      zoals de speler het ziet
//   icon      naam van een icoon uit js/ui.js
//   summary   één zin op de kaart
//   howTo     korte stappen ("Zo werkt het"), 3 tot 5 regels
//   status    'ready' (speelbaar) of 'soon' (komt binnenkort)
//   load      () => import('./mijnspel.js')   (alleen bij 'ready')
//   difficulties  (optioneel) eigen niveaus, anders de standaard uit config.js

import { DIFFICULTIES } from '../config.js';

const GAMES = [
  {
    id: 'sudoku',
    name: 'Sudoku',
    icon: 'sudoku',
    summary: 'Vul de cijfers 1 tot en met 9 in het rooster in.',
    howTo: [
      'In elke rij, elke kolom en elk blokje van 3 bij 3 komt elk cijfer van 1 tot en met 9 precies één keer voor.',
      'Tik op een leeg vakje en kies daarna een cijfer onderaan.',
      'Met "Potlood" zet je een cijfer klein in het vakje, als notitie.',
      'Met "Stap terug" maak je je laatste handeling ongedaan, zo vaak als je wilt.',
      'Met "Controle" zie je of er fouten staan en met "Tip" vul je één vakje voor je in.',
    ],
    status: 'ready',
    wide: true,
    load: () => import('./sudoku/sudoku.js'),
  },
  {
    id: 'woordzoeker',
    name: 'Woordzoeker',
    icon: 'woordzoeker',
    summary: 'Zoek de verborgen woorden tussen de letters.',
    howTo: [
      'Onder het rooster staat een lijst met woorden.',
      'Elk woord staat ergens in het rooster: rechtdoor, naar beneden of schuin.',
      'Tik op de eerste en daarna op de laatste letter van een woord.',
      'Gevonden woorden worden doorgestreept in de lijst.',
    ],
    status: 'soon',
    load: null,
  },
  {
    id: 'kruiswoord',
    name: 'Kruiswoordpuzzel',
    icon: 'kruiswoord',
    summary: 'Los de omschrijvingen op en vul de woorden in.',
    howTo: [
      'Tik op een vakje om de omschrijving te lezen.',
      'Typ het woord dat erbij past.',
      'Woorden kruisen elkaar: een letter helpt dus ook bij het andere woord.',
    ],
    status: 'soon',
    load: null,
  },
];

// Voorbeeldspel om de flow te testen. Alleen zichtbaar via  index.html?demo=1
if (new URLSearchParams(location.search).has('demo')) {
  GAMES.push({
    id: 'demo',
    name: 'Voorbeeldspel',
    icon: 'puzzle',
    summary: 'Alleen om het platform te testen: tik vijf keer op de knop.',
    howTo: ['Tik vijf keer op de grote knop.', 'Je voortgang wordt vanzelf bewaard.'],
    status: 'ready',
    load: () => import('./demo.js'),
  });
}

const withDefaults = (g) => ({ difficulties: DIFFICULTIES, ...g });

export const games = GAMES.map(withDefaults);
export const getGameInfo = (id) => games.find((g) => g.id === id);
export const isReady = (g) => g.status === 'ready' && typeof g.load === 'function';
export const readyGames = () => games.filter(isReady);

// "Puzzel van de dag": elke dag een ander speelbaar spel, voor iedereen hetzelfde.
export function dailyGame() {
  const ready = readyGames().filter((g) => g.id !== 'demo');
  const list = ready.length ? ready : readyGames();
  if (!list.length) return null;
  const dayNumber = Math.floor(new Date().setHours(12, 0, 0, 0) / 86400000);
  return list[dayNumber % list.length];
}
