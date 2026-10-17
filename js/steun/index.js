// Steun: een extra tip met een korte video, en de eenmalige bijdrage "Supporter van Puzzleplace". Zie docs/STEUN.md.
//
// De spellen met één tip per spel (Sudoku, Mahjong, Patience, Letterhof) vragen hier om toestemming voor een tip en laten de knop hier
// zijn stand bepalen. Staat alles uit (zoals nu), dan doet dit niets: de tipknop werkt precies zoals voorheen.
//
//   if (!(await tipToestemming(state))) return;      // vraagt zo nodig om een video; false = geen tip (de speler weet waarom)
//   ... zoek de tip; is er geen, dan stoppen: er is dan niets opgegaan ...
//   tipGebruikt(state);                              // legt vast dat de tip echt is gegeven
//   tipKnopStand(tipKnop, state, spelIsKlaar);       // bij elke verversing: aan/uit, "Nog een tip" en het videopictogram

import { STEUN } from '../config.js';
import * as store from '../store.js';
import { h, icon } from '../ui.js';
import { t } from '../i18n/index.js';
import { isRustig, tipStand, tipGebruikt as gebruikt, tipVerdiend, kaartTonen } from './regels.js';
import { SteunFout, zetAanbieders, videoAanbieder, aankoopAanbieder, testAanbieders } from './aanbieders.js';
import * as dlg from './dialogen.js';

export { zetAanbieders };

// ----- Testmodus: alleen op localhost, met ?steuntest=1 achter het adres (of 'snel' voor een nepvideo van een halve seconde, 'week' om de rustige eerste week te houden) -----
const lokaal = typeof location !== 'undefined' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
function leesTest() {
  if (!lokaal) return null;
  try {
    const q = new URLSearchParams(location.search).get('steuntest');
    if (q) sessionStorage.setItem('pp-steuntest', q);
    return sessionStorage.getItem('pp-steuntest');
  } catch { return null; }
}
export const testModus = leesTest();

/** Eén keer bij het opstarten: het eerste gebruik vastleggen (voor de rustige eerste dagen) en in de testmodus de testaanbieders aansluiten. */
export function starten() {
  if (store.getSteun().sinds == null) store.setSteun({ sinds: Date.now() });
  if (testModus) zetAanbieders(testAanbieders({ duur: testModus === 'snel' || testModus === 'week' ? 300 : 4000 }));
}

// ----- Wat is er aan? -----
export const videoAan = () => (STEUN.video || !!testModus) && !!videoAanbieder();
export const bijdrageAan = () => (STEUN.bijdrage || !!testModus) && !!aankoopAanbieder();
export const isSupporter = () => store.getSteun().supporter;
/** Is er iets te laten zien (de uitlegpagina, de link in de instellingen)? */
export const zichtbaar = () => videoAan() || bijdrageAan();

const rustigeDagen = () => (testModus && testModus !== 'week' ? 0 : STEUN.rustigeDagen);
const rustig = () => isRustig(store.getSteun().sinds, Date.now(), rustigeDagen());
const kansen = () => ({ supporter: isSupporter(), video: videoAan(), rustig: rustig() });
const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;

// ----- Een extra tip -----
let bezig = false, voorgeladen = false;

async function melding(e, wat) {
  const code = e instanceof SteunFout ? e.code : 'fout';
  if (code === 'offline' || !online()) await dlg.geenInternet(wat);
  else if (code === 'geen-aanbod') await dlg.geenVideo();
  else await dlg.mislukt(wat);
}

// Eerst vragen, dan de video. Alleen een tot het eind bekeken video levert een tip op; zonder internet gebeurt er niets behalve de melding.
async function vraagVideo() {
  if (bezig) return false;
  bezig = true;
  try {
    if (!online()) { await dlg.geenInternet('video'); return false; }
    const keuze = await dlg.videoVraag({ uitlegLink: bijdrageAan() });
    if (keuze === 'supporter') { location.hash = '#/steun'; return false; }
    if (keuze !== 'ja') return false;
    if (!online()) { await dlg.geenInternet('video'); return false; }            // ondertussen weggevallen
    try {
      if ((await videoAanbieder().toon()) === 'beloond') return true;
      await dlg.nietAfgekeken();
      return false;
    } catch (e) { await melding(e, 'video'); return false; }
  } finally { bezig = false; }
}

/**
 * Mag het spel nu een tip geven? Zo nodig vraagt dit eerst om een video. `state` is de bewaarde stand van het spel (state.tip, state.tipTegoed).
 * `voor` en `na` zijn voor een spel met een klok: die staat stil zolang de vraag of de video op het scherm is.
 */
export async function tipToestemming(state, { voor, na } = {}) {
  const stand = tipStand(state, kansen());
  if (stand === 'gratis' || stand === 'supporter' || stand === 'tegoed') return true;
  if (stand !== 'video') return false;
  voor?.();
  let ok = false;
  try { ok = await vraagVideo(); } finally { na?.(); }
  if (!ok) return false;
  tipVerdiend(state);                      // bewaard tot de tip echt gegeven is: is er toch geen tip te geven, dan gaat de video niet verloren
  return true;
}

/** De tip is echt gegeven. */
export const tipGebruikt = (state) => gebruikt(state, kansen());

/** Zet de tipknop goed: uit als er niets meer kan, "Nog een tip" met een opvallend videopictogram als een video een tip oplevert. `geblokkeerd`: het spel zelf laat nu geen tip toe. */
export function tipKnopStand(knop, state, geblokkeerd = false) {
  const stand = tipStand(state, kansen());
  const metVideo = stand === 'video' && !geblokkeerd;
  knop.disabled = geblokkeerd || stand === null;
  const label = [...knop.children].reverse().find((e) => e.tagName === 'SPAN' && !e.classList.contains('tip-video'));
  if (label) { label.dataset.basis ??= label.textContent; label.textContent = metVideo ? t('steun.moreTip') : label.dataset.basis; }
  knop.classList.toggle('tip-met-video', metVideo);
  knop.parentElement?.classList.toggle('met-tip-video', metVideo);               // de rij met knoppen maakt ruimte boven het label
  if (metVideo) knop.setAttribute('aria-label', t('steun.moreTipAria')); else knop.removeAttribute('aria-label');
  const badge = knop.querySelector(':scope > .tip-video');
  if (metVideo && !badge) knop.append(h('span', { class: 'tip-video', 'aria-hidden': 'true' }, icon('video'), h('span', {}, t('steun.videoBadge'))));
  else if (!metVideo && badge) badge.remove();
  if (metVideo && !voorgeladen) {                                                  // de video alvast klaarzetten, zodat hij snel start
    voorgeladen = true;
    try { videoAanbieder()?.voorlaad?.()?.catch?.(() => { voorgeladen = false; }); } catch { voorgeladen = false; }
  }
}

// ----- De eenmalige bijdrage -----
/** @returns {Promise<'gekocht'|'gestopt'|'offline'|'fout'>} */
export async function wordSupporter() {
  if (!online()) { await dlg.geenInternet('koop'); return 'offline'; }
  try {
    const r = await aankoopAanbieder().koop();
    if (r !== 'gekocht') return 'gestopt';
    store.setSteun({ supporter: true });
    return 'gekocht';
  } catch (e) { await melding(e, 'koop'); return 'fout'; }
}

/** Een eerdere aankoop terughalen (nieuw toestel, opnieuw geïnstalleerd). @returns {Promise<'hersteld'|'geen'|'offline'|'fout'>} */
export async function herstelAankoop() {
  if (!online()) { await dlg.geenInternet('koop'); return 'offline'; }
  try {
    if (!(await aankoopAanbieder().herstel())) return 'geen';
    store.setSteun({ supporter: true });
    return 'hersteld';
  } catch (e) { await melding(e, 'koop'); return 'fout'; }
}

export const prijs = () => Promise.resolve(aankoopAanbieder()?.prijs?.()).catch(() => null);

// ----- Het kaartje op Start -----
export function toonKaart() {
  const s = store.getSteun();
  return kaartTonen({ bijdrage: bijdrageAan(), supporter: s.supporter, rustig: rustig(), voltooid: store.totalCompleted(), nee: s.nee, laatsteVraag: s.laatsteVraag, nu: Date.now() });
}
export function kaartNuNiet() {
  const s = store.getSteun();
  store.setSteun({ nee: s.nee + 1, laatsteVraag: Date.now() });
}
/** Het kaartje is bekeken (bijvoorbeeld de uitleg geopend): een tijd niet opnieuw tonen, zonder dat het als "Nu niet" telt. */
export function kaartGezien() { store.setSteun({ laatsteVraag: Date.now() }); }
