// Twee versies van je voortgang samenvoegen (bijv. telefoon en tablet). Zuivere functie, dus goed te testen.
//
// Regels, bedoeld om nooit voortgang kwijt te raken:
//   - hoe vaak je een spel hebt opgelost: het hoogste getal wint
//   - dagpuzzel gedaan: de nieuwste datum wint
//   - een lopend spel: dat wat het laatst is gespeeld wint (per spel, per plek: gewoon of dagpuzzel);
//     een afgerond of weggegooid spel laat een wismarkering achter die op dezelfde manier meetelt
//   - je naam: die van het apparaat dat het laatst iets deed
// Instellingen zoals tekstgrootte horen bij het apparaat en worden niet samengevoegd.

const later = (a, b) => ((a?.updatedAt ?? 0) >= (b?.updatedAt ?? 0) ? a : b);

// Een plek is leeg, een wismarkering ({ cleared }, na afronden of weggooien) of een spel. De nieuwste wint, ook als dat
// een wismarkering is: zo komt een afgerond spel niet terug vanaf een apparaat dat het nog als lopend spel kent.
const mergeSlot = (a, b) => (!a || !b ? a || b : later(a, b));

function mergeGame(a = {}, b = {}) {
  const slots = {};
  for (const name of new Set([...Object.keys(a.slots || {}), ...Object.keys(b.slots || {})])) {
    const sa = a.slots?.[name] ?? null, sb = b.slots?.[name] ?? null;
    slots[name] = mergeSlot(sa, sb);
  }
  const newest = later(Object.values(a.slots || {}).filter(Boolean).reduce((x, y) => later(x, y), null), Object.values(b.slots || {}).filter(Boolean).reduce((x, y) => later(x, y), null));
  const fromNewest = newest && (a.slots && Object.values(a.slots).includes(newest) ? a : b);
  return {
    difficulty: fromNewest?.difficulty ?? a.difficulty ?? b.difficulty ?? 'makkelijk',
    completed: Math.max(a.completed || 0, b.completed || 0),
    dailyDone: [a.dailyDone, b.dailyDone].filter(Boolean).sort().pop() ?? null,
    slots,
  };
}

export function mergeSnapshots(local, remote) {
  if (!remote) return local;
  const games = {};
  for (const id of new Set([...Object.keys(local.games || {}), ...Object.keys(remote.games || {})])) {
    games[id] = mergeGame(local.games?.[id], remote.games?.[id]);
  }
  // het laatst gespeelde spel: wie de nieuwste stand heeft
  const stamp = (l) => (l && games[l.id]?.slots?.[l.slot]?.updatedAt) || 0;
  const lastGame = stamp(local.lastGame) >= stamp(remote.lastGame) ? local.lastGame ?? remote.lastGame ?? null : remote.lastGame;
  const newestSlot = (s) => Math.max(0, ...Object.values(s?.games || {}).flatMap((g) => Object.values(g.slots || {}).map((x) => x?.updatedAt || 0)));
  const profile = newestSlot(local) >= newestSlot(remote) ? { ...remote.profile, ...local.profile } : { ...local.profile, ...remote.profile };
  return { profile: { name: profile.name || '' }, games, lastGame };
}

// Is dit hetzelfde? (om onnodig opslaan te voorkomen)
export const sameSnapshot = (a, b) => JSON.stringify(a) === JSON.stringify(b);
