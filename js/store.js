// Opslag op het apparaat (localStorage). Valt netjes terug op geheugen als
// opslaan niet kan (bijv. privévenster), zodat de app altijd blijft werken.
//
// Vorm van de data (versie 1):
//   profile:  { name }
//   settings: { textSize, theme, contrast, calm, decor, welcomeDone }
//   games:    { [gameId]: { difficulty, completed, dailyDone, slots: { normal, daily } } }
//   lastGame: { id, slot } | null
//
// Een "slot" is een bewaard spel: { seed, difficulty, state, updatedAt, progress?, day? }, of een wismarkering { cleared: true, updatedAt }.
// Later kan een account deze hele structuur synchroniseren (services/sync.js).

const KEY = 'puzzelplaats:v1';

const defaults = () => ({
  v: 1,
  profile: { name: '' },
  settings: { textSize: 'normal', theme: 'auto', contrast: 'normal', calm: false, decor: true, welcomeDone: false, taal: null },
  games: {},
  lastGame: null,
});

let data = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const base = defaults();
      return {
        ...base, ...saved,
        profile: { ...base.profile, ...saved.profile },
        settings: { ...base.settings, ...saved.settings },
        games: saved.games || {},
      };
    }
  } catch { /* kapotte of geblokkeerde opslag: begin opnieuw */ }
  return defaults();
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* geheugen volstaat */ }
  listeners.forEach((fn) => fn(data));
}

export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const snapshot = () => data;

// ----- Profiel & instellingen -----
export const getSettings = () => data.settings;
export const setSetting = (key, value) => { data.settings[key] = value; persist(); };
export const getName = () => data.profile.name;
export const setName = (name) => { data.profile.name = name.trim().slice(0, 30); persist(); };

// ----- Spellen -----
export function getGame(id) {
  return data.games[id] || { difficulty: 'makkelijk', completed: 0, dailyDone: null, slots: {} };
}

export function updateGame(id, fn) {
  const rec = getGame(id);
  fn(rec);
  data.games[id] = rec;
  persist();
}

export const getLastGame = () => data.lastGame;
export const setLastGame = (id, slot) => { data.lastGame = { id, slot }; persist(); };

// Het bewaarde spel op een plek (gewoon of dagpuzzel), of null. Een weggegooid of afgerond spel laat een "wismarkering"
// achter ({ cleared, updatedAt }) in plaats van niets: anders zou synchroniseren het oude spel van een ander apparaat
// terugzetten. Lees een plek dus altijd hiermee en nooit rechtstreeks uit `slots`.
export function getSlot(id, slot = 'normal') {
  const s = getGame(id).slots[slot];
  if (!s || s.cleared) return null;
  if (slot === 'daily' && s.day !== todayKey()) return null;     // de dagpuzzel van gisteren telt niet meer mee
  return s;
}
export const clearedSlot = () => ({ cleared: true, updatedAt: Date.now() });

// Een bewaard spel dat echt is begonnen (er is voortgang).
export const hasProgress = (id, slot = 'normal') => getSlot(id, slot)?.state != null;

// Voor synchronisatie met andere apparaten: alleen je voortgang en naam, nooit instellingen
export const exportSync = () => JSON.parse(JSON.stringify({ profile: { name: data.profile.name }, games: data.games, lastGame: data.lastGame }));

export function importSync(snapshot) {
  data.profile.name = snapshot.profile?.name || data.profile.name;
  data.games = snapshot.games || {};
  data.lastGame = snapshot.lastGame ?? null;
  persist();
}

export function resetAll() {
  const taal = data.settings.taal ?? null;                // de gekozen taal blijft: anders moet je haar opnieuw kiezen
  data = defaults();
  data.settings.taal = taal;
  persist();
}

// ----- Hulpjes voor datums -----
export const todayKey = () => new Date().toLocaleDateString('sv-SE'); // JJJJ-MM-DD, lokale tijd
