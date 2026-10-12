// Pushmeldingen via Firebase Cloud Messaging (FCM), zonder extra pakketten: een JWT met de sleutel van je service-account
// (node:crypto) wordt ingewisseld voor een toegangssleutel, daarmee gaat elke melding naar de FCM HTTP v1-API.
//
//   FCM_SERVICE_ACCOUNT        de inhoud van het JSON-bestand van je Firebase service-account (Firebase-console >
//                              Projectinstellingen > Serviceaccounts > Nieuwe privésleutel genereren), als één regel of als base64
//   FCM_SERVICE_ACCOUNT_FILE   of: het pad naar dat bestand
//
// Zonder sleutel wordt er niets verstuurd: de melding komt in `outbox` en op het scherm van de server (handig om te testen).

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const b64url = (b) => Buffer.from(b).toString('base64url');

export function leesServiceAccount(env = process.env) {
  let ruw = env.FCM_SERVICE_ACCOUNT || '';
  if (!ruw && env.FCM_SERVICE_ACCOUNT_FILE) ruw = readFileSync(env.FCM_SERVICE_ACCOUNT_FILE, 'utf8');
  ruw = ruw.trim();
  if (!ruw) return null;
  if (!ruw.startsWith('{')) ruw = Buffer.from(ruw, 'base64').toString('utf8');
  const sa = JSON.parse(ruw);
  if (!sa.project_id || !sa.client_email || !sa.private_key) throw new Error('FCM_SERVICE_ACCOUNT mist project_id, client_email of private_key');
  return sa;
}

export function createPush({ serviceAccount = null, fcmUrl = 'https://fcm.googleapis.com', log = console.log, nu = Date.now, fetchFn = fetch } = {}) {
  const outbox = [];
  let sleutel = null;                                     // { token, tot }

  async function toegangssleutel() {
    if (sleutel && sleutel.tot - 60_000 > nu()) return sleutel.token;
    const sa = serviceAccount, iat = Math.floor(nu() / 1000), tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
    const kop = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: tokenUri, iat, exp: iat + 3600 }));
    const sign = createSign('RSA-SHA256'); sign.update(`${kop}.${claims}`);
    const jwt = `${kop}.${claims}.${sign.sign(sa.private_key, 'base64url')}`;
    const res = await fetchFn(tokenUri, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) throw new Error(`FCM-inloggen mislukt (${res.status}): ${json.error_description || json.error || ''}`);
    sleutel = { token: json.access_token, tot: nu() + (json.expires_in || 3600) * 1000 };
    return sleutel.token;
  }

  return {
    outbox, echt: !!serviceAccount,
    // Geeft { ok: true } of { ok: false, ongeldig: true } als het apparaat niet meer bestaat (dan kan het token weg) of gooit bij een tijdelijke fout
    async send(token, { title, body, data = {} }) {
      if (!serviceAccount) { outbox.push({ token, title, body, data }); log(`\n[pushmelding, niet verstuurd: FCM_SERVICE_ACCOUNT ontbreekt]\n  ${title}: ${body}  ${JSON.stringify(data)}\n`); return { ok: true }; }
      const auth = await toegangssleutel();
      const strings = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
      const res = await fetchFn(`${fcmUrl}/v1/projects/${serviceAccount.project_id}/messages:send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
        body: JSON.stringify({ message: { token, notification: { title, body }, data: strings, android: { priority: 'HIGH', notification: { channel_id: 'puzzleplace' } }, apns: { headers: { 'apns-priority': '10' } } } }),
      });
      if (res.ok) return { ok: true };
      const fout = await res.json().catch(() => ({}));
      const status = fout?.error?.status || '';
      if (res.status === 404 || status === 'NOT_FOUND' || status === 'UNREGISTERED' || (res.status === 400 && status === 'INVALID_ARGUMENT')) return { ok: false, ongeldig: true };
      throw new Error(`FCM ${res.status} ${status}: ${fout?.error?.message || ''}`);
    },
  };
}
