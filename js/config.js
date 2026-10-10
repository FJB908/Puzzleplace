// Centrale instellingen van het platform.
//
// FEATURES zijn schakelaars voor functies die er later bij komen. Zolang ze
// uit staan, ziet de gebruiker er niets van: geen lege knoppen of "binnenkort"
// die verwarren. Zet er één aan en het menu en de schermen verschijnen vanzelf.

export const APP = {
  name: 'Puzzelplaats',
  version: '0.1.0',
};

// Accounts en vrienden gaan vanzelf aan zodra de app een server vindt (zie js/services/backend.js).
// Op een gewone website zonder server blijft alles verborgen en werkt de app gewoon zonder account.
export const FEATURES = {
  accounts: false,       // inloggen / account
  friends: false,        // vrienden
  facebookLogin: false,  // "Doorgaan met Facebook": gaat vanzelf aan als de server een Facebook-app heeft (zie docs/ACCOUNTS.md)
};

// Waar de server staat. Leeg = op hetzelfde adres als de app (zo draait `npm run dev`).
// Staat de app op een andere plek dan de server, vul dan het volledige adres in, bijv. 'https://api.mijnapp.nl',
// en zet ALLOW_ORIGIN op de server. Dit staat bewust niet in te stellen via een link: anders zou iemand je
// kunnen laten inloggen op een andere server.
export const API_BASE = '';

// Moeilijkheidsniveaus die elk spel standaard krijgt. Een spel kan eigen
// niveaus meegeven in de registry.
export const DIFFICULTIES = [
  { id: 'makkelijk', label: 'Makkelijk', hint: 'Rustig beginnen' },
  { id: 'gemiddeld', label: 'Gemiddeld', hint: 'Een leuke uitdaging' },
  { id: 'moeilijk',  label: 'Moeilijk',  hint: 'Voor ervaren puzzelaars' },
];
