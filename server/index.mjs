// De server: dient de app zelf en de API (/api/...) vanaf hetzelfde adres. Zonder externe pakketten.
//
//   node server/index.mjs                      start op http://127.0.0.1:8000
//   PORT=3000 HOST=0.0.0.0 node server/index.mjs
//
// Instellingen (omgevingsvariabelen):
//   PORT          poort (standaard 8000)
//   HOST          adres (standaard 127.0.0.1; zet 0.0.0.0 om er van buiten bij te kunnen)
//   DATA_DIR      waar de gegevens staan (standaard server/data)
//   ALLOW_ORIGIN  alleen nodig als de app op een ANDER adres staat dan de server (bijv. https://mijnapp.nl, of voor Capacitor: https://localhost,capacitor://localhost)
//   TRUST_PROXY   zet op 1 als de server achter een proxy staat die X-Forwarded-For meegeeft
//   SMTP_URL, MAIL_FROM   e-mail voor de codes bij "wachtwoord vergeten" en "wachtwoord veranderen" (zie docs/ACCOUNTS.md). Zonder SMTP_URL wordt er niets verstuurd: de mail verschijnt in dit venster.
//   FCM_SERVICE_ACCOUNT (of FCM_SERVICE_ACCOUNT_FILE)   pushmeldingen "jij bent aan de beurt" naar de app (zie docs/ANDROID.md); zonder sleutel verschijnen ze in dit venster
//   FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, PUBLIC_URL   zet je deze alle drie, dan verschijnt "Doorgaan met Facebook" (zie docs/ACCOUNTS.md)

import { createServer as httpServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, normalize, extname, sep } from 'node:path';
import { Db, SqliteDb, dagelijkseBackup } from './db.mjs';
import { createApi } from './api.mjs';
import { createMailer } from './mail.mjs';
import { createPush, leesServiceAccount } from './push.mjs';
import { laadInstellingen } from './instellingen.mjs';
import { engelseTekst } from './validate.mjs';
import { GAMES } from './games/index.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ALLOWED = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'assets', 'icons', 'dist'];   // alleen dit is openbaar

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
};

const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

export function createApp({ dataFile = null, root = ROOT, allowOrigin = '', trustProxy = false, games = GAMES, api: apiOptions = {} } = {}) {
  // Een bestand dat op .sqlite eindigt is een SQLite-database (met een oud .json ernaast wordt dat eenmalig overgenomen); anders één JSON-bestand
  const db = dataFile?.endsWith('.sqlite') ? new SqliteDb(dataFile, { migrateFrom: dataFile.replace(/\.sqlite$/, '.json') }) : new Db(dataFile);
  const api = createApi({ db, games, ...apiOptions });

  const baseHeaders = {
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  function send(res, status, body, headers = {}) {
    res.writeHead(status, { ...baseHeaders, ...headers });
    res.end(body);
  }

  function readBody(req, limit) {
    return new Promise((resolve, reject) => {
      const chunks = []; let size = 0, tooBig = false;
      // Te groot: niets meer bewaren (dus geen geheugen vol), de rest wordt weggegooid en de verbinding gaat daarna dicht
      req.on('data', (c) => {
        size += c.length;
        if (tooBig) return;
        if (size > limit) { tooBig = true; chunks.length = 0; reject(Object.assign(new Error('te groot'), { status: 413 })); } else chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  const clientIp = (req) => (trustProxy && req.headers['x-forwarded-for']) ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress || '?';

  async function handleApi(req, res, url) {
    const cors = {};
    const origin = req.headers.origin;
    const toegestaan = String(allowOrigin || '').split(',').map((x) => x.trim()).filter(Boolean);        // meer adressen mag, door komma's gescheiden (bijv. de Android- en iOS-app)
    if (origin && toegestaan.includes(origin)) {
      Object.assign(cors, { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', 'Access-Control-Max-Age': '600' });
    }
    if (req.method === 'OPTIONS') return send(res, 204, '', cors);

    const json = (status, body) => send(res, status, JSON.stringify(body), { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });

    let body = {};
    if (req.method !== 'GET' && req.method !== 'DELETE' || (req.method === 'DELETE' && Number(req.headers['content-length']) > 0)) {
      let text;
      try { text = await readBody(req, url.pathname === '/api/sync' ? 1_000_000 : 64_000); }
      catch (e) {
        res.on('finish', () => req.socket.destroy());
        res.setHeader?.('Connection', 'close');
        return json(e.status || 400, { error: { code: 'groot', key: 'tooBig', message: engelseTekst('tooBig') } });
      }
      if (text) {
        try { body = JSON.parse(text); } catch { return json(400, { error: { code: 'json', key: 'badJson', message: engelseTekst('badJson') } }); }
      }
    }
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const out = await api.handle({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), body, token, ip: clientIp(req) });
    if (out.redirect) return send(res, 302, '', { ...cors, Location: out.redirect, 'Cache-Control': 'no-store' });
    return json(out.status, out.body);
  }

  async function handleStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Niet toegestaan', { Allow: 'GET, HEAD' });
    let rel;
    try { rel = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'Ongeldig adres'); }
    if (rel === '/') rel = '/index.html';
    if (rel.includes('\0') || rel.includes('\\')) return send(res, 400, 'Ongeldig adres');
    const clean = normalize(rel).replace(/^[/\\]+/, '');
    const top = clean.split(sep)[0].split('/')[0];
    if (!ALLOWED.includes(top) || clean.split(/[\\/]/).some((p) => p === '..' || p.startsWith('.'))) return send(res, 404, 'Niet gevonden');
    const file = join(root, clean);
    if (!file.startsWith(root)) return send(res, 404, 'Niet gevonden');
    try {
      const s = await stat(file);
      if (!s.isFile()) return send(res, 404, 'Niet gevonden');
      const data = req.method === 'HEAD' ? '' : await readFile(file);
      const headers = { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
      if (!clean.startsWith('dist')) headers['Content-Security-Policy'] = CSP;       // het losse bestand heeft code erin en mag dat dus niet
      return send(res, 200, data, headers);
    } catch { return send(res, 404, 'Niet gevonden'); }
  }

  const server = httpServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
      else await handleStatic(req, res, url);
    } catch (e) {
      console.error('Fout in de server:', e);
      if (!res.headersSent) send(res, 500, 'Er ging iets mis');
      else res.end();
    }
  });
  const sweep = setInterval(() => api.limiter.sweep(), 600_000); sweep.unref();
  server.on('close', () => { clearInterval(sweep); db.flush(); db.close?.(); });
  return { server, db, api };
}

// Starten vanaf de opdrachtregel
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  laadInstellingen();                                                  // het bestand .env (als het er is) vult de instellingen aan
  const port = Number(process.env.PORT || 8000), host = process.env.HOST || '127.0.0.1';
  const dataDir = process.env.DATA_DIR || fileURLToPath(new URL('./data/', import.meta.url));
  const { FACEBOOK_APP_ID: appId, FACEBOOK_APP_SECRET: appSecret } = process.env;
  const publicUrl = (process.env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, '');
  const facebook = appId && appSecret ? { appId, appSecret, publicUrl } : null;
  const { server, db } = createApp({ dataFile: join(dataDir, 'db.sqlite'), allowOrigin: process.env.ALLOW_ORIGIN || '', trustProxy: process.env.TRUST_PROXY === '1', api: { facebook, mailer: createMailer({ url: process.env.SMTP_URL || '', from: process.env.MAIL_FROM || '' }), push: createPush({ serviceAccount: leesServiceAccount() }) } });
  // Een back-up per dag (de laatste 7 blijven), bij het starten en daarna elke 24 uur
  const backupMap = join(dataDir, 'backups');
  const backup = () => { try { dagelijkseBackup(db, backupMap); } catch (e) { console.error(`Back-up mislukt: ${e.message}`); } };
  backup(); setInterval(backup, 24 * 3600_000).unref();
  // Is de poort bezet? Zonder PORT probeert de server vanzelf de volgende (8001, 8002, ...); met PORT zegt hij het gewoon.
  let nu = port;
  const luister = () => server.listen(nu, host, () => console.log(`Puzzleplace draait op http://${host === '0.0.0.0' ? 'localhost' : host}:${nu}  (gegevens in ${dataDir})`));
  server.on('error', (e) => {
    if (e.code !== 'EADDRINUSE') throw e;
    if (!process.env.PORT && nu < port + 20) { console.log(`Poort ${nu} is bezet, ik probeer ${nu + 1}...`); nu++; luister(); return; }
    console.error(`\nPoort ${nu} is al in gebruik. Kies een andere:  PORT=${nu + 1} npm run server   (PowerShell:  $env:PORT=${nu + 1}; npm run server)\n`);
    process.exit(1);
  });
  luister();
  const stop = () => { db.flush(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 2000).unref(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
