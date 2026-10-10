// Hulp: korte vragen met korte antwoorden, in gewone taal.

import { h, icon } from '../ui.js';
import { FEATURES } from '../config.js';

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
  ['Hoe werkt Woordtuin?',
    'Maak een woord van 3 tot 7 letters door over aangrenzende letters te vegen of ze aan te tikken. De vakjes van je woord worden van jou. Maakt de ander later een woord door jouw vakjes, dan pakt die ze af, behalve beschermde vakjes (alle buren in dezelfde kleur). Zijn alle vakjes gekleurd, dan wint wie de meeste heeft. Tik bij het spel op "Uitleg" voor de hele uitleg.'],
  ['Waarom wordt mijn woord in Woordtuin niet geaccepteerd?',
    'In Woordtuin tellen alleen gewone woorden in hun gewone vorm: "roos" mag, maar "rozen" (meervoud), "liep" (verleden tijd) en "bokje" (verkleinwoord) niet. Ook namen en zeldzame woorden tellen niet. Je krijgt altijd een korte uitleg en het kost je niets.'],
  ['Waar komen de woorden van Woordtuin vandaan?',
    ['De woordenlijst is gemaakt met de woordenlijst van ', h('a', { href: 'https://www.opentaal.org', target: '_blank', rel: 'noopener' }, 'Stichting OpenTaal'), ' (onder de BSD- en CC BY 3.0-licentie), aangevuld met de hand: gewone stamwoorden die bijna iedereen kent.']],
];

const MET_VRIENDEN = ['Hoe speel ik Woordtuin met een vriend?',
  ['Maak een account bij ', h('a', { href: '#/account' }, 'Account'), ', voeg bij ', h('a', { href: '#/vrienden' }, 'Vrienden'), ' je vriend toe met zijn of haar vriendencode en tik op "Woordtuin" bij je vriend. Jullie spelen om beurten: je hoeft niet te wachten, de app laat het zien als je aan de beurt bent.']];

export function helpView() {
  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('a', { class: 'btn btn-quiet back', href: '#/instellingen' }, icon('back'), 'Terug'),
      h('h1', { tabindex: '-1' }, 'Hulp'),
      h('p', {}, 'Tik op een vraag om het antwoord te lezen.'),
    ),
    h('div', { class: 'stack' },
      [...QA, ...(FEATURES.friends ? [MET_VRIENDEN] : [])].map(([q, a]) => h('details', { class: 'disclosure' },
        h('summary', {}, q),
        h('div', { class: 'disclosure-body' }, h('p', {}, a))))),
  );
  return { title: 'Hulp', nav: 'settings', decor: 'spray', node };
}
