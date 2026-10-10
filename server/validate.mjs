// Controles op wat mensen invullen. Elke fout is een korte zin in gewoon Nederlands.

export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export const fail = (status, code, message) => { throw new ApiError(status, code, message); };

const CONTROL = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/;   // onzichtbare en omkerende tekens

export function cleanName(v) {
  const name = String(v ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 24) fail(400, 'naam', 'Kies een naam van 2 tot 24 tekens.');
  if (CONTROL.test(name)) fail(400, 'naam', 'Deze naam bevat tekens die niet kunnen.');
  if (/[<>]/.test(name)) fail(400, 'naam', 'Gebruik geen < of > in je naam.');
  return name;
}

export function cleanEmail(v) {
  const email = String(v ?? '').trim().toLowerCase();
  if (email.length > 120 || !/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(email)) {
    fail(400, 'email', 'Dit e-mailadres lijkt niet te kloppen. Het ziet er zo uit: naam@voorbeeld.nl');
  }
  return email;
}

export function cleanPassword(v, code = 'wachtwoord') {
  const pw = String(v ?? '');
  if (pw.length < 8) fail(400, code, 'Een wachtwoord moet minstens 8 tekens hebben. Tip: drie woorden achter elkaar, zoals rozen-molen-zomer.');
  if (pw.length > 128) fail(400, code, 'Dit wachtwoord is te lang (maximaal 128 tekens).');
  return pw;
}

export function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
