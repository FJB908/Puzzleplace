// Het register van alle spellen. Dit is het ENIGE bestand dat je aanpast om een
// spel aan het platform toe te voegen. Zie docs/SPEL-TOEVOEGEN.md.
//
// Een spel heeft:
//   id        korte naam zonder spaties (komt in de link voor)
//   name      zoals de speler het ziet (in de taal van de app)
//   icon      naam van een icoon uit js/ui.js
//   summary   één zin op de kaart
//   howTo     korte stappen ("Zo werkt het"), 3 tot 5 regels
//   status    'ready' (speelbaar) of 'soon' (komt binnenkort)
//   load      () => import('./mijnspel.js')   (alleen bij 'ready')
//   difficulties  (optioneel) eigen niveaus, anders de standaard uit config.js
// name, summary, howTo en difficulties komen uit het taalpakket: gebruik `spel('<id>', {...})` en zet de teksten in tools/i18n/bron.

import { DIFFICULTIES, niveau } from '../config.js';
import { t, tLijst } from '../i18n/index.js';

// De teksten van een spel (naam, samenvatting, uitleg en de hints bij de niveaus) staan in het taalpakket, onder  <id>.name, <id>.summary,
// <id>.howTo.1 ... en <id>.level.<niveau>  (zie tools/i18n/bron/1xx-*.txt). `spel` maakt er de velden van de registry van; het zijn
// "getters", dus ze volgen de taal van de app als die verandert (kopieer zo'n spel dus nooit met {...spel}: dan bevriest de tekst).
// In de uitleg kunnen {plaatshouders} staan voor de namen van knoppen, zodat uitleg en knop altijd hetzelfde zeggen.
const VIER = ['makkelijk', 'gemiddeld', 'moeilijk', 'extreem'];
const spel = (id, rest, knoppen = () => ({})) => Object.defineProperties({ id, ...rest }, {
  name: { enumerable: true, get: () => t(`${id}.name`) },
  summary: { enumerable: true, get: () => t(`${id}.summary`) },
  howTo: { enumerable: true, get: () => tLijst(`${id}.howTo`, knoppen()) },
  difficulties: { enumerable: true, value: VIER.map((n) => niveau(n, () => t(`${id}.level.${n}`))) },
});

const GAMES = [
  spel('sudoku', {
    icon: 'sudoku',
    status: 'ready',
    wide: true,
    load: () => import('./sudoku/sudoku.js'),
  }, () => ({ pencil: t('sudoku.pencil'), undo: t('sudoku.undo'), hint: t('common.hint') })),
  spel('woordtuin', {
    icon: 'woordtuin',
    status: 'ready',
    load: () => import('./woordtuin/woordtuin.js'),
  }, () => ({ hint: t('common.hint') })),
  spel('woordzoeker', {
    icon: 'woordzoeker',
    status: 'ready',
    wide: true,
    load: () => import('./woordzoeker/woordzoeker.js'),
  }, () => ({ hint: t('common.hint') })),
  spel('kruiswoord', {
    icon: 'kruiswoord',
    status: 'ready',
    wide: true,
    load: () => import('./kruiswoord/kruiswoord.js'),
  }, () => ({ hint: t('common.hint'), word: t('kruiswoord.word') })),
  spel('mahjong', {
    icon: 'mahjong',
    status: 'ready',
    wide: true,
    load: () => import('./mahjong/mahjong.js'),
  }, () => ({ undo: t('mahjong.undo'), hint: t('common.hint'), shuffle: t('mahjong.shuffle') })),
  spel('solitaire', {
    icon: 'solitaire',
    status: 'ready',
    wide: true,
    load: () => import('./solitaire/solitaire.js'),
  }, () => ({ undo: t('solitaire.undo'), hint: t('common.hint'), finish: t('solitaire.finish') })),
];

// Voorbeeldspel om de flow te testen. Alleen zichtbaar via  index.html?demo=1
if (new URLSearchParams(location.search).has('demo')) {
  GAMES.push({
    id: 'demo',
    name: 'Example game',
    icon: 'puzzle',
    summary: 'Only to test the platform: tap the button five times.',
    howTo: ['Tap the big button five times.', 'Your progress is saved automatically.'],
    status: 'ready',
    load: () => import('./demo.js'),
  });
}

const withDefaults = (g) => Object.defineProperties({ difficulties: DIFFICULTIES }, Object.getOwnPropertyDescriptors(g));      // geen {...g}: dat bevriest de getters

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
