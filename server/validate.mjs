// Controles op wat mensen invullen. Elke fout is een korte zin in gewoon Nederlands.

import EN from '../js/i18n/talen/en.js';
import { zoek, invullen } from '../js/shared/opmaak.js';

// Een fout voor de speler. `key` verwijst naar een tekst in het taalpakket (err.<key>): de server stuurt de sleutel mee, de app
// vertaalt hem; `message` is dezelfde tekst in het Engels voor wie geen vertaling heeft (of niet in de app kijkt).
export const engelseTekst = (key, params) => invullen(zoek(EN, `err.${key}`, params, 'en') ?? key, params);
export class ApiError extends Error {
  constructor(status, code, key, params) { super(engelseTekst(key, params)); this.status = status; this.code = code; this.key = key; this.params = params || null; }
}
export const fail = (status, code, key, params) => { throw new ApiError(status, code, key, params); };

const CONTROL = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/;   // onzichtbare en omkerende tekens

export function cleanName(v) {
  const name = String(v ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 24) fail(400, 'naam', 'name.length');
  if (CONTROL.test(name)) fail(400, 'naam', 'name.chars');
  if (/[<>]/.test(name)) fail(400, 'naam', 'name.brackets');
  return name;
}

export function cleanEmail(v) {
  const email = String(v ?? '').trim().toLowerCase();
  if (email.length > 120 || !/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(email)) {
    fail(400, 'email', 'email.invalid');
  }
  return email;
}

export function cleanPassword(v, code = 'wachtwoord') {
  const pw = String(v ?? '');
  if (pw.length < 8) fail(400, code, 'password.short');
  if (pw.length > 128) fail(400, code, 'password.long');
  return pw;
}

export function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
