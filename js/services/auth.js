// Account: aanmelden, inloggen, herstellen. De schermen praten alleen met dit bestand.
//
// Je blijft ingelogd op dit apparaat (de sleutel staat in de opslag van de browser). Op een gedeelde
// computer log je uit; dat staat duidelijk bij Account.

import { api, getToken, setToken, on, hasBackend } from './backend.js';

let user = null;
let counts = { incoming: 0, yourTurn: 0 };
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn({ user, counts }));

export const getUser = () => user;
export const getCounts = () => counts;
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

function set(u, c) { user = u; if (c) counts = c; if (!u) counts = { incoming: 0, yourTurn: 0 }; notify(); }

// Bij het starten: ben je nog ingelogd?
export async function restore() {
  if (!hasBackend() || !getToken()) { set(null); return null; }
  try {
    const r = await api('GET', '/api/me', undefined, { quiet: true });
    set(r.user, r.counts);
  } catch (e) {
    if (e.status === 401) { setToken(''); set(null); }          // sleutel verlopen
    // geen verbinding: je blijft ingelogd; we laten het voor wat het is
  }
  return user;
}

export async function refresh() {
  if (!user) return;
  try { const r = await api('GET', '/api/me', undefined, { quiet: true }); set(r.user, r.counts); } catch { /* volgende keer */ }
}

export async function signUp({ name, email, password }) {
  const r = await api('POST', '/api/signup', { name, email, password });
  setToken(r.token); set(r.user, { incoming: 0, yourTurn: 0 });
  return { user: r.user, recoveryCode: r.recoveryCode };
}

export async function signIn({ email, password }) {
  const r = await api('POST', '/api/login', { email, password });
  setToken(r.token); set(r.user);
  await refresh();
  return r.user;
}

export async function recover({ email, recoveryCode, password }) {
  const r = await api('POST', '/api/recover', { email, recoveryCode, password });
  setToken(r.token); set(r.user);
  return { user: r.user, recoveryCode: r.recoveryCode };
}

export async function signOut() {
  try { await api('POST', '/api/logout', {}, { quiet: true }); } catch { /* ook zonder verbinding uitloggen op dit apparaat */ }
  setToken(''); set(null);
}

export async function rename(name) { const r = await api('PATCH', '/api/me', { name }); set(r.user); return r.user; }
export const changePassword = (password, newPassword) => api('POST', '/api/me/password', { password, newPassword });
export async function newFriendCode() { const r = await api('POST', '/api/me/code', {}); set(r.user); return r.user.code; }
export async function deleteAccount(password) { await api('DELETE', '/api/me', { password }); setToken(''); set(null); }

on((event) => { if (event === 'uitgelogd') set(null); });     // de server zegt dat je sleutel niet meer geldt
