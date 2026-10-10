// Vrienden. Je voegt iemand toe met zijn of haar vriendencode; geen zoeken op namen, dus geen vreemden.

import { api } from './backend.js';
import * as auth from './auth.js';

let cache = { friends: [], incoming: [], outgoing: [] };
let loaded = false;
const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const cached = () => cache;
export const isLoaded = () => loaded;

export async function list() {
  cache = await api('GET', '/api/friends');
  loaded = true;
  listeners.forEach((fn) => fn(cache));
  return cache;
}

export const lookup = (code) => api('GET', `/api/users/by-code/${encodeURIComponent(code)}`);

export async function request(code) {
  const r = await api('POST', '/api/friends/request', { code });
  await list(); auth.refresh();
  return r;
}
export async function accept(id) { await api('POST', `/api/friends/${id}/accept`, {}); await list(); auth.refresh(); }
export async function decline(id) { await api('POST', `/api/friends/${id}/decline`, {}); await list(); auth.refresh(); }
export async function remove(id) { await api('DELETE', `/api/friends/${id}`); await list(); auth.refresh(); }

// Andere persoon (of uitgelogd): niets van de vorige lijst laten zien
let lastUser = auth.getUser()?.id ?? null;
auth.subscribe(({ user }) => {
  const id = user?.id ?? null;
  if (id === lastUser) return;
  lastUser = id;
  cache = { friends: [], incoming: [], outgoing: [] }; loaded = false;
  listeners.forEach((fn) => fn(cache));
});

// Iedere minuut kijken of er nieuws is (verzoeken, straks beurten), alleen als je ingelogd bent en de app open staat.
let timer = null;
export function startPolling() {
  if (timer) return;
  const tick = () => { if (auth.getUser() && !document.hidden) auth.refresh(); };
  timer = setInterval(tick, 60_000);
  document.addEventListener('visibilitychange', tick);
}
