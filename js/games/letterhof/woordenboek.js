// Het woordenboek van Letterhof: de lijst van een taal (talen/<taal>.js, gemaakt door tools/scrabble/) als een compacte boom.
//
// Een lijst heeft honderdduizenden woorden (Pools ruim 450.000), dus er komt geen Set met teksten of een boom van objecten: de boom staat in vier
// rijen getallen (letter, eerste kind, volgende broer, vlag). Het bouwen kost een enkele keer een tel en daarna is elk opzoeken een korte wandeling.

// De letters van de stenen per taal (volgorde bepaalt het nummer van de letter in de boom en de bitmaskers van de computer)
export const ALFABET = {
  nl: 'abcdefghijklmnopqrstuvwxyz',
  en: 'abcdefghijklmnopqrstuvwxyz',
  de: 'abcdefghijklmnopqrstuvwxyzäöü',
  fr: 'abcdefghijklmnopqrstuvwxyz',
  es: 'abcdefghijklmnopqrstuvwxyzñ',
  it: 'abcdefghilmnopqrstuvz',
  pt: 'abcdefghijklmnopqrstuvwxyzç',
  pl: 'aąbcćdeęfghijklłmnńoóprsśtuwyzźż',
};
export const TALEN = Object.keys(ALFABET);

// vlag: bit 0 = hier eindigt een woord, bit 1-2 = laag (0 zeldzaam, 1 gangbaar, 2 kern), bit 3 = grof
const EIND = 1, RUW = 8;

const HEX = '0123456789abcdef';
const LAAG = { '0': 0, '1': 1, '2': 2, r: 0 };

export class Woordenboek {
  /** @param {string} alfabet de letters van de taal  @param {string} tekst de ingepakte lijst (zie tools/scrabble/pak.py) */
  constructor(alfabet, tekst) {
    this.alfabet = alfabet;
    this.n = alfabet.length;
    this.index = new Map([...alfabet].map((c, i) => [c, i + 1]));      // letter -> 1..n (0 is de wortel)
    const regels = tekst.split('\n');
    let knopen = 1;
    for (const r of regels) if (r.length >= 2) knopen += r.length - 2;  // elk woord voegt zijn "rest" toe aan de boom
    const letter = this.letter = new Uint8Array(knopen);
    const eerste = this.eerste = new Int32Array(knopen).fill(-1);
    const volgende = this.volgende = new Int32Array(knopen).fill(-1);
    const vlag = this.vlag = new Uint8Array(knopen);
    const pad = new Int32Array(40);                                     // de knopen van het vorige woord: pad[d] is de knoop op diepte d
    let vorigeLengte = 0, teller = 1, aantal = 0;
    for (const r of regels) {
      if (r.length < 2) continue;
      const p = HEX.indexOf(r[0]), lg = LAAG[r[1]];
      let ouder = pad[p];
      for (let i = 2; i < r.length; i++) {
        const k = teller++;
        letter[k] = this.index.get(r[i]);
        if (i === 2 && vorigeLengte > p) volgende[pad[p + 1]] = k; else if (eerste[ouder] < 0) eerste[ouder] = k;
        else { let b = eerste[ouder]; while (volgende[b] >= 0) b = volgende[b]; volgende[b] = k; }
        pad[p + i - 1] = ouder = k;
      }
      vorigeLengte = p + r.length - 2;
      vlag[ouder] |= EIND | (lg << 1) | (r[1] === 'r' ? RUW : 0);
      aantal++;
    }
    this.aantal = aantal;
  }

  /** De knoop die hoort bij letter-nummer `l` onder knoop `k`, of -1. */
  kind(k, l) {
    for (let b = this.eerste[k]; b >= 0; b = this.volgende[b]) if (this.letter[b] === l) return b;
    return -1;
  }
  /** Eindigt hier een woord? (alleen als `minLaag` gehaald wordt en het geen grof woord is, als `zonderRuw`) */
  isEind(k) { return (this.vlag[k] & EIND) !== 0; }
  laag(k) { return (this.vlag[k] >> 1) & 3; }
  isRuw(k) { return (this.vlag[k] & RUW) !== 0; }

  /** De knoop van een woord (tekst in kleine letters van het alfabet) of -1. */
  knoop(w) {
    let k = 0;
    for (const c of w) {
      const l = this.index.get(c);
      if (!l) return -1;
      k = this.kind(k, l);
      if (k < 0) return -1;
    }
    return k;
  }
  heeft(w) { const k = w.length >= 2 ? this.knoop(w) : -1; return k > 0 && this.isEind(k); }
  /** Laag van een woord: 2 kern, 1 gangbaar, 0 zeldzaam, -1 staat er niet in */
  laagVan(w) { const k = this.knoop(w); return k > 0 && this.isEind(k) ? this.laag(k) : -1; }
}

/** Pakt een lijst van [woord, laag] (laag '2' '1' '0' of 'r') in zoals tools/scrabble/pak.py (voor de tests). */
export function pakWoorden(lijst) {
  const rijen = [...lijst].map((x) => (typeof x === 'string' ? [x, '1'] : x)).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  let vorig = '';
  return rijen.map(([w, laag]) => {
    let p = 0;
    while (p < vorig.length && p < w.length && p < 15 && vorig[p] === w[p]) p++;
    vorig = w;
    return HEX[p] + laag + w.slice(p);
  }).join('\n');
}

// De woordenboeken worden pas geladen als ze nodig zijn en daarna bewaard
const geladen = new Map();
export async function laadWoordenboek(taal) {
  if (!ALFABET[taal]) throw new Error(`Letterhof heeft geen woordenlijst voor "${taal}"`);
  if (!geladen.has(taal)) geladen.set(taal, import(`./talen/${taal}.js`).then((m) => new Woordenboek(ALFABET[taal], m.WOORDEN)));
  return geladen.get(taal);
}
