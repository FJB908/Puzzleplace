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

// De dagen die je hebt opgelost: alle dagen blijven, bij dezelfde dag de snelste tijd
function mergeDaily(a, b) {
  if (!a && !b) return null;
  const uit = {};
  for (const dag of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const x = a?.[dag], y = b?.[dag];
    uit[dag] = !x || !y ? { difficulty: (x || y).difficulty, time: (x || y).time ?? null } : { difficulty: x.difficulty, time: Math.min(x.time ?? Infinity, y.time ?? Infinity) === Infinity ? null : Math.min(x.time ?? Infinity, y.time ?? Infinity) };
  }
  return uit;
}

// Statistieken per niveau: de tellers van het apparaat met de meeste winsten (samen optellen zou dubbel tellen), de beste tijd is de snelste
function mergeStats(a, b) {
  if (!a && !b) return null;
  const uit = {};
  for (const niveau of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const x = a?.[niveau], y = b?.[niveau];
    if (!x || !y) { const z = x || y; uit[niveau] = { started: z.started ?? 0, won: z.won ?? 0, best: z.best ?? null, total: z.total ?? 0 }; continue; }
    const basis = (x.won ?? 0) >= (y.won ?? 0) ? x : y;
    const bests = [x.best, y.best].filter((v) => v != null);
    uit[niveau] = { started: Math.max(x.started ?? 0, y.started ?? 0), won: basis.won ?? 0, best: bests.length ? Math.min(...bests) : null, total: basis.total ?? 0 };
  }
  return uit;
}

function mergeGame(a = {}, b = {}) {
  const slots = {};
  for (const name of new Set([...Object.keys(a.slots || {}), ...Object.keys(b.slots || {})])) {
    const sa = a.slots?.[name] ?? null, sb = b.slots?.[name] ?? null;
    slots[name] = mergeSlot(sa, sb);
  }
  const newest = later(Object.values(a.slots || {}).filter(Boolean).reduce((x, y) => later(x, y), null), Object.values(b.slots || {}).filter(Boolean).reduce((x, y) => later(x, y), null));
  const fromNewest = newest && (a.slots && Object.values(a.slots).includes(newest) ? a : b);
  const uit = {
    difficulty: fromNewest?.difficulty ?? a.difficulty ?? b.difficulty ?? 'makkelijk',
    completed: Math.max(a.completed || 0, b.completed || 0),
    dailyDone: [a.dailyDone, b.dailyDone].filter(Boolean).sort().pop() ?? null,
    slots,
  };
  const daily = mergeDaily(a.daily, b.daily), stats = mergeStats(a.stats, b.stats);
  if (daily) uit.daily = daily;
  if (stats) uit.stats = stats;
  return uit;
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
