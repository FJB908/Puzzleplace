// Welk e-mailadres je op dit apparaat hebt gebruikt, zodat het bij inloggen al klaarstaat (als suggestie in het veld).
// Dit blijft op dit apparaat: het gaat nergens heen. Bij "alles op dit apparaat wissen" en bij account verwijderen verdwijnt het.

const KEY = 'puzzelplaats:emails';
const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; } };

export const remembered = () => read();
export function remember(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return;
  try { localStorage.setItem(KEY, JSON.stringify([e, ...read().filter((x) => x !== e)].slice(0, 3))); } catch { /* niet erg */ }
}
export const forgetAll = () => { try { localStorage.removeItem(KEY); } catch { /* niet erg */ } };
