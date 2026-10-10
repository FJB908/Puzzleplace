// Wachtwoorden, sessies en codes. Alleen ingebouwde Node-functies, geen pakketten.
//
// - Wachtwoorden en herstelcodes worden nooit bewaard, alleen een scrypt-hash met een eigen "zout".
// - Sessiesleutels worden als sha256-hash bewaard: wie de database leest, kan er niet mee inloggen.
// - Codes gebruiken letters en cijfers die je niet door elkaar haalt (geen I, L, O, 0 of 1).

import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash, randomInt } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 32;

export async function hashSecret(secret, salt = randomBytes(16)) {
  const key = await scrypt(secret.normalize('NFKC'), salt, KEYLEN, OPTS);
  return { salt: salt.toString('base64'), hash: key.toString('base64') };
}

export async function verifySecret(secret, record) {
  const key = await scrypt(secret.normalize('NFKC'), Buffer.from(record.salt, 'base64'), KEYLEN, OPTS);
  const expected = Buffer.from(record.hash, 'base64');
  return expected.length === key.length && timingSafeEqual(expected, key);
}

// Een vaste "nep-hash": bij een onbekend e-mailadres rekenen we toch even, zodat je aan de
// reactietijd niet kunt zien of een adres bestaat.
export const DUMMY = { salt: Buffer.alloc(16, 1).toString('base64'), hash: Buffer.alloc(KEYLEN, 2).toString('base64') };

export const newToken = () => randomBytes(32).toString('base64url');
export const sha = (s) => createHash('sha256').update(String(s)).digest('base64url');
export const newId = () => randomBytes(9).toString('base64url');

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomChars(n) {
  let out = '';
  for (let i = 0; i < n; i++) out += ALPHABET[randomInt(ALPHABET.length)];   // randomInt is zonder scheefheid
  return out;
}

const group = (s, size) => s.match(new RegExp(`.{1,${size}}`, 'g')).join('-');

export const newFriendCode = () => group(randomChars(8), 4);       // bijv. K7P4-QM2X
export const newRecoveryCode = () => group(randomChars(12), 4);    // bijv. KR7P-4MQ2-X9TB

// Mensen typen codes met spaties, streepjes en kleine letters; maak daar één vorm van.
export const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const formatCode = (clean) => group(clean, 4);
