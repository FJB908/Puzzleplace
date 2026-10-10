// Centrale instellingen van het platform.
//
// FEATURES zijn schakelaars voor functies die er later bij komen. Zolang ze
// uit staan, ziet de gebruiker er niets van: geen lege knoppen of "binnenkort"
// die verwarren. Zet er één aan en het menu en de schermen verschijnen vanzelf.

export const APP = {
  name: 'Puzzelplaats',
  version: '0.1.0',
};

export const FEATURES = {
  accounts: false,       // inloggen / account (zie js/services/auth.js)
  friends: false,        // vrienden en samen spelen (zie js/services/social.js)
  facebookLogin: false,  // "Doorgaan met Facebook" (vereist accounts)
};

// Moeilijkheidsniveaus die elk spel standaard krijgt. Een spel kan eigen
// niveaus meegeven in de registry.
export const DIFFICULTIES = [
  { id: 'makkelijk', label: 'Makkelijk', hint: 'Rustig beginnen' },
  { id: 'gemiddeld', label: 'Gemiddeld', hint: 'Een leuke uitdaging' },
  { id: 'moeilijk',  label: 'Moeilijk',  hint: 'Voor ervaren puzzelaars' },
];
