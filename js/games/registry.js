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
      'Staat een cijfer fout, dan zie je dat meteen en gaat er een bloesem (leven) af. Zijn ze op, dan begin je opnieuw.',
      'Met "Potlood" zet je een cijfer klein in het vakje, als notitie. Notities kosten nooit een leven.',
      'Met "Stap terug" maak je je laatste handeling ongedaan. Met "Tip" vul je één vakje voor je in, zonder leven te verliezen.',
    ],
    difficulties: [
      { id: 'makkelijk', label: 'Makkelijk', hint: 'Rustig beginnen · 5 levens' },
      { id: 'gemiddeld', label: 'Gemiddeld', hint: 'Een leuke uitdaging · 4 levens' },
      { id: 'moeilijk', label: 'Moeilijk', hint: 'Voor ervaren puzzelaars · 3 levens' },
      { id: 'extreem', label: 'Extreem', hint: 'Voor echte experts · 3 levens' },
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
      'Elke puzzel heeft een thema, bijvoorbeeld bloemen. Rechts of onder het rooster staan de woorden die je zoekt.',
      'Tik op de eerste letter van een woord en daarna op de laatste letter. De tweede tik hoeft niet precies te zijn.',
      'Met een muis kun je ook slepen. Woorden kunnen rechtdoor, naar beneden en bij hogere niveaus ook schuin en achterstevoren staan.',
      'Staat het woord in de lijst, dan wordt het gemarkeerd en doorgestreept. Een misser kost niets.',
      'Even vastgelopen? Tik op een woord in de lijst of op "Tip": het eerste vakje van het woord licht op.',
    ],
    difficulties: [
      { id: 'makkelijk', label: 'Makkelijk', hint: '8 bij 8 · 6 woorden' },
      { id: 'gemiddeld', label: 'Gemiddeld', hint: '10 bij 10 · ook schuin' },
      { id: 'moeilijk', label: 'Moeilijk', hint: '12 bij 12 · ook achterstevoren' },
      { id: 'extreem', label: 'Extreem', hint: '13 bij 13 · 15 woorden' },
    ],
    status: 'ready',
    wide: true,
    load: () => import('./woordzoeker/woordzoeker.js'),
  },
  {
    id: 'kruiswoord',
    name: 'Kruiswoord­puzzel',
    icon: 'kruiswoord',
    summary: 'Los de omschrijvingen op en vul de woorden in.',
    howTo: [
      'Elk wit vakje hoort bij een woord. De omschrijving staat bovenaan het rooster, met het aantal letters.',
      'Tik op een vakje en typ met het toetsenbord onder het rooster, of met je eigen toetsenbord. Tik nog eens op hetzelfde vakje om te wisselen tussen horizontaal en verticaal.',
      'Woorden kruisen elkaar: een letter helpt dus ook bij het andere woord.',
      'Is een woord vol, dan zie je meteen of het klopt. Een goed woord licht op, een fout woord schudt even. Fouten kosten niets.',
      'Met "Tip" onthul je één letter, met "Woord" het hele woord. Onder het rooster staan alle omschrijvingen.',
    ],
    difficulties: [
      { id: 'makkelijk', label: 'Makkelijk', hint: '8 woorden · bekende woorden' },
      { id: 'gemiddeld', label: 'Gemiddeld', hint: '12 woorden' },
      { id: 'moeilijk', label: 'Moeilijk', hint: '16 woorden · ook lastigere' },
      { id: 'extreem', label: 'Extreem', hint: '22 woorden · dicht op elkaar' },
    ],
    status: 'ready',
    wide: true,
    load: () => import('./kruiswoord/kruiswoord.js'),
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
