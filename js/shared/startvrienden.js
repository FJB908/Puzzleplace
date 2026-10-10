// Wie staat er op Start bij Vrienden? Zuivere functies (geen scherm), dus te testen.
// Eén rij per vriend, hooguit MAX_VRIENDEN, in volgorde van belang:
//   1. wie op jou wacht (de langst wachtende eerst)  2. vriendverzoeken  3. partijen waarin de ander aan de beurt is  4. de rest

export const MAX_VRIENDEN = 5;

// Wat er voor elke vriend te zien is, in volgorde van belang. Eén rij per vriend, hooguit MAX_VRIENDEN.
export function friendRows(me, data, partijen, locale = 'en') {
  const actief = partijen.filter((m) => m.status === 'active');
  const perVriend = new Map();
  for (const m of actief) {
    const other = m.players.find((p) => p.id !== me);
    if (!other?.id) continue;
    if (!perVriend.has(other.id)) perVriend.set(other.id, []);
    perVriend.get(other.id).push(m);
  }
  const knownFriends = new Map(data.friends.map((f) => [f.id, f]));
  const rows = [];
  for (const [id, list] of perVriend) {
    const friend = knownFriends.get(id);
    if (!friend) continue;                                           // een partij met iemand die geen vriend meer is
    const aanZet = list.filter((m) => m.yourTurn).sort((a, b) => a.updatedAt - b.updatedAt);
    const rest = list.filter((m) => !m.yourTurn).sort((a, b) => b.updatedAt - a.updatedAt);
    const first = aanZet[0] || rest[0];
    rows.push({ kind: aanZet.length ? 'beurt' : 'wacht', friend, match: first, aantal: list.length, rang: aanZet.length ? 0 : 2, since: first.updatedAt });
  }
  for (const p of data.incoming) rows.push({ kind: 'verzoek', friend: p, rang: 1, since: 0 });
  for (const f of data.friends) if (!perVriend.has(f.id)) rows.push({ kind: 'vrij', friend: f, rang: 3, since: 0 });
  rows.sort((a, b) => a.rang - b.rang || (a.rang === 0 ? a.since - b.since : a.rang === 2 ? b.since - a.since : (b.friend.lastSeen || '').localeCompare(a.friend.lastSeen || '') || a.friend.name.localeCompare(b.friend.name, locale)));
  return { rows: rows.slice(0, MAX_VRIENDEN), meer: Math.max(0, rows.length - MAX_VRIENDEN), totaal: data.friends.length };
}

export const stand = (m, me) => {
  const s = m.summary?.scores;
  if (!s) return '';
  const mijn = s[me], hun = Object.entries(s).find(([id]) => id !== me)?.[1];
  return hun == null || mijn + hun === 0 ? '' : `${mijn}–${hun}`;
};


// De taal van een partij als die niet de taal van de app is (dan zie je bij de partij erbij in welke taal er gespeeld wordt), anders ''.
// Partijen van voor de meertaligheid hebben geen taal en zijn Nederlands.
export const partijTaal = (m, uiTaal) => {
  const taal = m.config?.lang ?? 'nl';
  return taal === uiTaal ? '' : taal;
};
