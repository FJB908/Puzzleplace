// Hulp: korte vragen met korte antwoorden, in gewone taal.

import { h, icon } from '../ui.js';

const QA = [
  ['Hoe maak ik de letters groter?',
    ['Ga naar ', h('a', { href: '#/instellingen' }, 'Instellingen'), ' en kies bij "Tekstgrootte" voor Groot of Extra groot.']],
  ['Gaat mijn voortgang verloren als ik stop?',
    'Nee. Na elke zet wordt je spel vanzelf bewaard op dit apparaat. Je kunt altijd op "Terug" tikken en later verdergaan.'],
  ['Hoe ga ik verder met een spel?',
    'Op het startscherm staat bovenaan "Verder met…". Tik op "Verder spelen". Je vindt het ook bij het spel zelf.'],
  ['Hoe begin ik opnieuw?',
    'Open het spel bij "Spellen" en tik op "Nieuw spel". Je krijgt eerst een vraag, zodat je niets per ongeluk wist.'],
  ['Wat is de puzzel van de dag?',
    'Elke dag staat er een nieuwe puzzel klaar. Op het startscherm kun je er met één tik aan beginnen.'],
  ['Kan ik Puzzelplaats als app op mijn beginscherm zetten?',
    'Ja. Open het menu van je browser en kies "Toevoegen aan beginscherm" of "App installeren".'],
  ['Moet ik inloggen?',
    'Nee. Je kunt direct spelen zonder account.'],
];

export function helpView() {
  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('a', { class: 'btn btn-quiet back', href: '#/instellingen' }, icon('back'), 'Terug'),
      h('h1', { tabindex: '-1' }, 'Hulp'),
      h('p', {}, 'Tik op een vraag om het antwoord te lezen.'),
    ),
    h('div', { class: 'stack' },
      QA.map(([q, a]) => h('details', { class: 'disclosure' },
        h('summary', {}, q),
        h('div', { class: 'disclosure-body' }, h('p', {}, a))))),
  );
  return { title: 'Hulp', nav: 'settings', decor: 'spray', node };
}
