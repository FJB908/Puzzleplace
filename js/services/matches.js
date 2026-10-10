// Partijen met een vriend (spelen om beurten). De schermen praten alleen met dit bestand.
// De server bewaakt wie er aan de beurt is; hier houden we alleen een lijstje bij voor in de schermen.

import { api } from './backend.js';
import * as auth from './auth.js';

let cache = [];
let loaded = false;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(cache));
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const cached = () => cache;
export const isLoaded = () => loaded;

export async function list() {
  const r = await api('GET', '/api/matches');
  cache = r.matches; loaded = true; notify();
  return cache;
}

export async function create(friendId, game, config = {}) {
  const r = await api('POST', '/api/matches', { with: friendId, game, config });
  list().catch(() => {}); auth.refresh();
  return r.match;
}

// since: de versie die je al hebt. Is er niets nieuws, dan komt er { unchanged: true } terug.
export async function get(id, since) {
  const r = await api('GET', `/api/matches/${encodeURIComponent(id)}${since ? `?since=${since}` : ''}`, undefined, { quiet: true });
  return r.unchanged ? null : r.match;
}

export async function move(id, version, move) {
  const r = await api('POST', `/api/matches/${encodeURIComponent(id)}/move`, { version, move });
  list().catch(() => {}); auth.refresh();
  return r.match;
}

export async function resign(id) {
  const r = await api('POST', `/api/matches/${encodeURIComponent(id)}/resign`, {});
  list().catch(() => {}); auth.refresh();
  return r.match;
}

// De lijst bijhouden: bij inloggen laden, en opnieuw als er iets verandert aan wie er aan de beurt is.
let started = false;
export function init() {
  if (started) return;
  started = true;
  let lastTurn = null, lastUser = null;
  if (auth.getUser()) { lastUser = auth.getUser().id; lastTurn = auth.getCounts().yourTurn; list().catch(() => {}); }
  auth.subscribe(({ user, counts }) => {
    if (!user) { cache = []; loaded = false; lastTurn = null; lastUser = null; notify(); return; }
    if (user.id !== lastUser || counts.yourTurn !== lastTurn) { lastUser = user.id; lastTurn = counts.yourTurn; list().catch(() => {}); }
  });
}

// Wie van de twee is mijn tegenstander in deze partij?
export const opponentOf = (match, myId) => match.players.find((p) => p.id !== myId) || null;
