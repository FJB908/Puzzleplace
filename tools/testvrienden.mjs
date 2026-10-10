// Test-vrienden: nagebootste vrienden die echt meespelen, zodat je Start, Vrienden en een partij kunt uitproberen
// zonder dat je er echte mensen voor nodig hebt. Werkt tegen een draaiende server (`npm run server`) en gebruikt alleen de
// gewone API, precies zoals de app dat doet.
//
//   npm run testvrienden -- --code K7P4-QM2X           je vriendencode (staat onder Vrienden): de test-vrienden sturen jou een verzoek
//   npm run testvrienden -- --email jij@voorbeeld.nl --wachtwoord geheim123
//                                                       idem, maar dan zijn ze al je vriend (twee verzoeken laten ze open)
//   npm run testvrienden -- --opruimen                 verwijdert alle test-vrienden weer (ook hun partijen)
//
// Opties: --server http://127.0.0.1:8000 (standaard), --eens (alleen klaarzetten en stoppen; zonder dit blijven ze meespelen,
// stop met Ctrl+C), --snel (iedereen reageert binnen een paar seconden).
//
// De test-vrienden hebben het e-mailadres naam@test.puzzelplaats.invalid en wachtwoord "testvriend-123". Ze staan alleen in de
// database van die server; draai dit dus nooit tegen een echte server met echte mensen.

import { botMove, legalMoves, makeRng } from '../js/games/woordtuin/engine.js';

const WACHTWOORD = 'testvriend-123';
const PERSONAS = [
  // niveau: hoe sterk, wacht: seconden tot hij speelt, partij: begint een partij met jou, verzoek: blijft een openstaand verzoek
  { naam: 'Bram', niveau: 'gemiddeld', wacht: 2, partij: true, uitleg: 'speelt snel; partij loopt (jij of hij begint, daarna ben jij aan de beurt)' },
  { naam: 'Cor', niveau: 'makkelijk', wacht: 12, partij: true, uitleg: 'speelt langzaam: je ziet eerst "Wacht op Cor", na een paar tellen ben jij aan de beurt' },
  { naam: 'Els', niveau: 'moeilijk', wacht: 4, partij: false, uitleg: 'geen partij: probeer "Nieuwe partij" (daarna speelt zij mee)' },
  { naam: 'Fien', niveau: 'makkelijk', wacht: 6, partij: false, uitleg: 'geen partij: nog een vriend zonder lopende partij' },
  { naam: 'Gert', niveau: 'gemiddeld', wacht: 3, partij: true, uitleg: 'partij loopt' },
  { naam: 'Dina', niveau: 'makkelijk', wacht: 5, partij: false, verzoek: true, uitleg: 'vriendverzoek dat openstaat (Ja of Nee)' },
  { naam: 'Hanna', niveau: 'makkelijk', wacht: 5, partij: false, verzoek: true, uitleg: 'tweede vriendverzoek' },
];

// ----- Opdrachtregel -----
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const waarde = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const SERVER = (waarde('server') || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const tempo = flag('eens') ? 0 : flag('snel') ? 0.3 : 1;

// ----- API (met een eigen sleutel per persoon) -----
async function api(token, method, path, body) {
  const res = await fetch(SERVER + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => { throw new Error(`Geen verbinding met ${SERVER}. Draait de server (npm run server)?`); });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `Fout ${res.status}`), { status: res.status, code: json?.error?.code });
  return json;
}

const emailVan = (naam) => `${naam.toLowerCase()}@test.puzzelplaats.invalid`;

async function inloggen(persona) {
  try { const r = await api(null, 'POST', '/api/login', { email: emailVan(persona.naam), password: WACHTWOORD }); return { token: r.token, user: r.user }; }
  catch (e) {
    if (e.status !== 401) throw e;
    const r = await api(null, 'POST', '/api/signup', { name: persona.naam, email: emailVan(persona.naam), password: WACHTWOORD });
    return { token: r.token, user: r.user };
  }
}

async function opruimen() {
  let n = 0;
  for (const p of PERSONAS) {
    try {
      const { token } = await api(null, 'POST', '/api/login', { email: emailVan(p.naam), password: WACHTWOORD });
      await api(token, 'DELETE', '/api/me', { password: WACHTWOORD });
      n++;
    } catch (e) { if (e.status !== 401) throw e; }
  }
  console.log(n ? `${n} test-vrienden verwijderd.` : 'Er waren geen test-vrienden.');
}

// ----- Klaarzetten -----
async function klaarzetten() {
  const mensen = [];
  for (const p of PERSONAS) mensen.push({ ...p, ...(await inloggen(p)) });

  let jij = null, code = waarde('code');
  if (waarde('email')) {
    const r = await api(null, 'POST', '/api/login', { email: waarde('email'), password: waarde('wachtwoord') || '' });
    jij = r;
    code = r.user.code;
  }
  if (!code) throw new Error('Geef je vriendencode (--code K7P4-QM2X, te vinden onder Vrienden) of je e-mailadres en wachtwoord (--email ... --wachtwoord ...).');

  for (const m of mensen) {
    try { await api(m.token, 'POST', '/api/friends/request', { code }); }
    catch (e) { if (!['al-vrienden', 'al-gevraagd'].includes(e.code)) throw e; }
  }
  if (jij) {                                                       // wij zijn jou: de meeste verzoeken meteen goedkeuren
    for (const m of mensen.filter((x) => !x.verzoek)) {
      try { await api(jij.token, 'POST', `/api/friends/${m.user.id}/accept`, {}); } catch (e) { if (e.code !== 'verzoek') throw e; }
    }
  }
  return { mensen, jij, code };
}

// ----- Meespelen -----
function speler(m, jijId) {
  const gepland = new Set();        // `${partij}:${versie}`: alleen één keer inplannen
  let partijGemaakt = false;

  async function maakPartij() {
    if (!m.partij || partijGemaakt) return;
    const vrienden = (await api(m.token, 'GET', '/api/friends')).friends;
    const jij = vrienden.find((v) => !v.name || !PERSONAS.some((p) => p.naam === v.name)) || null;     // de enige echte vriend
    if (!jij) return;                                                                                // je hebt het verzoek nog niet geaccepteerd
    partijGemaakt = true;
    const lopend = (await api(m.token, 'GET', '/api/matches')).matches.some((x) => x.status === 'active' && x.players.some((p) => p.id === jij.id));
    if (lopend) return;                                                                              // bij nog eens draaien niet nog een partij
    await api(m.token, 'POST', '/api/matches', { with: jij.id, game: 'woordtuin', config: { tips: 3 } });
  }

  async function beurt() {
    const lijst = (await api(m.token, 'GET', '/api/matches')).matches;
    for (const k of lijst.filter((x) => x.status === 'active' && x.yourTurn)) {
      const sleutel = `${k.id}:${k.version}`;
      if (gepland.has(sleutel)) continue;
      gepland.add(sleutel);
      setTimeout(() => speel(k.id).catch((e) => { gepland.delete(sleutel); console.log(`  ${m.naam}: ${e.message}`); }), m.wacht * 1000 * tempo);
    }
  }

  async function speel(id) {
    const { match } = await api(m.token, 'GET', `/api/matches/${id}`);
    if (match.status !== 'active' || !match.yourTurn) return;
    const slot = match.pub.players.indexOf(m.user.id) + 1;
    const rng = makeRng(`${id}|${match.version}`);
    const zet = botMove(match.pub, slot, m.niveau, rng) || legalMoves(match.pub, slot)[0];
    if (!zet) { await api(m.token, 'POST', `/api/matches/${id}/resign`, {}); console.log(`  ${m.naam} kon niets meer en stopte de partij.`); return; }
    const r = await api(m.token, 'POST', `/api/matches/${id}/move`, { version: match.version, move: { path: zet.path } });
    console.log(`  ${m.naam} speelde ${r.match.pub.last?.word?.toUpperCase() ?? '…'}${r.match.status === 'active' ? '' : ' (partij afgelopen)'}`);
  }

  return { async tik() { await maakPartij(); await beurt(); } };
}

// ----- Start -----
try {
  if (flag('opruimen')) { await opruimen(); process.exit(0); }
  const { mensen, jij, code } = await klaarzetten();
  console.log(`\nTest-vrienden staan klaar op ${SERVER} (vriendencode ${code}).\n`);
  for (const m of mensen) console.log(`  ${m.naam.padEnd(6)} ${m.verzoek ? 'verzoek' : jij ? 'vriend ' : 'verzoek'}  ${m.uitleg}`);
  if (!jij) console.log('\nOpen de app, tik op Start (of Vrienden) en accepteer de verzoeken met "Ja". Daarna zetten Bram, Cor en Gert een partij klaar.');
  else console.log('\nOpen de app en kijk op Start. Verwijderen kan met: npm run testvrienden -- --opruimen');

  const spelers = mensen.map((m) => speler(m, jij?.user.id));
  const ronde = async () => { for (const s of spelers) { try { await s.tik(); } catch (e) { console.log(`  (${e.message})`); } } };
  await ronde();
  if (flag('eens')) {                                              // één keer klaarzetten: wie al aan de beurt is speelt meteen
    await new Promise((r) => setTimeout(r, 1500));
    await ronde();
    process.exit(0);
  }
  console.log('\nDe test-vrienden spelen mee zolang dit draait (Ctrl+C om te stoppen).\n');
  setInterval(ronde, 2500);
} catch (e) {
  console.error(`\n${e.message}\n`);
  process.exit(1);
}
