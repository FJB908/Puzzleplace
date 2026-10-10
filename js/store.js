// Opslag op het apparaat (localStorage). Valt netjes terug op geheugen als
// opslaan niet kan (bijv. privévenster), zodat de app altijd blijft werken.
//
// Vorm van de data (versie 1):
//   profile:  { name }
//   settings: { textSize, theme, contrast, calm, welcomeDone }
//   games:    { [gameId]: { difficulty, completed, dailyDone, slots: { normal, daily } } }
//   lastGame: { id, slot } | null
//
// Een "slot" is een bewaard spel: { seed, difficulty, state, updatedAt, day? }.
// Later kan een account deze hele structuur synchroniseren (services/sync.js).

const KEY = 'puzzelplaats:v1';

const defaults = () => ({
  v: 1,
  profile: { name: '' },
  settings: { textSize: 'normal', theme: 'auto', contrast: 'normal', calm: false, welcomeDone: false },
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

// Een bewaard spel dat echt is begonnen (er is voortgang).
export const hasProgress = (id, slot = 'normal') => getGame(id).slots[slot]?.state != null;

export function resetAll() {
  data = defaults();
  persist();
}

// ----- Hulpjes voor datums -----
export const todayKey = () => new Date().toLocaleDateString('sv-SE'); // JJJJ-MM-DD, lokale tijd
