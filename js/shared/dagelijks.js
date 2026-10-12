// De puzzel van de dag (altijd Sudoku): welke dag, welk niveau, en de reeks van dagen die je achter elkaar hebt opgelost.
// Alleen zuivere functies met datums als tekst ("JJJJ-MM-DD", lokale tijd), zodat ze goed te testen zijn.

export const BEGIN = '2025-01-01';                       // het archief begint hier

const naarDatum = (dag) => { const [j, m, d] = dag.split('-').map(Number); return new Date(j, m - 1, d, 12); };
export const dagSleutel = (datum) => datum.toLocaleDateString('sv-SE');
export const geldigeDag = (dag) => typeof dag === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dag) && dagSleutel(naarDatum(dag)) === dag;
export const verschuif = (dag, n) => { const d = naarDatum(dag); d.setDate(d.getDate() + n); return dagSleutel(d); };

// Elke dag een vast niveau, voor iedereen hetzelfde: ergens tussen gemiddeld en moeilijk (de ene dag wat rustiger, de andere wat pittiger)
export function dagMoeilijkheid(dag) {
  let n = 0;
  for (const ch of dag) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return (n >> 3) % 2 ? 'moeilijk' : 'gemiddeld';
}

// Mag deze dag gespeeld worden? Niet in de toekomst en niet van voor het begin van het archief.
export const speelbaar = (dag, vandaag) => geldigeDag(dag) && dag >= BEGIN && dag <= vandaag;

// De reeks van dagen achter elkaar die je hebt opgelost, tot en met vandaag (of gisteren, als vandaag nog kan)
export function reeks(gedaan, vandaag) {
  const heeft = (d) => (gedaan instanceof Set ? gedaan.has(d) : Object.hasOwn(gedaan, d));
  let dag = heeft(vandaag) ? vandaag : verschuif(vandaag, -1);
  let n = 0;
  while (heeft(dag)) { n++; dag = verschuif(dag, -1); }
  return n;
}
export function langsteReeks(gedaan) {
  const dagen = (gedaan instanceof Set ? [...gedaan] : Object.keys(gedaan)).filter(geldigeDag).sort();
  let beste = 0, nu = 0, vorige = null;
  for (const d of dagen) { nu = vorige && verschuif(vorige, 1) === d ? nu + 1 : 1; beste = Math.max(beste, nu); vorige = d; }
  return beste;
}

// Een maand als weken (maandag eerst): elke week 7 vakjes, een dag als tekst of null voor een lege plek
export function maandRooster(jaar, maand) {                 // maand 0 tot 11
  const eerste = new Date(jaar, maand, 1, 12);
  const voor = (eerste.getDay() + 6) % 7;
  const dagen = new Date(jaar, maand + 1, 0).getDate();
  const cellen = [...Array(voor).fill(null), ...Array.from({ length: dagen }, (_, k) => dagSleutel(new Date(jaar, maand, k + 1, 12)))];
  while (cellen.length % 7) cellen.push(null);
  return Array.from({ length: cellen.length / 7 }, (_, w) => cellen.slice(w * 7, w * 7 + 7));
}

// Tijd als tekst: 4:05, of 1:02:09 vanaf een uur
export function tijdTekst(seconden) {
  const s = Math.max(0, Math.round(seconden || 0));
  const u = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const twee = (n) => String(n).padStart(2, '0');
  return u ? `${u}:${twee(m)}:${twee(r)}` : `${twee(m)}:${twee(r)}`;
}
