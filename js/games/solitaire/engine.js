// Patience (Klondike): alle regels, zonder scherm.
//
// Een kaart is een getal 0-51: rang = k % 13 (0 = aas ... 12 = heer), kleur = Math.floor(k / 13) (0 schoppen, 1 harten, 2 ruiten, 3 klaver).
// Zeven stapels (alleen de onderste kaarten liggen met de rug naar boven), een voorraad, een aflegstapel en vier fundamenten (per kleur één).
// Het spel wordt bewaard als de deling (niveau + seed) plus de lijst met zetten: Zet terug haalt de laatste zet weg, en een bewaard spel
// is klein. Bij makkelijk en moeilijk is de deling altijd te winnen (een zoeker probeert delingen tot er een goed is).
//
// Een zet is een lijst: ['d'] kaart(en) van de voorraad, ['r'] aflegstapel terug op de voorraad, ['wf'] aflegstapel naar fundament,
// ['wt', naar] aflegstapel naar stapel, ['tf', van] stapel naar fundament, ['tt', van, n, naar] n kaarten van stapel naar stapel,
// ['ft', kleur, naar] fundament terug naar een stapel.

export const NIVEAUS = {
  makkelijk: { trek: 1, oplosbaar: true },
  gemiddeld: { trek: 1, oplosbaar: false },
  moeilijk: { trek: 3, oplosbaar: true },
  extreem: { trek: 3, oplosbaar: false },
};

export const rang = (k) => k % 13;
export const kleur = (k) => Math.floor(k / 13);
export const isRood = (k) => { const s = kleur(k); return s === 1 || s === 2; };

export class ZetFout extends Error {}

export function makeRng(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (let i = 0; i < String(seed).length; i++) { h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const schud = (lijst, rng) => { const a = [...lijst]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ----- De stand -----
// { trek, tab: [{ k: [kaarten], u: aantal open }], stock: [], waste: [], wv: zichtbaar in de waaier, found: [aantal per kleur] }
function uitdelen(volgorde, trek) {
  const tab = [];
  let p = 0;
  for (let i = 0; i < 7; i++) { tab.push({ k: volgorde.slice(p, p + i + 1), u: 1 }); p += i + 1; }
  return { trek, tab, stock: volgorde.slice(p), waste: [], wv: 0, found: [0, 0, 0, 0] };
}

const kopie = (g) => ({ ...g, tab: g.tab.map((c) => ({ k: c.k, u: c.u })), stock: g.stock, waste: g.waste, found: g.found.slice() });

export const geldigNiveau = (n) => Object.hasOwn(NIVEAUS, n);

// Mag deze kaart op een stapel? (lege stapel: alleen een heer; anders één lager en de andere kleur)
export function pastOpStapel(g, kaart, naar) {
  const c = g.tab[naar];
  if (!c.k.length) return rang(kaart) === 12;
  const top = c.k[c.k.length - 1];
  return rang(top) === rang(kaart) + 1 && isRood(top) !== isRood(kaart);
}
export const pastOpFundament = (g, kaart) => g.found[kleur(kaart)] === rang(kaart);

// ----- Zetten uitvoeren (geeft een nieuwe stand, de oude blijft heel) -----
export function speel(g, zet) {
  const n = kopie(g);
  const [soort] = zet;
  const haalVanStapel = (i, aantal) => {
    const c = n.tab[i];
    if (!c || aantal < 1 || aantal > c.u) throw new ZetFout('stapel');
    const kaarten = c.k.slice(c.k.length - aantal);
    const rest = c.k.slice(0, c.k.length - aantal);
    n.tab[i] = { k: rest, u: rest.length ? Math.max(1, c.u - aantal) : 0 };
    return kaarten;
  };
  const leg = (i, kaarten) => {
    if (!pastOpStapel(n, kaarten[0], i)) throw new ZetFout('past niet');
    const c = n.tab[i];
    n.tab[i] = { k: [...c.k, ...kaarten], u: c.u + kaarten.length };
  };
  const afleg = () => { n.waste = n.waste.slice(0, -1); n.wv = n.waste.length ? Math.max(1, n.wv - 1) : 0; return g.waste[g.waste.length - 1]; };
  if (soort === 'd') {
    if (!n.stock.length) throw new ZetFout('voorraad leeg');
    const aantal = Math.min(g.trek, n.stock.length);
    n.waste = [...n.waste, ...n.stock.slice(n.stock.length - aantal).reverse()];
    n.stock = n.stock.slice(0, n.stock.length - aantal);
    n.wv = aantal;
  } else if (soort === 'r') {
    if (n.stock.length || !n.waste.length) throw new ZetFout('geen recycle');
    n.stock = [...n.waste].reverse(); n.waste = []; n.wv = 0;
  } else if (soort === 'wf') {
    if (!n.waste.length) throw new ZetFout('leeg');
    const k = g.waste[g.waste.length - 1];
    if (!pastOpFundament(n, k)) throw new ZetFout('past niet');
    afleg(); n.found[kleur(k)]++;
  } else if (soort === 'wt') {
    if (!n.waste.length) throw new ZetFout('leeg');
    const k = g.waste[g.waste.length - 1];
    leg(zet[1], [k]); afleg();
  } else if (soort === 'tf') {
    const c = n.tab[zet[1]];
    if (!c?.k.length) throw new ZetFout('leeg');
    const k = c.k[c.k.length - 1];
    if (!pastOpFundament(n, k)) throw new ZetFout('past niet');
    haalVanStapel(zet[1], 1); n.found[kleur(k)]++;
  } else if (soort === 'tt') {
    const [, van, aantal, naar] = zet;
    if (van === naar) throw new ZetFout('zelfde stapel');
    const kaarten = haalVanStapel(van, aantal);
    leg(naar, kaarten);
  } else if (soort === 'ft') {
    const [, s, naar] = zet;
    if (!(n.found[s] > 0)) throw new ZetFout('leeg');
    const k = s * 13 + n.found[s] - 1;
    leg(naar, [k]); n.found[s]--;
  } else throw new ZetFout('onbekende zet');
  return n;
}

export const opFundamenten = (g) => g.found[0] + g.found[1] + g.found[2] + g.found[3];
export const klaar = (g) => opFundamenten(g) === 52;
export const progress = (g) => opFundamenten(g) / 52;

// Alles ligt open en voorraad en aflegstapel zijn leeg: dan kan de rest vanzelf naar de fundamenten
export const kanAfmaken = (g) => !klaar(g) && g.stock.length === 0 && g.waste.length === 0 && g.tab.every((c) => c.u === c.k.length);
export function afmaakZetten(g) {
  const zetten = [];
  let n = g;
  while (!klaar(n)) {
    const i = n.tab.findIndex((c) => c.k.length && pastOpFundament(n, c.k[c.k.length - 1]));
    if (i < 0) break;
    const z = ['tf', i];
    zetten.push(z); n = speel(n, z);
  }
  return zetten;
}

// ----- De deling en het bewaarde spel -----
const delingen = new Map();
export function deling(niveau, seed) {
  const sleutel = `${niveau}|${seed}`;
  if (delingen.has(sleutel)) return delingen.get(sleutel);
  const { trek, oplosbaar } = NIVEAUS[niveau];
  const basis = Array.from({ length: 52 }, (_, i) => i);
  let g = null;
  for (let poging = 0; poging < (oplosbaar ? 80 : 1); poging++) {
    g = uitdelen(schud(basis, makeRng(`${seed}|patience|${poging}`)), trek);
    if (!oplosbaar || zoek(g, 2500).gevonden) break;
  }
  delingen.set(sleutel, g);
  if (delingen.size > 6) delingen.delete(delingen.keys().next().value);
  return g;
}
export const nieuwSpel = (niveau, seed) => ({ v: 1, niveau, seed: String(seed), zetten: [] });
export function stand(s, tot = s.zetten.length) {
  let g = deling(s.niveau, s.seed);
  for (let i = 0; i < tot; i++) g = speel(g, s.zetten[i]);
  return g;
}

// ----- Welke zetten zijn er? -----
// Geeft elke mogelijke zet, in een volgorde die handig is voor de zoeker: fundamenten, onthullen, aflegstapel, de rest, trekken.
export function zetten(g, { terugNaarStapel = false } = {}) {
  const uit = [];
  const wk = g.waste.length ? g.waste[g.waste.length - 1] : -1;
  if (wk >= 0 && pastOpFundament(g, wk)) uit.push(['wf']);
  g.tab.forEach((c, i) => { if (c.k.length && pastOpFundament(g, c.k[c.k.length - 1])) uit.push(['tf', i]); });
  const rest = [];
  g.tab.forEach((c, van) => {
    for (let n = c.u; n >= 1; n--) {
      const eerste = c.k[c.k.length - n];
      const onthult = n === c.u && c.k.length > n;
      for (let naar = 0; naar < 7; naar++) {
        if (naar === van || !pastOpStapel(g, eerste, naar)) continue;
        if (rang(eerste) === 12 && c.k.length === n) continue;                  // een heer die al onderaan een lege stapel staat, verhuizen heeft geen zin
        (onthult ? uit : rest).push(['tt', van, n, naar]);
      }
    }
  });
  if (wk >= 0) for (let naar = 0; naar < 7; naar++) if (pastOpStapel(g, wk, naar)) uit.push(['wt', naar]);
  uit.push(...rest);
  if (terugNaarStapel) for (let s = 0; s < 4; s++) if (g.found[s] > 1) for (let naar = 0; naar < 7; naar++) if (pastOpStapel(g, s * 13 + g.found[s] - 1, naar)) uit.push(['ft', s, naar]);
  if (g.stock.length) uit.push(['d']); else if (g.waste.length) uit.push(['r']);
  return uit;
}

// Waar kan deze kaart (of rij kaarten) heen? bron: { soort: 'waste' } | { soort: 'tab', van, n } | { soort: 'found', s }
export function bestemmingen(g, bron) {
  const uit = { fundament: false, stapels: [] };
  let kaart;
  if (bron.soort === 'waste') kaart = g.waste.length ? g.waste[g.waste.length - 1] : -1;
  else if (bron.soort === 'found') kaart = g.found[bron.s] > 0 ? bron.s * 13 + g.found[bron.s] - 1 : -1;
  else { const c = g.tab[bron.van]; kaart = c && bron.n >= 1 && bron.n <= c.u ? c.k[c.k.length - bron.n] : -1; }
  if (kaart < 0) return uit;
  const enkel = bron.soort !== 'tab' || bron.n === 1;
  if (enkel && !(bron.soort === 'found') && pastOpFundament(g, kaart)) uit.fundament = true;
  for (let naar = 0; naar < 7; naar++) {
    if (bron.soort === 'tab' && naar === bron.van) continue;
    if (!pastOpStapel(g, kaart, naar)) continue;
    if (bron.soort === 'tab' && rang(kaart) === 12 && g.tab[bron.van].k.length === bron.n) continue;
    uit.stapels.push(naar);
  }
  return uit;
}

// De zet die bij een bron en een bestemming hoort
export function zetVoor(bron, doel) {
  if (doel.soort === 'fundament') return bron.soort === 'waste' ? ['wf'] : ['tf', bron.van];
  if (bron.soort === 'waste') return ['wt', doel.naar];
  if (bron.soort === 'found') return ['ft', bron.s, doel.naar];
  return ['tt', bron.van, bron.n, doel.naar];
}

// ----- De zoeker: kan dit spel nog gewonnen worden, en hoe? -----
// Diepte eerst, met onthouden van eerdere standen. Een kaart naar het fundament die nooit in de weg zit gaat altijd meteen.
const sleutelVan = (g) => `${g.tab.map((c) => `${c.k.join(',')}/${c.u}`).join(';')}|${g.stock.join(',')}|${g.waste.join(',')}|${g.found.join(',')}`;
function veiligNaarFundament(g) {
  const veilig = (k) => {
    const r = rang(k);
    if (r <= 1) return true;
    const rood = isRood(k);
    const [a, b] = rood ? [0, 3] : [1, 2];
    return g.found[a] >= r && g.found[b] >= r;
  };
  const wk = g.waste.length ? g.waste[g.waste.length - 1] : -1;
  if (wk >= 0 && pastOpFundament(g, wk) && veilig(wk)) return ['wf'];
  for (let i = 0; i < 7; i++) { const c = g.tab[i]; if (c.k.length) { const k = c.k[c.k.length - 1]; if (pastOpFundament(g, k) && veilig(k)) return ['tf', i]; } }
  return null;
}

// Geeft { gevonden: true, pad } als er een weg naar de winst is; { gevonden: false, bewezen: true } als die er zeker niet is;
// { gevonden: false, bewezen: false } als het budget (aantal stappen) op was voor we het wisten.
// "Beste eerst": de stand die er het best uitziet (veel op de fundamenten, weinig verborgen kaarten) komt het eerst aan de beurt,
// zodat de gevonden weg kort en natuurlijk is in plaats van een eindeloze omweg.
const waarde = (g) => {
  let verborgen = 0, leeg = 0;
  for (const c of g.tab) { verborgen += c.k.length - c.u; if (!c.k.length) leeg++; }
  return opFundamenten(g) * 10 - verborgen * 5 + leeg * 2;
};
class Hoop {
  constructor() { this.a = []; }
  get length() { return this.a.length; }
  push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
}
export function zoek(begin, budget = 40000, ms = Infinity) {
  const klok = ms === Infinity ? 0 : Date.now() + ms;
  const gezien = new Set();
  const hoop = new Hoop();
  let teller = 0;
  hoop.push({ g: begin, diepte: 0, ouder: null, zet: null, f: -waarde(begin), n: teller++ });
  let stappen = 0;
  while (hoop.length) {
    const knoop = hoop.pop();
    const g = knoop.g;
    if (klaar(g)) {
      const pad = [];
      for (let k = knoop; k.ouder; k = k.ouder) pad.push(k.zet);
      return { gevonden: true, pad: pad.reverse() };
    }
    const sl = sleutelVan(g);
    if (gezien.has(sl)) continue;
    gezien.add(sl);
    if (++stappen > budget || (klok && stappen % 128 === 0 && Date.now() > klok)) return { gevonden: false, bewezen: false };
    const v = veiligNaarFundament(g);
    for (const z of v ? [v] : zetten(g, { terugNaarStapel: true })) {
      let n;
      try { n = speel(g, z); } catch { continue; }
      if (gezien.has(sleutelVan(n))) continue;
      hoop.push({ g: n, diepte: knoop.diepte + 1, ouder: knoop, zet: z, f: -waarde(n) + knoop.diepte * 1.2 + (z[0] === 'd' ? 0.5 : 0), n: teller++ });
    }
  }
  return { gevonden: false, bewezen: true };
}

// Een tip: de volgende zet van een weg naar de winst. Die weg (het plan) wordt bewaard, zodat opeenvolgende tips bij elkaar passen:
// volg je het plan (of kom je er later weer op uit), dan is de volgende tip gewoon de volgende stap.
export function maakPlan(g, budget = 30000, ms = 1500) {
  const r = zoek(g, budget, ms);
  if (!r.gevonden) return { ...r, pad: [], sleutels: [] };
  // De zoeker dwaalt soms eerst rond: een stand die twee keer voorkomt betekent dat alles ertussen weggelaten kan worden
  const pad = [], sleutels = [], plek = new Map(); let n = g;
  for (const z of r.pad) {
    const sl = sleutelVan(n);
    if (plek.has(sl)) { const j = plek.get(sl); for (const k of sleutels.splice(j)) plek.delete(k); pad.length = j; }
    plek.set(sl, sleutels.length); sleutels.push(sl); pad.push(z);
    n = speel(n, z);
  }
  return { gevonden: true, pad, sleutels };
}
// Geeft { zet, plan, zeker } of { zet: null, bewezenVerloren } als er geen zet is die verder helpt.
export function tip(g, plan = null) {
  if (klaar(g)) return { zet: null };
  let p = plan;
  let i = p?.gevonden ? p.sleutels.indexOf(sleutelVan(g)) : -1;
  if (i < 0) { p = maakPlan(g); i = p.gevonden ? 0 : -1; }
  if (i >= 0) return { zet: p.pad[i], plan: p, zeker: true };
  if (p.bewezen) return { zet: null, plan: p, bewezenVerloren: true };
  const opties = zetten(g).filter((z) => z[0] !== 'r');
  return opties.length ? { zet: opties[0], plan: p, zeker: false } : { zet: null, plan: p };
}
