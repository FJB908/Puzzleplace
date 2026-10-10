// Verbinding met de server. Alle andere onderdelen (inloggen, vrienden, synchroniseren) gebruiken alleen dit.
//
// De app vindt de server zelf: staat er op hetzelfde adres een server (/api/ping), dan gaan accounts en vrienden aan.
// Zo niet (gewone website, of het losse bestand), dan blijft alles verborgen.

import { API_BASE, FEATURES } from '../config.js';

const TOKEN_KEY = 'puzzelplaats:sessie';
const listeners = new Set();
let available = null;                       // null = nog niet gecontroleerd

export class ApiFail extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

// Het losse bestand (file://) heeft geen eigen adres: zonder API_BASE is er geen server
const base = API_BASE || (location.protocol === 'file:' ? null : '');

const get = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const getToken = get;
export function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* geheugen volstaat niet: dan blijf je alleen deze keer ingelogd */ memory = t; } }
let memory = '';
export const hasBackend = () => available === true;
export const backendKnown = () => available !== null;       // is er al gekeken of er een server is?

export const apiUrl = (path) => `${base ?? ''}${path}`;

export const on = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (event) => listeners.forEach((fn) => fn(event));

export async function detect() {
  if (base === null) { available = false; return false; }
  let facebook = false;
  try {
    const res = await fetch(`${base}/api/ping`, { signal: AbortSignal.timeout(2500), cache: 'no-store' });
    const json = res.ok ? await res.json() : null;
    available = json?.app === 'puzzelplaats' && json.accounts === true;
    facebook = available && json.facebook === true;
  } catch { available = false; }
  FEATURES.accounts = FEATURES.friends = available;
  FEATURES.facebookLogin = facebook;                       // alleen als de server een Facebook-app kent
  return available;
}

export async function api(method, path, body, { quiet = false } = {}) {
  if (base === null) throw new ApiFail(0, 'geen-server', 'Er is geen server beschikbaar.');
  const token = get() || memory;
  let res;
  try {
    res = await fetch(`${base}${path}`, {
      method, cache: 'no-store', signal: AbortSignal.timeout(20000),
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiFail(0, 'netwerk', 'Er is geen verbinding met de server. Controleer je internet en probeer het nog eens.');
  }
  let json = null;
  try { json = await res.json(); } catch { /* geen json */ }
  if (res.ok) return json;
  const err = json?.error || {};
  const fail = new ApiFail(res.status, err.code || 'fout', err.message || 'Er ging iets mis. Probeer het later nog eens.');
  fail.data = json;
  if (res.status === 401 && token && !quiet && !['inloggen', 'herstel', 'wachtwoord'].includes(fail.code)) { setToken(''); emit('uitgelogd'); }
  throw fail;
}
