// Opslag op het apparaat (localStorage). Valt netjes terug op geheugen als
// opslaan niet kan (bijv. privévenster), zodat de app altijd blijft werken.
//
// Vorm van de data (versie 1):
//   profile:  { name }
//   settings: { textSize, theme, contrast, calm, decor, welcomeDone }
//   games:    { [gameId]: { difficulty, completed, dailyDone, slots: { normal, 'daily:JJJJ-MM-DD' }, stats?, daily? } }
//             stats: { [niveau]: { started, won, best, total } }   (beste tijd en totaal in seconden; alleen spellen met een tijd, zoals Sudoku)
//             daily: { [JJJJ-MM-DD]: { time, difficulty } }         (de dagen die je hebt opgelost: het archief van de puzzel van de dag)
//   lastGame: { id, slot } | null
//   steun:    { sinds, supporter, nee, laatsteVraag }   (zie js/steun/: sinds = eerste gebruik, supporter = de eenmalige bijdrage is gedaan, nee/laatsteVraag = hoe vaak "Nu niet" is gekozen)
//             Dit hoort bij het apparaat (en bij de winkelaccount), niet bij je voortgang: het gaat dus nooit mee met synchroniseren.
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
  steun: { sinds: null, supporter: false, nee: 0, laatsteVraag: null },
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
        steun: { ...base.steun, ...saved.steun },
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
  if (slot === 'daily' && s.day !== todayKey()) return null;     // (oude vorm) de dagpuzzel van gisteren telt niet meer mee; nieuwe plekken heten 'daily:JJJJ-MM-DD' en horen bij hun eigen dag
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
  const steun = data.steun;                               // en wie de app heeft gesteund, blijft Supporter (dat is betaald)
  data = defaults();
  data.settings.taal = taal;
  data.steun = { ...steun, nee: 0, laatsteVraag: null };
  persist();
}

// ----- Steun (extra tips, de eenmalige bijdrage) -----
export const getSteun = () => data.steun;
export const setSteun = (patch) => { Object.assign(data.steun, patch); persist(); };
// Hoeveel spellen er in totaal zijn uitgespeeld (over alle spellen)
export const totalCompleted = () => Object.values(data.games).reduce((n, g) => n + (g.completed || 0), 0);

// ----- Statistieken en het archief van de puzzel van de dag -----
export const dailySlot = (day) => `daily:${day}`;
export const isDailySlot = (slot) => slot === 'daily' || String(slot).startsWith('daily:');
export const slotDay = (slot, s) => (String(slot).startsWith('daily:') ? String(slot).slice(6) : s?.day ?? null);

// Een spel is begonnen (telt mee voor "gespeeld")
export function countStart(id, difficulty) {
  updateGame(id, (r) => { r.stats ||= {}; const s = (r.stats[difficulty] ||= { started: 0, won: 0, best: null, total: 0 }); s.started++; });
}

// Een spel is gewonnen met een tijd (in seconden). Geeft terug wat er nieuw is: { record, previous, best, won, average }.
// Een dagpuzzel die je al eerder had opgelost telt niet nog eens mee (alleen een snellere tijd wordt bewaard).
export function recordWin(id, { difficulty, time, day = null }) {
  let info = null;
  updateGame(id, (r) => {
    r.stats ||= {}; r.daily ||= {};
    const s = (r.stats[difficulty] ||= { started: 0, won: 0, best: null, total: 0 });
    const eerder = day ? r.daily[day] : null;
    if (day) r.daily[day] = { difficulty, time: eerder ? Math.min(eerder.time ?? time, time) : time };
    if (eerder) { info = { record: false, previous: s.best, best: s.best, won: s.won, average: s.won ? Math.round(s.total / s.won) : time, repeat: true }; return; }
    const previous = s.best;
    s.won++; s.total += time;
    const record = previous == null || time < previous;
    if (record) s.best = time;
    info = { record, previous, best: s.best, won: s.won, average: Math.round(s.total / s.won), repeat: false };
  });
  return info;
}
export const getStats = (id) => getGame(id).stats || {};
export const getDaily = (id) => getGame(id).daily || {};

// ----- Hulpjes voor datums -----
export const todayKey = () => new Date().toLocaleDateString('sv-SE'); // JJJJ-MM-DD, lokale tijd
