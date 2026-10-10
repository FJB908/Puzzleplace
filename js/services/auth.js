// Aanmelden: nu nog een lege laag. Het platform werkt zonder account ("gast").
//
// Later invullen (FEATURES.accounts / FEATURES.facebookLogin in config.js):
//   - 'facebook'  via Firebase Authentication of een eigen backend
//   - 'email'     e-mail + wachtwoord of inloglink
// De schermen praten alleen met dit bestand, nooit rechtstreeks met een
// provider. Wisselen van provider raakt de schermen dus niet.
//
// Contract:
//   getUser()                -> { id, name, provider } | null
//   providers()              -> lijst met beschikbare manieren om in te loggen
//   signIn(providerId)       -> Promise<user>
//   signOut()                -> Promise<void>

let user = null;

export const getUser = () => user;

export const providers = () => [
  // { id: 'facebook', label: 'Doorgaan met Facebook' },
  // { id: 'email',    label: 'Doorgaan met e-mail' },
];

export async function signIn(/* providerId */) {
  throw new Error('Aanmelden is nog niet beschikbaar.');
}

export async function signOut() {
  user = null;
}
