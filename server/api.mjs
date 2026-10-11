// De hele server-logica, los van HTTP: een functie die een verzoek krijgt en een antwoord teruggeeft.
// Zo is alles direct te testen, en maakt het niet uit welke server er omheen staat.
//
// Wat erin zit: accounts (aanmelden, inloggen, herstellen), vrienden (met een vriendencode),
// synchronisatie van je voortgang tussen apparaten, en een algemene laag voor spellen met beurten.

import { hashSecret, verifySecret, DUMMY, newToken, sha, newId, newFriendCode, newRecoveryCode, cleanCode, formatCode } from './crypto.mjs';
import { createLimiter } from './ratelimit.mjs';
import { createMailer } from './mail.mjs';
import { mailTekst, MAIL_TALEN } from './mailteksten.mjs';
import { ApiError, fail, engelseTekst, cleanName, cleanEmail, cleanPassword, isObject } from './validate.mjs';

const DAY = 86400000;
const SESSION_DAYS = 90;
const MAX_FRIENDS = 200, MAX_PENDING = 25, MAX_MATCHES = 50;

// Een spelregel is overtreden (bijv. "dat woord bestaat niet"). `key` en `params` verwijzen naar een tekst in het taalpakket (err.<key>)
export class RuleError extends Error {
  constructor(key, params) { super(engelseTekst(key, params)); this.key = key; this.params = params || null; }
}

export function createApi({ db, games = {}, now = Date.now, limiter = createLimiter(now), version = '0.1.0', facebook = null, mailer = createMailer() }) {
  const D = db.data;
  const day = (t) => new Date(t).toISOString().slice(0, 10);

  // ----- Hulpjes -----
  const userById = (id) => D.users[id] || null;
  const selfView = (u) => ({ id: u.id, name: u.name, email: u.email ?? null, code: formatCode(u.code), createdAt: u.createdAt, hasPassword: !!u.pass, facebook: !!u.facebookId });
  // Wat anderen van je zien: alleen je naam en een datum (geen tijdstip, dat is privacy-vriendelijker)
  const otherView = (u) => (u ? { id: u.id, name: u.name, lastSeen: day(u.lastSeen) } : { id: null, name: '', lastSeen: null });       // een verwijderd account heeft geen naam meer: de app zegt dat zelf
  const fkey = (a, b) => [a, b].sort().join('|');

  function newSession(userId) {
    const token = newToken();
    D.sessions[sha(token)] = { userId, created: now(), used: now() };
    return token;
  }

  function auth(req) {
    if (!req.token) fail(401, 'sessie', 'notLoggedIn');
    const key = sha(req.token);
    const s = D.sessions[key];
    if (!s || now() - s.used > SESSION_DAYS * DAY) { if (s) { delete D.sessions[key]; db.save(); } fail(401, 'sessie', 'loggedOut'); }
    const user = userById(s.userId);
    if (!user) { delete D.sessions[key]; fail(401, 'sessie', 'accountGone'); }
    if (now() - s.used > 3600_000) { s.used = now(); db.save(); }
    return { user, key };
  }

  function revokeSessions(userId, exceptKey = null) {
    for (const [k, s] of Object.entries(D.sessions)) if (s.userId === userId && k !== exceptKey) delete D.sessions[k];
  }

  function uniqueCode() {
    for (let i = 0; i < 20; i++) { const c = cleanCode(newFriendCode()); if (!D.codes[c]) return c; }
    throw new Error('geen vrije vriendencode');
  }

  function limit(req, name, max, windowMs, key = 'tooFast') {
    if (!limiter.hit(`${name}:${req.ip}`, max, windowMs)) fail(429, 'te-snel', key);
  }

  // ----- Accounts -----
  async function signup(req) {
    limit(req, 'signup', 10, 3600_000);
    const b = req.body;
    const name = cleanName(b.name), email = cleanEmail(b.email), password = cleanPassword(b.password);
    if (D.emails[email]) fail(409, 'email', 'emailTaken');
    const recoveryCode = newRecoveryCode();
    const [pass, rec] = await Promise.all([hashSecret(password), hashSecret(cleanCode(recoveryCode))]);
    if (D.emails[email]) fail(409, 'email', 'emailTaken');   // iemand anders was net sneller
    const id = newId(), code = uniqueCode();
    D.users[id] = { id, name, email, pass, recovery: rec, code, createdAt: now(), lastSeen: now(), sync: null };
    D.emails[email] = id; D.codes[code] = id;
    const token = newSession(id);
    db.save();
    return { status: 201, body: { token, user: selfView(D.users[id]), recoveryCode } };
  }

  async function login(req) {
    limit(req, 'login-ip', 30, 15 * 60_000);
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!limiter.hit(`login-mail:${email}`, 8, 15 * 60_000)) fail(429, 'te-snel', 'tooManyLogins');
    const user = userById(D.emails[email]);
    const ok = await verifySecret(String(req.body.password ?? ''), user?.pass || DUMMY);
    if (!user || !user.pass || !ok) fail(401, 'inloggen', 'loginWrong');
    limiter.reset(`login-mail:${email}`);
    user.lastSeen = now();
    const token = newSession(user.id);
    db.save();
    return { body: { token, user: selfView(user) } };
  }

  async function recover(req) {
    limit(req, 'recover-ip', 10, 3600_000);
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!limiter.hit(`recover-mail:${email}`, 5, 3600_000)) fail(429, 'te-snel', 'tooManyRecover');
    const password = cleanPassword(req.body.password);
    const user = userById(D.emails[email]);
    const ok = await verifySecret(cleanCode(req.body.recoveryCode), user?.recovery || DUMMY);
    if (!user || !user.recovery || !ok) fail(401, 'herstel', 'recoverWrong');
    const recoveryCode = newRecoveryCode();
    user.pass = await hashSecret(password);
    user.recovery = await hashSecret(cleanCode(recoveryCode));
    revokeSessions(user.id);                                        // iedereen die nog was ingelogd, moet opnieuw
    const token = newSession(user.id);
    db.save();
    return { body: { token, user: selfView(user), recoveryCode } };
  }

  function me(req) {
    const { user } = auth(req);
    user.lastSeen = now(); db.save();
    return { body: { user: selfView(user), counts: counts(user.id) } };
  }

  function counts(userId) {
    let incoming = 0, yourTurn = 0;
    for (const f of Object.values(D.friendships)) if (f.status === 'pending' && f.from !== userId && (f.a === userId || f.b === userId)) incoming++;
    for (const m of Object.values(D.matches)) if (m.status === 'active' && m.turn === userId) yourTurn++;
    return { incoming, yourTurn };
  }

  function rename(req) {
    const { user } = auth(req);
    user.name = cleanName(req.body.name);
    db.save();
    return { body: { user: selfView(user) } };
  }

  // ----- Code per e-mail: wachtwoord vergeten, en wachtwoord veranderen als je ingelogd bent -----
  const MAIL_MIN = 30;
  const mailTaal = (v) => (MAIL_TALEN.includes(v) ? v : 'en');
  const mailHash = (user, code) => sha(`${user.id}|${cleanCode(code)}`);
  async function stuurCode(user, soort, taal) {
    const code = newFriendCode();                                     // 8 tekens, bijv. K7P4-QM2X
    user.mailCode = { soort, hash: mailHash(user, code), exp: now() + MAIL_MIN * 60_000, tries: 0 };
    db.save();
    const { subject, text } = mailTekst(soort, mailTaal(taal), { naam: user.name, code, min: MAIL_MIN });
    try { await mailer.send({ to: user.email, subject, text }); }
    catch (e) { delete user.mailCode; db.save(); console.error(`e-mail naar ${user.email} mislukt: ${e.message}`); fail(502, 'email', 'mailFailed'); }
  }
  // Klopt de code? Een code werkt één keer, een beperkte tijd en maximaal 5 pogingen.
  function controleerCode(user, soort, code) {
    const m = user?.mailCode;
    if (!code || !String(code).trim()) fail(400, 'code', 'mailCodeNeeded');
    if (!m || m.soort !== soort || m.exp < now() || m.tries >= 5) fail(401, 'code', 'mailCodeWrong');
    if (m.hash !== mailHash(user, code)) { m.tries++; db.save(); fail(401, 'code', 'mailCodeWrong'); }
    delete user.mailCode;
  }

  async function forgot(req) {
    limit(req, 'forgot-ip', 10, 3600_000);
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!limiter.hit(`forgot-mail:${email}`, 3, 3600_000)) fail(429, 'te-snel', 'tooManyRecover');
    const user = userById(D.emails[email]);
    if (user && user.pass) await stuurCode(user, 'reset', req.body.taal);
    return { body: { ok: true } };                                      // altijd hetzelfde antwoord: zo is niet te zien welke adressen bestaan
  }

  async function reset(req) {
    limit(req, 'reset-ip', 20, 3600_000);
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!limiter.hit(`reset-mail:${email}`, 10, 3600_000)) fail(429, 'te-snel', 'tooManyRecover');
    const password = cleanPassword(req.body.password);
    const user = userById(D.emails[email]);
    controleerCode(user, 'reset', req.body.code);
    user.pass = await hashSecret(password);
    revokeSessions(user.id);
    const token = newSession(user.id);
    db.save();
    return { body: { token, user: selfView(user) } };
  }

  async function changePasswordCode(req) {
    const { user } = auth(req);
    limit(req, 'pw-code', 10, 3600_000);
    if (!user.pass) fail(400, 'wachtwoord', 'noPasswordFacebook');
    if (!(await verifySecret(String(req.body.password ?? ''), user.pass))) fail(401, 'wachtwoord', 'currentPasswordWrong');
    await stuurCode(user, 'change', req.body.taal);
    return { body: { ok: true } };
  }

  async function changePassword(req) {
    const { user, key } = auth(req);
    limit(req, 'pw', 10, 3600_000);
    if (!user.pass) fail(400, 'wachtwoord', 'noPasswordFacebook');
    if (!(await verifySecret(String(req.body.password ?? ''), user.pass))) fail(401, 'wachtwoord', 'currentPasswordWrong');
    const nieuw = cleanPassword(req.body.newPassword, 'nieuw');
    controleerCode(user, 'change', req.body.emailCode);                // de code die per e-mail kwam
    user.pass = await hashSecret(nieuw);
    revokeSessions(user.id, key);
    db.save();
    return { body: { ok: true } };
  }

  async function newRecovery(req) {                                // als je de herstelcode kwijt bent: een nieuwe, na je wachtwoord
    const { user } = auth(req);
    limit(req, 'recovery-new', 10, 3600_000);
    if (!user.pass) fail(400, 'wachtwoord', 'noPasswordFacebook');
    if (!(await verifySecret(String(req.body.password ?? ''), user.pass))) fail(401, 'wachtwoord', 'passwordWrong');
    const recoveryCode = newRecoveryCode();
    user.recovery = await hashSecret(cleanCode(recoveryCode));
    db.save();
    return { body: { recoveryCode } };
  }

  function newFriendCodeFor(req) {
    const { user } = auth(req);
    delete D.codes[user.code];
    user.code = uniqueCode(); D.codes[user.code] = user.id;
    db.save();
    return { body: { user: selfView(user) } };
  }

  async function deleteAccount(req) {
    const { user } = auth(req);
    limit(req, 'delete', 5, 3600_000);
    if (user.pass && !(await verifySecret(String(req.body.password ?? ''), user.pass))) fail(401, 'wachtwoord', 'passwordWrong');
    revokeSessions(user.id);
    if (user.email) delete D.emails[user.email];
    if (user.facebookId) delete D.facebook[user.facebookId];
    delete D.codes[user.code]; delete D.users[user.id];
    for (const [k, f] of Object.entries(D.friendships)) if (f.a === user.id || f.b === user.id) delete D.friendships[k];
    for (const [mid, m] of Object.entries(D.matches)) {
      if (!m.players.includes(user.id)) continue;
      if (m.status === 'active') { m.status = 'done'; m.result = { abandoned: true }; m.turn = null; m.version++; m.updatedAt = now(); }
      m.players = m.players.map((p) => (p === user.id ? 'verwijderd' : p));            // het account is weg, de ander houdt zijn geschiedenis
      if (m.players.every((p) => p === 'verwijderd')) delete D.matches[mid];
    }
    db.save();
    return { body: { ok: true } };
  }

  // ----- Inloggen met Facebook -----
  // De gewone OAuth-route: de app stuurt je naar Facebook, Facebook stuurt je met een code terug naar de server, de server
  // haalt je naam en e-mailadres op en geeft de app een eenmalig kaartje (ticket) dat alleen werkt in de browser die het
  // vroeg (nonce). Zo komt er geen sleutel in een adres te staan en kan niemand je op een vreemd account laten inloggen.
  const fbStates = new Map(), fbTickets = new Map();       // kort bewaard, alleen in het geheugen
  const sweepFb = () => { for (const m of [fbStates, fbTickets]) for (const [k, v] of m) if (v.exp < now()) m.delete(k); };
  const GRAPH = 'https://graph.facebook.com/v21.0';
  const fbRedirect = (hash) => ({ status: 302, body: null, redirect: `${facebook.publicUrl}/#/account/facebook/${hash}` });

  function facebookStart(req) {
    if (!facebook) fail(404, 'facebook', 'facebookOff');
    limit(req, 'fb-start', 30, 15 * 60_000);
    const nonce = String(req.query.nonce ?? '');
    if (nonce.length < 20 || nonce.length > 100) fail(400, 'facebook', 'facebookBadRequest');
    sweepFb();
    const state = newToken();
    fbStates.set(state, { nonce: sha(nonce), exp: now() + 10 * 60_000 });
    const q = new URLSearchParams({ client_id: facebook.appId, redirect_uri: `${facebook.publicUrl}/api/auth/facebook/callback`, state, scope: 'public_profile,email', response_type: 'code' });
    return { status: 302, body: null, redirect: `https://www.facebook.com/v21.0/dialog/oauth?${q}` };
  }

  async function facebookProfile(code) {
    const f = facebook.fetch || globalThis.fetch;
    const t = new URLSearchParams({ client_id: facebook.appId, client_secret: facebook.appSecret, redirect_uri: `${facebook.publicUrl}/api/auth/facebook/callback`, code });
    const tokenRes = await f(`${GRAPH}/oauth/access_token?${t}`);
    const token = (await tokenRes.json())?.access_token;
    if (!tokenRes.ok || !token) throw new Error('facebook-token');
    const me = await f(`${GRAPH}/me?${new URLSearchParams({ fields: 'id,first_name,name,email', access_token: token })}`);
    const p = await me.json();
    if (!me.ok || !p?.id) throw new Error('facebook-profiel');
    return p;
  }

  async function facebookCallback(req) {
    if (!facebook) fail(404, 'facebook', 'facebookOff');
    limit(req, 'fb-callback', 30, 15 * 60_000);
    const st = fbStates.get(String(req.query.state ?? ''));
    fbStates.delete(String(req.query.state ?? ''));
    if (!st || st.exp < now() || !req.query.code) return fbRedirect('fout');          // geannuleerd, verlopen of onbekend
    let p;
    try { p = await facebookProfile(String(req.query.code)); } catch (e) { console.error('Facebook-inlog mislukt:', e.message); return fbRedirect('fout'); }
    const fbId = String(p.id);
    const email = (() => { try { return p.email ? cleanEmail(p.email) : null; } catch { return null; } })();
    let user = userById(D.facebook[fbId]), isNew = false;
    if (!user && email && D.emails[email]) {                    // hetzelfde e-mailadres (door Facebook bevestigd): dezelfde persoon
      user = userById(D.emails[email]); user.facebookId = fbId; D.facebook[fbId] = user.id;
    }
    if (!user) {
      let name; try { name = cleanName(String(p.first_name || p.name || '').slice(0, 24)); } catch { name = 'Speler'; }
      const id = newId(), code = uniqueCode();
      user = D.users[id] = { id, name, email, pass: null, recovery: null, facebookId: fbId, code, createdAt: now(), lastSeen: now(), sync: null };
      if (email) D.emails[email] = id;
      D.facebook[fbId] = id; D.codes[code] = id; isNew = true;
    }
    user.lastSeen = now();
    const ticket = newToken();
    fbTickets.set(ticket, { userId: user.id, nonce: st.nonce, isNew, exp: now() + 60_000 });
    db.save();
    return fbRedirect(ticket);
  }

  function facebookClaim(req) {
    limit(req, 'fb-claim', 30, 15 * 60_000);
    sweepFb();
    const t = fbTickets.get(String(req.body.ticket ?? ''));
    fbTickets.delete(String(req.body.ticket ?? ''));          // één keer te gebruiken
    if (!t || t.exp < now() || t.nonce !== sha(String(req.body.nonce ?? ''))) fail(401, 'facebook', 'facebookFailed');
    const user = userById(t.userId);
    if (!user) fail(401, 'facebook', 'accountGone');
    return { body: { token: newSession(user.id), user: selfView(user), isNew: t.isNew } };
  }

  // ----- Vrienden -----
  function codeLookup(req) {
    const { user } = auth(req);
    if (!limiter.hit(`lookup:${user.id}`, 30, 3600_000)) fail(429, 'te-snel', 'tooManyLookups');
    const found = userById(D.codes[cleanCode(req.params.code)]);
    if (!found) fail(404, 'code', 'codeUnknown');
    return { body: { name: found.name, self: found.id === user.id } };
  }

  function listFriends(req) {
    const { user } = auth(req);
    const out = { friends: [], incoming: [], outgoing: [] };
    for (const f of Object.values(D.friendships)) {
      if (f.a !== user.id && f.b !== user.id) continue;
      const other = userById(f.a === user.id ? f.b : f.a);
      const row = { ...otherView(other), since: day(f.acceptedAt || f.at), requested: day(f.at) };
      if (f.status === 'accepted') out.friends.push(row);
      else if (f.from === user.id) out.outgoing.push(row);
      else out.incoming.push(row);
    }
    const byName = (x, y) => x.name.localeCompare(y.name, 'nl');
    out.friends.sort(byName); out.incoming.sort(byName); out.outgoing.sort(byName);
    return { body: out };
  }

  const friendCount = (id) => Object.values(D.friendships).filter((f) => f.status === 'accepted' && (f.a === id || f.b === id)).length;

  function friendRequest(req) {
    const { user } = auth(req);
    limit(req, 'friend-req', 60, 3600_000);
    const target = userById(D.codes[cleanCode(req.body.code)]);
    if (!target) fail(404, 'code', 'codeUnknown');
    if (target.id === user.id) fail(400, 'zelf', 'ownCode');
    const key = fkey(user.id, target.id);
    const existing = D.friendships[key];
    if (existing?.status === 'accepted') fail(409, 'al-vrienden', 'alreadyFriends', { name: target.name });
    if (existing && existing.from === user.id) fail(409, 'al-gevraagd', 'alreadyRequested', { name: target.name });
    if (existing) {                                                 // die ander vroeg jou al: dan is het meteen gelukt
      existing.status = 'accepted'; existing.acceptedAt = now();
      db.save();
      return { body: { status: 'accepted', friend: otherView(target) } };
    }
    const pending = Object.values(D.friendships).filter((f) => f.status === 'pending' && f.from === user.id).length;
    if (pending >= MAX_PENDING) fail(429, 'te-veel', 'tooManyRequests');
    if (friendCount(user.id) >= MAX_FRIENDS) fail(400, 'te-veel', 'maxFriends');
    const [a, b] = [user.id, target.id].sort();
    D.friendships[key] = { a, b, status: 'pending', from: user.id, at: now() };
    db.save();
    return { status: 201, body: { status: 'pending', friend: otherView(target) } };
  }

  function answerFriend(req, accept) {
    const { user } = auth(req);
    const key = fkey(user.id, req.params.id);
    const f = D.friendships[key];
    if (!f || f.status !== 'pending' || f.from === user.id) fail(404, 'verzoek', 'requestGone');
    if (accept) {
      if (friendCount(user.id) >= MAX_FRIENDS) fail(400, 'te-veel', 'maxFriends');
      f.status = 'accepted'; f.acceptedAt = now();
    } else delete D.friendships[key];
    db.save();
    return { body: { ok: true } };
  }

  function removeFriend(req) {                                      // een vriend verwijderen, of je eigen verzoek intrekken
    const { user } = auth(req);
    const key = fkey(user.id, req.params.id);
    if (!D.friendships[key]) fail(404, 'vriend', 'friendGone');
    delete D.friendships[key];
    for (const m of Object.values(D.matches)) if (m.status === 'active' && m.players.includes(user.id) && m.players.includes(req.params.id)) { m.status = 'done'; m.result = { abandoned: true }; m.turn = null; m.version++; m.updatedAt = now(); }
    db.save();
    return { body: { ok: true } };
  }

  // ----- Voortgang tussen apparaten -----
  function getSync(req) {
    const { user } = auth(req);
    return { body: { version: user.sync?.version ?? 0, data: user.sync?.data ?? null } };
  }

  function putSync(req) {
    const { user } = auth(req);
    const { baseVersion, data } = req.body;
    if (!isObject(data) || !isObject(data.games)) fail(400, 'sync', 'syncInvalid');
    const current = user.sync?.version ?? 0;
    if (baseVersion !== current) return { status: 409, body: { error: { code: 'versie', key: 'syncConflict', message: engelseTekst('syncConflict') }, version: current, data: user.sync?.data ?? null } };
    user.sync = { version: current + 1, data, at: now() };
    db.save();
    return { body: { version: user.sync.version } };
  }

  // ----- Spellen met beurten (algemeen) -----
  // De regels van een spel staan in `games[id]`:
  //   config(config) -> config                                   (optioneel) maakt de gekozen instellingen netjes; mag een RuleError gooien
  //   prepare({ config })                                        (optioneel, mag async) klaarzetten wat het spel nodig heeft, bijvoorbeeld een woordenboek laden
  //   create({ players, config }) -> { pub, secret, turn }      pub: wat beide spelers zien, secret: alleen de server
  //   apply({ pub, secret, move, player, config }) -> { pub, secret, turn, result? }   turn = null als het spel is afgelopen
  // De server bepaalt wie aan de beurt is en controleert elke zet. Een client kan dus niet vals spelen.
  const matchView = (m, userId) => ({
    id: m.id, game: m.game, status: m.status, version: m.version, config: m.config, pub: m.pub, result: m.result ?? null,
    turn: m.turn, yourTurn: m.status === 'active' && m.turn === userId,
    players: m.players.map((id) => ({ id, ...otherView(userById(id)) })), createdAt: m.createdAt, updatedAt: m.updatedAt,
  });

  function myMatch(req) {
    const { user } = auth(req);
    const m = D.matches[req.params.id];
    if (!m || !m.players.includes(user.id)) fail(404, 'partij', 'matchGone');
    return { user, m };
  }

  async function createMatch(req) {
    const { user } = auth(req);
    const rules = games[req.body.game];
    if (!rules) fail(400, 'spel', 'gameUnavailable');
    let config = isObject(req.body.config) ? req.body.config : {};
    try {
      if (rules.config) config = rules.config(config);
      if (rules.prepare) await rules.prepare({ config });          // het enige wat hier kan wachten; daarna gaat alles in één keer
    } catch (e) { if (e instanceof RuleError) fail(400, 'regel', e.key, e.params); throw e; }
    const other = userById(req.body.with);
    const f = other && D.friendships[fkey(user.id, other.id)];
    if (!f || f.status !== 'accepted') fail(403, 'vriend', 'onlyFriends');
    const active = Object.values(D.matches).filter((m) => m.status === 'active' && m.players.includes(user.id)).length;
    if (active >= MAX_MATCHES) fail(429, 'te-veel', 'tooManyMatches');
    const players = [user.id, other.id];
    let made;
    try { made = rules.create({ players, config }); } catch (e) { if (e instanceof RuleError) fail(400, 'regel', e.key, e.params); throw e; }
    const id = newId();
    D.matches[id] = { id, game: req.body.game, players, config, pub: made.pub, secret: made.secret ?? null, turn: made.turn ?? players[0], status: 'active', version: 1, createdAt: now(), updatedAt: now() };
    db.save();
    return { status: 201, body: { match: matchView(D.matches[id], user.id) } };
  }

  function listMatches(req) {
    const { user } = auth(req);
    const list = Object.values(D.matches).filter((m) => m.players.includes(user.id))
      .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 100)
      .map((m) => { const v = matchView(m, user.id); v.summary = games[m.game]?.summary?.({ pub: m.pub }) ?? null; delete v.pub; return v; });
    return { body: { matches: list } };
  }

  function getMatch(req) {
    const { user, m } = myMatch(req);
    if (Number(req.query.since) === m.version) return { body: { unchanged: true, version: m.version } };
    return { body: { match: matchView(m, user.id) } };
  }

  async function move(req) {
    const { user, m } = myMatch(req);
    try { await games[m.game]?.prepare?.({ config: m.config }); }          // bijvoorbeeld het woordenboek van deze partij; daarna is alles weer synchroon
    catch (e) { if (e instanceof RuleError) fail(400, 'regel', e.key, e.params); throw e; }
    if (m.status !== 'active') fail(409, 'klaar', 'matchOver');
    if (m.turn !== user.id) fail(409, 'beurt', 'notYourTurn');
    if (req.body.version !== m.version) fail(409, 'versie', 'versionChanged');
    let out;
    try { out = games[m.game].apply({ pub: m.pub, secret: m.secret, move: req.body.move, player: user.id, config: m.config }); }
    catch (e) { if (e instanceof RuleError) fail(400, 'regel', e.key, e.params); throw e; }
    m.pub = out.pub; m.secret = out.secret ?? m.secret; m.turn = out.turn ?? null; m.version++; m.updatedAt = now();
    if (out.turn == null) { m.status = 'done'; m.result = out.result ?? null; }
    db.save();
    return { body: { match: matchView(m, user.id) } };
  }

  function resign(req) {
    const { user, m } = myMatch(req);
    if (m.status !== 'active') fail(409, 'klaar', 'matchOver');
    m.status = 'done'; m.turn = null; m.result = { resigned: user.id }; m.version++; m.updatedAt = now();
    db.save();
    return { body: { match: matchView(m, user.id) } };
  }

  // ----- Routes -----
  const routes = [
    ['GET', '/api/ping', () => ({ body: { ok: true, app: 'puzzelplaats', version, accounts: true, facebook: !!facebook } })],
    ['GET', '/api/auth/facebook/start', facebookStart], ['GET', '/api/auth/facebook/callback', facebookCallback], ['POST', '/api/auth/facebook/claim', facebookClaim],
    ['POST', '/api/signup', signup], ['POST', '/api/login', login], ['POST', '/api/recover', recover], ['POST', '/api/forgot', forgot], ['POST', '/api/reset', reset],
    ['POST', '/api/logout', (req) => { const { key } = auth(req); delete D.sessions[key]; db.save(); return { body: { ok: true } }; }],
    ['GET', '/api/me', me], ['PATCH', '/api/me', rename], ['DELETE', '/api/me', deleteAccount],
    ['POST', '/api/me/password', changePassword], ['POST', '/api/me/password/code', changePasswordCode], ['POST', '/api/me/code', newFriendCodeFor], ['POST', '/api/me/recovery', newRecovery],
    ['GET', '/api/users/by-code/:code', codeLookup],
    ['GET', '/api/friends', listFriends], ['POST', '/api/friends/request', friendRequest],
    ['POST', '/api/friends/:id/accept', (r) => answerFriend(r, true)], ['POST', '/api/friends/:id/decline', (r) => answerFriend(r, false)],
    ['DELETE', '/api/friends/:id', removeFriend],
    ['GET', '/api/sync', getSync], ['PUT', '/api/sync', putSync],
    ['POST', '/api/matches', createMatch], ['GET', '/api/matches', listMatches],
    ['GET', '/api/matches/:id', getMatch], ['POST', '/api/matches/:id/move', move], ['POST', '/api/matches/:id/resign', resign],
  ].map(([method, pattern, fn]) => ({ method, fn, names: [...pattern.matchAll(/:(\w+)/g)].map((m) => m[1]), re: new RegExp(`^${pattern.replace(/:\w+/g, '([^/]+)')}$`) }));

  async function handle(req) {
    try {
      req.body = isObject(req.body) ? req.body : {};
      let known = false;
      for (const r of routes) {
        const m = req.path.match(r.re);
        if (!m) continue;
        known = true;
        if (r.method !== req.method) continue;
        req.params = Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
        const res = await r.fn(req);
        return { status: res.status ?? 200, body: res.body, ...(res.redirect ? { redirect: res.redirect } : {}) };
      }
      return { status: known ? 405 : 404, body: { error: { code: known ? 'methode' : 'onbekend', key: 'unknown', message: engelseTekst('unknown') } } };
    } catch (e) {
      if (e instanceof ApiError) return { status: e.status, body: { error: { code: e.code, key: e.key, ...(e.params ? { params: e.params } : {}), message: e.message } } };
      console.error('Onverwachte fout:', e);
      return { status: 500, body: { error: { code: 'server', key: 'server', message: engelseTekst('server') } } };
    }
  }

  return { handle, limiter };
}
