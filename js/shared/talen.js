// De talen van de app, en hoe woorden voor de spellen "gevouwen" worden.
//
// Eén bron voor de app, de server en de gereedschappen (tools/woordenlijst): wat is een taal, in welk alfabet speelt
// Woordtuin, en hoe wordt een woord een rijtje letters voor het bord.
//
// Vouwen: de spellen werken met een eenvoudig alfabet per taal. Streepjes, trema's en andere tekens op letters tellen niet mee:
// "é" is gewoon een "e", "ü" een "u", "ñ" een "n", "č" een "c". Een paar letters hebben geen "gewone" letter eronder en worden
// de gebruikelijke spelling: "ß" wordt "ss", "æ" wordt "ae", "œ" wordt "oe". Zo kun je een woord altijd typen zonder de accenten
// op je toetsenbord te hebben, en elk woord dat in het woordenboek staat blijft speelbaar.

// Taal: id (BCP 47), toetsenbord (de letters op het toetsenbord van Kruiswoord, zoals op een gewoon toetsenbord van die taal), native (hoe de taal zichzelf noemt), schrift, alfabet (de gevouwen letters), klinkers (voor een bord dat er
// natuurlijk uitziet), speciaal (letters die eerst worden vervangen), woordenlijst (waar de lijst vandaan komt, zie tools/woordenlijst/bronnen.md).
const LATIJN = 'abcdefghijklmnopqrstuvwxyz';
const KL = 'aeiou';

export const TALEN = {
  en: { native: 'English', english: 'English', locale: 'en-GB', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, speciaal: [['æ', 'ae'], ['œ', 'oe']], woordenlijst: { naam: 'SCOWL', url: 'http://wordlist.aspell.net', licentie: 'MIT and BSD' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  nl: { native: 'Nederlands', english: 'Dutch', locale: 'nl-NL', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, speciaal: [['ĳ', 'ij'], ['æ', 'ae'], ['œ', 'oe']], woordenlijst: { naam: 'OpenTaal', url: 'https://www.opentaal.org', licentie: 'BSD 3-Clause / CC BY 3.0' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  de: { native: 'Deutsch', english: 'German', locale: 'de-DE', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, speciaal: [['ß', 'ss'], ['ẞ', 'ss'], ['æ', 'ae'], ['œ', 'oe']], naamwoordenMetHoofdletter: true, woordenlijst: { naam: 'igerman98', url: 'https://www.j3e.de/ispell/igerman98/', licentie: 'GPL 2 / GPL 3' }, toetsenbord: ['QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'] },
  fr: { native: 'Français', english: 'French', locale: 'fr-FR', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, speciaal: [['æ', 'ae'], ['œ', 'oe']], woordenlijst: { naam: 'Dicollecte', url: 'https://www.dicollecte.org', licentie: 'MPL 2.0' }, toetsenbord: ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'] },
  es: { native: 'Español', english: 'Spanish', locale: 'es-ES', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, speciaal: [['æ', 'ae'], ['œ', 'oe']], woordenlijst: { naam: 'RLA-ES', url: 'https://github.com/sbosio/rla-es', licentie: 'GPL 3 / LGPL 3 / MPL 1.1' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  it: { native: 'Italiano', english: 'Italian', locale: 'it-IT', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, speciaal: [['æ', 'ae'], ['œ', 'oe']], woordenlijst: { naam: 'Italian dictionary (Pescetti)', url: 'https://extensions.openoffice.org/en/project/italian-dictionary-thesaurus-hyphenation-patterns', licentie: 'GPL 3' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  pt: { native: 'Português', english: 'Portuguese', locale: 'pt-PT', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, speciaal: [['æ', 'ae'], ['œ', 'oe']], woordenlijst: { naam: 'VERO + Dicionário Português (Minho)', url: 'https://natura.di.uminho.pt/wiki/doku.php?id=dicionarios:main', licentie: 'LGPL / MPL' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  ca: { native: 'Català', english: 'Catalan', locale: 'ca-ES', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, speciaal: [['æ', 'ae'], ['œ', 'oe'], ['l·l', 'll'], ['ŀl', 'll'], ['ŀ', 'l'], ['·', '']], woordenlijst: { naam: 'Diccionari català (Softcatalà)', url: 'https://www.softcatala.org/corrector/', licentie: 'GPL 2 / LGPL 2.1' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  pl: { native: 'Polski', english: 'Polish', locale: 'pl-PL', schrift: 'latijn', alfabet: LATIJN, klinkers: 'aeiouy', speciaal: [['ł', 'l'], ['ø', 'o']], woordenlijst: { naam: 'Słownik ortograficzny (Polish Native Lang Project)', url: 'https://sjp.pl/slownik/ort/', licentie: 'GPL 3 / LGPL 3 / MPL 2.0' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  cs: { native: 'Čeština', english: 'Czech', locale: 'cs-CZ', schrift: 'latijn', alfabet: LATIJN, klinkers: 'aeiouy', klinkerachtig: 'rl', speciaal: [['ø', 'o']], woordenlijst: { naam: 'Czech Hunspell dictionary', url: 'https://github.com/wooorm/dictionaries/tree/main/dictionaries/cs', licentie: 'GPL 2' }, toetsenbord: ['QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'] },
  sk: { native: 'Slovenčina', english: 'Slovak', locale: 'sk-SK', schrift: 'latijn', alfabet: LATIJN, klinkers: 'aeiouy', klinkerachtig: 'rl', speciaal: [['ø', 'o']], woordenlijst: { naam: 'Slovak dictionaries (sk-spell)', url: 'https://github.com/sk-spell/hunspell-sk', licentie: 'GPL 2 / LGPL 2.1 / MPL 1.1' }, toetsenbord: ['QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'] },
  sl: { native: 'Slovenščina', english: 'Slovenian', locale: 'sl-SI', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, klinkerachtig: 'r', speciaal: [['đ', 'd']], woordenlijst: { naam: 'Slovenski slovar za črkovanje', url: 'https://github.com/wooorm/dictionaries/tree/main/dictionaries/sl', licentie: 'GPL 3 / LGPL 2.1' }, toetsenbord: ['QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'] },
  hr: { native: 'Hrvatski', english: 'Croatian', locale: 'hr-HR', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, klinkerachtig: 'r', speciaal: [['đ', 'd']], woordenlijst: { naam: 'Croatian dictionary (Lacković)', url: 'https://github.com/wooorm/dictionaries/tree/main/dictionaries/hr', licentie: 'LGPL 2.1 / SISSL' }, toetsenbord: ['QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'] },
  hu: { native: 'Magyar', english: 'Hungarian', locale: 'hu-HU', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, speciaal: [], woordenlijst: { naam: 'Magyar Ispell (Németh)', url: 'https://magyarispell.sourceforge.net', licentie: 'GPL 2 / LGPL 2.1 / MPL 1.1' }, toetsenbord: ['QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'] },
  ro: { native: 'Română', english: 'Romanian', locale: 'ro-RO', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, speciaal: [], woordenlijst: { naam: 'Rospell', url: 'https://sourceforge.net/projects/rospell/', licentie: 'GPL 2 / LGPL 2.1 / MPL 1.1' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  sv: { native: 'Svenska', english: 'Swedish', locale: 'sv-SE', schrift: 'latijn', alfabet: LATIJN, klinkers: 'aeiouy', speciaal: [['æ', 'ae'], ['ø', 'o']], woordenlijst: { naam: 'Svenska ordlistan (Andersson)', url: 'https://github.com/wooorm/dictionaries/tree/main/dictionaries/sv', licentie: 'LGPL 3' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  da: { native: 'Dansk', english: 'Danish', locale: 'da-DK', schrift: 'latijn', alfabet: LATIJN, klinkers: 'aeiouy', speciaal: [['æ', 'ae'], ['ø', 'o']], woordenlijst: { naam: 'Stavekontrolden', url: 'https://www.stavekontrolden.dk', licentie: 'GPL 2 / LGPL 2.1 / MPL 1.1' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  nb: { native: 'Norsk', english: 'Norwegian', locale: 'nb-NO', schrift: 'latijn', alfabet: LATIJN, klinkers: 'aeiouy', speciaal: [['æ', 'ae'], ['ø', 'o']], woordenlijst: { naam: 'spell-norwegian', url: 'https://github.com/wooorm/dictionaries/tree/main/dictionaries/nb', licentie: 'GPL 2' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  fi: { native: 'Suomi', english: 'Finnish', locale: 'fi-FI', schrift: 'latijn', alfabet: LATIJN, klinkers: 'aeiouy', speciaal: [['æ', 'ae'], ['ø', 'o']], woordenlijst: { naam: 'Voikko', url: 'https://voikko.puimula.org', licentie: 'GPL 2 or later' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  et: { native: 'Eesti', english: 'Estonian', locale: 'et-EE', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, speciaal: [], woordenlijst: { naam: 'Eesti Hunspell', url: 'https://github.com/wooorm/dictionaries/tree/main/dictionaries/et', licentie: 'LGPL 2.1' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  lv: { native: 'Latviešu', english: 'Latvian', locale: 'lv-LV', schrift: 'latijn', alfabet: LATIJN, klinkers: KL, speciaal: [], woordenlijst: { naam: 'Latviešu pareizrakstības vārdnīca (Eisaks)', url: 'http://dict.dv.lv', licentie: 'LGPL 2.1' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  lt: { native: 'Lietuvių', english: 'Lithuanian', locale: 'lt-LT', schrift: 'latijn', alfabet: LATIJN, klinkers: 'aeiouy', speciaal: [], woordenlijst: { naam: 'ispell-lt (Agejevas)', url: 'https://github.com/wooorm/dictionaries/tree/main/dictionaries/lt', licentie: 'BSD 3-Clause' }, toetsenbord: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] },
  el: { native: 'Ελληνικά', english: 'Greek', locale: 'el-GR', schrift: 'grieks', alfabet: 'αβγδεζηθικλμνξοπρστυφχψω', klinkers: 'αεηιουω', speciaal: [], woordenlijst: { naam: 'Greek dictionary (Stavropoulos)', url: 'http://elspell.math.upatras.gr', licentie: 'GPL 2 / LGPL 2.1 / MPL 1.1' }, toetsenbord: ['ΕΡΤΥΘΙΟΠ', 'ΑΣΔΦΓΗΞΚΛ', 'ΖΧΨΩΒΝΜ'] },
  bg: { native: 'Български', english: 'Bulgarian', locale: 'bg-BG', schrift: 'cyrillisch', alfabet: 'абвгдежзийклмнопрстуфхцчшщъьюя', klinkers: 'аеиоуъюя', speciaal: [['ѝ', 'и'], ['ѐ', 'е']], woordenlijst: { naam: 'bgOffice', url: 'http://bgoffice.sourceforge.net', licentie: 'GPL 2 / LGPL 2.1 / MPL 1.1' }, toetsenbord: ['ЯВЕРТЪУИОП', 'АСДФГХЙКЛШ', 'ЗЬЦЖБНМЧЩЮ'] },
};

export const TAAL_IDS = Object.keys(TALEN);
export const STANDAARD_TAAL = 'en';
export const isTaal = (id) => Object.prototype.hasOwnProperty.call(TALEN, id);

// De talen die klaar zijn voor gebruik: alle teksten, Woordtuin, Woordzoeker en Kruiswoord zijn er, gecontroleerd en beoordeeld. De app herkent en biedt
// alleen deze aan. Een taal komt er pas bij als alles van die taal klaar is; tests/talen.test.mjs controleert dat ze echt compleet zijn.
export const KLAAR = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'pl'];
export const isKlaar = (id) => KLAAR.includes(id);

// Streepjes en tekens op letters weghalen. Cyrillisch niet: daar zijn "й" en "и" echt verschillende letters.
function zonderTekens(s, schrift) {
  return schrift === 'cyrillisch' ? s : s.normalize('NFD').replace(/\p{M}/gu, '');
}

// Een woord voor het bord: kleine letters, zonder accenten. Letters die niet in het alfabet van de taal passen blijven staan
// (zo ziet `geldigWoord` dat het woord niet kan).
export function vouw(woord, taal) {
  const t = TALEN[taal];
  if (!t) throw new Error(`Onbekende taal: ${taal}`);
  let s = String(woord).normalize('NFC').toLowerCase();
  for (const [van, naar] of t.speciaal) s = s.split(van).join(naar);
  s = zonderTekens(s, t.schrift);
  if (t.schrift === 'grieks') s = s.replace(/ς/g, 'σ');
  return s;
}

// Bestaat het woord alleen uit letters van het alfabet van deze taal?
const ALFABETSET = Object.fromEntries(Object.entries(TALEN).map(([id, t]) => [id, new Set(t.alfabet)]));
export const isAlfabet = (s, taal) => s.length > 0 && [...s].every((c) => ALFABETSET[taal].has(c));

// Wat iemand typt omzetten in letters voor het bord: gevouwen, en alles wat geen letter van de taal is eruit (spaties, cijfers, leestekens).
export function typInvoer(tekst, taal) {
  const t = TALEN[taal];
  return [...vouw(tekst, taal)].filter((c) => ALFABETSET[taal].has(c)).join('');
}

// ----- Welke taal spreekt deze bezoeker? -----
// `voorkeuren` is navigator.languages ("nl-BE", "en-US", ...). De eerste voorkeur die we hebben (en die klaar is) wint. Geen enkele? Dan null:
// de app vraagt het dan. Een paar vaste vertalingen: Noors heet "no", "nb" of "nn" (we hebben bokmål).
const ALIAS = { no: 'nb', nn: 'nb' };
export function herkenTaal(voorkeuren = [], beschikbaar = KLAAR) {
  for (const v of voorkeuren) {
    const basis = String(v || '').toLowerCase().split(/[-_]/)[0];
    const id = ALIAS[basis] || basis;
    if (beschikbaar.includes(id)) return id;
  }
  return null;
}
