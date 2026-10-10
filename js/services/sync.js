// Je voortgang op al je apparaten. Bij inloggen halen we de voortgang van de server op en voegen die
// samen met die op dit apparaat (zie js/shared/merge.js); daarna houden we alles bij.
// Er gaat nooit voortgang verloren: bij twijfel blijft het spel dat het laatst is gespeeld.

import { api, ApiFail } from './backend.js';
import { t, foutTekst } from '../i18n/index.js';
import * as store from '../store.js';
import * as auth from './auth.js';
import { mergeSnapshots, sameSnapshot } from '../shared/merge.js';

let status = { state: 'uit', at: null, error: '' };       // uit | bezig | ok | fout
let busy = false, again = false, timer = null, importing = false;
const listeners = new Set();
export const getStatus = () => status;
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const setStatus = (s) => { status = s; listeners.forEach((fn) => fn(status)); };

export async function syncNow() {
  if (!auth.getUser()) { setStatus({ state: 'uit', at: null, error: '' }); return; }
  if (busy) { again = true; return; }
  busy = true; setStatus({ ...status, state: 'bezig' });
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const remote = await api('GET', '/api/sync');
      const local = store.exportSync();
      const merged = mergeSnapshots(local, remote.data);
      if (!sameSnapshot(merged, local)) { importing = true; store.importSync(merged); importing = false; }
      if (remote.data && sameSnapshot(merged, remote.data)) { setStatus({ state: 'ok', at: Date.now(), error: '' }); return; }
      try { await api('PUT', '/api/sync', { baseVersion: remote.version, data: merged }); setStatus({ state: 'ok', at: Date.now(), error: '' }); return; }
      catch (e) { if (!(e instanceof ApiFail) || e.status !== 409) throw e; }      // intussen veranderd op een ander apparaat: opnieuw samenvoegen
    }
    throw new ApiFail(409, 'versie', t('err.syncFailed'), 'syncFailed');
  } catch (e) {
    setStatus({ state: 'fout', at: status.at, error: foutTekst(e) });
  } finally {
    busy = false;
    if (again) { again = false; schedule(500); }
  }
}

function schedule(ms = 4000) { clearTimeout(timer); timer = setTimeout(syncNow, ms); }

export function init() {
  store.subscribe(() => { if (!importing && auth.getUser()) schedule(); });        // na een rustig moment, niet bij elke zet
  document.addEventListener('visibilitychange', () => { if (document.hidden && auth.getUser()) syncNow(); });
  window.addEventListener('online', () => { if (auth.getUser()) schedule(500); });
  let was = auth.getUser()?.id;
  auth.subscribe(({ user }) => { if (user && user.id !== was) schedule(200); if (!user) setStatus({ state: 'uit', at: null, error: '' }); was = user?.id; });
  if (auth.getUser()) schedule(300);
}
