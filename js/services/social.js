// Vrienden en samen spelen: nu nog een lege laag (FEATURES.friends).
//
// Contract voor later (vereist een ingelogde gebruiker, zie auth.js):
//   listFriends()            -> [{ id, name, lastSeen }]
//   invite(contact)          -> Promise<void>      (via e-mail of deelknop)
//   respond(inviteId, ok)    -> Promise<void>
//   shareResult(gameId, r)   -> Promise<void>      ("Ik heb de sudoku van vandaag opgelost")
//
// Bewust simpel: geen openbare ranglijsten of chat. Alleen mensen die je zelf kent.

export async function listFriends() { return []; }
export async function invite() { throw new Error('Vrienden is nog niet beschikbaar.'); }
export async function respond() { throw new Error('Vrienden is nog niet beschikbaar.'); }
export async function shareResult() { /* later */ }
