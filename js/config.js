// Centrale instellingen van het platform.
//
// FEATURES zijn schakelaars voor functies die er later bij komen. Zolang ze
// uit staan, ziet de gebruiker er niets van: geen lege knoppen of "binnenkort"
// die verwarren. Zet er één aan en het menu en de schermen verschijnen vanzelf.

import { t } from './i18n/index.js';

export const APP = {
  get name() { return t('app.name'); },
  version: '0.1.0',
};

// Accounts en vrienden gaan vanzelf aan zodra de app een server vindt (zie js/services/backend.js).
// Op een gewone website zonder server blijft alles verborgen en werkt de app gewoon zonder account.
export const FEATURES = {
  accounts: false,       // inloggen / account
  friends: false,        // vrienden
  emailCodes: false,     // codes per e-mail (wachtwoord vergeten): alleen als de server e-mail kan versturen (SMTP_URL, zie docs/ACCOUNTS.md)
  facebookLogin: false,  // "Doorgaan met Facebook": gaat vanzelf aan als de server een Facebook-app heeft (zie docs/ACCOUNTS.md)
};

// Waar de server staat. Leeg = op hetzelfde adres als de app (zo draait `npm run dev`).
// Staat de app op een andere plek dan de server, vul dan het volledige adres in, bijv. 'https://api.mijnapp.nl',
// en zet ALLOW_ORIGIN op de server. Dit staat bewust niet in te stellen via een link: anders zou iemand je
// kunnen laten inloggen op een andere server.
export const API_BASE = '';

// Het adres dat in een uitnodigingslink komt: de server als de app op een ander adres staat (zoals in de Capacitor-app, waar het adres van de app zelf https://localhost is), anders het adres van deze pagina.
export const inviteBase = () => (API_BASE ? `${API_BASE.replace(/\/+$/, '')}/` : `${location.origin}${location.pathname}`);

// Moeilijkheidsniveaus die elk spel standaard krijgt. Een spel kan eigen
// niveaus meegeven in de registry.
export const niveau = (id, hint) => ({ id, get label() { return t(`level.${id}`); }, get hint() { return hint(); } });
export const DIFFICULTIES = [
  niveau('makkelijk', () => t('level.default.makkelijk')),
  niveau('gemiddeld', () => t('level.default.gemiddeld')),
  niveau('moeilijk', () => t('level.default.moeilijk')),
];
