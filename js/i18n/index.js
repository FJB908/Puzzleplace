// Talen in de app: welke taal spreekt de bezoeker, de teksten ophalen en de pagina in die taal zetten.
//
// Engels is de officiële taal van de app en staat altijd klaar (en vult aan als een vertaling iets mist). Alle andere talen
// worden pas geladen als ze nodig zijn. Teksten staan in js/i18n/talen/<taal>.js (gemaakt uit tools/i18n/bron, zie daar).

import { TALEN, STANDAARD_TAAL, herkenTaal, isTaal } from '../shared/talen.js';
import { invullen, zoek } from '../shared/opmaak.js';
import EN from './talen/en.js';

let taal = STANDAARD_TAAL;
let pakket = EN;
const luisteraars = new Set();
export const getTaal = () => taal;
export const taalInfo = () => TALEN[taal];
export const onTaal = (fn) => { luisteraars.add(fn); return () => luisteraars.delete(fn); };

const ontbreekt = new Set();
export function t(sleutel, params) {
  let tekst = zoek(pakket, sleutel, params, taal);
  if (tekst === undefined && pakket !== EN) tekst = zoek(EN, sleutel, params, 'en');
  if (tekst === undefined) {
    if (!ontbreekt.has(sleutel)) { ontbreekt.add(sleutel); console.warn(`Tekst ontbreekt: ${sleutel}`); }
    return sleutel;
  }
  return invullen(tekst, params);
}

// Een lijstje teksten: sleutel.1, sleutel.2, ... (bijvoorbeeld de uitleg van een spel)
export function tLijst(sleutel, params) {
  const uit = [];
  for (let i = 1; zoek(EN, `${sleutel}.${i}`) !== undefined; i++) uit.push(t(`${sleutel}.${i}`, params));
  return uit;
}

// Een fout van de server of de app voor de speler: vertaald als we de sleutel kennen (e.key, zie server/api.mjs), anders de Engelse tekst
export function foutTekst(e) {
  if (e && e.key && (zoek(pakket, `err.${e.key}`, e.params, taal) !== undefined || zoek(EN, `err.${e.key}`, e.params, 'en') !== undefined)) return t(`err.${e.key}`, e.params);
  return (e && e.message) || t('common.somethingWentWrong');
}

export const heeftTekst = (sleutel) => zoek(pakket, sleutel) !== undefined || zoek(EN, sleutel) !== undefined;

// Datums en getallen in de gewoonte van de taal
export const datumTekst = (datum, opties) => datum.toLocaleDateString(TALEN[taal].locale, opties);
export const tijdTekst = (datum, opties) => datum.toLocaleTimeString(TALEN[taal].locale, opties);
export const sorteer = (a, b) => a.localeCompare(b, TALEN[taal].locale);

// De taal van een bezoeker: wat hij zelf koos, anders wat zijn browser aangeeft. Geen van beide? Dan null: vraag het.
export function bepaalTaal(keuze, voorkeuren = (typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [])) {
  if (keuze && isTaal(keuze)) return keuze;
  return herkenTaal(voorkeuren);
}

export async function zetTaal(id) {
  if (!isTaal(id)) id = STANDAARD_TAAL;
  if (id !== 'en') {
    try { pakket = (await import(`./talen/${id}.js`)).default; }
    catch (e) { console.error(`Taal ${id} kon niet worden geladen`, e); id = 'en'; pakket = EN; }
  } else pakket = EN;
  taal = id;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = TALEN[id].locale;
    document.documentElement.dataset.taal = id;
    const titel = t('app.name');
    if (document.title) document.title = titel;
  }
  luisteraars.forEach((fn) => fn(id));
  return id;
}
