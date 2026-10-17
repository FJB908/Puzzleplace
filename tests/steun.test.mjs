import test from 'node:test';
import assert from 'node:assert/strict';
import { DAG, isRustig, extraTipWeg, tipStand, tipGebruikt, tipVerdiend, kaartTonen, KAART_NA_SPELLEN, KAART_MAX_NEE, KAART_PAUZE_DAGEN } from '../js/steun/regels.js';

const uit = { supporter: false, video: false, rustig: false };
const metVideo = { supporter: false, video: true, rustig: false };

test('de eerste dagen zijn rustig, ook als het eerste gebruik nog niet bekend is', () => {
  const nu = 100 * DAG;
  assert.equal(isRustig(null, nu, 7), true);
  assert.equal(isRustig(nu - 6 * DAG, nu, 7), true);
  assert.equal(isRustig(nu - 7 * DAG, nu, 7), false);
  assert.equal(isRustig(nu, nu, 0), false);                          // testmodus: geen rustige dagen
});

test('zolang steun uit staat werkt de tip zoals altijd: één per spel, daarna uit', () => {
  const s = {};
  assert.equal(tipStand(s, uit), 'gratis');
  tipGebruikt(s, uit);
  assert.equal(s.tip, true);
  assert.equal(tipStand(s, uit), null);
});

test('na de gratis tip kost een extra tip een video, behalve in de rustige dagen', () => {
  const s = { tip: true };
  assert.equal(tipStand(s, metVideo), 'video');
  assert.equal(tipStand(s, { ...metVideo, rustig: true }), null);
  assert.equal(extraTipWeg({ ...metVideo, rustig: true }), null);
});

test('een bekeken video levert één tip op, die pas opgaat als de tip echt is gegeven', () => {
  const s = { tip: true };
  tipVerdiend(s);
  assert.equal(s.tipTegoed, 1);
  assert.equal(tipStand(s, metVideo), 'tegoed');
  assert.equal(tipStand(s, uit), 'tegoed');                          // ook als video's later uitgaan blijft verdiend tegoed bruikbaar
  tipGebruikt(s, metVideo);
  assert.equal(s.tipTegoed, 0);
  assert.equal(tipStand(s, metVideo), 'video');
});

test('de gratis tip en een tegoed gaan niet door elkaar', () => {
  const s = {};
  tipVerdiend(s);                                                     // (kan niet via het scherm, maar de regels moeten kloppen)
  assert.equal(tipStand(s, metVideo), 'gratis');
  tipGebruikt(s, metVideo);
  assert.equal(s.tip, true);
  assert.equal(s.tipTegoed, 1);
});

test('een Supporter heeft onbeperkt tips, ook als de schakelaars uitstaan, en gebruikt niets op', () => {
  const sup = { supporter: true, video: false, rustig: true };
  const s = { tip: true, tipTegoed: 1 };
  assert.equal(tipStand(s, sup), 'supporter');
  tipGebruikt(s, sup);
  assert.equal(s.tipTegoed, 1);
  assert.equal(extraTipWeg(sup), 'supporter');
});

test('het kaartje komt pas na genoeg spellen, nooit in de rustige dagen, nooit voor een Supporter', () => {
  const basis = { bijdrage: true, supporter: false, rustig: false, voltooid: KAART_NA_SPELLEN, nee: 0, laatsteVraag: null, nu: 1000 * DAG };
  assert.equal(kaartTonen(basis), true);
  assert.equal(kaartTonen({ ...basis, voltooid: KAART_NA_SPELLEN - 1 }), false);
  assert.equal(kaartTonen({ ...basis, rustig: true }), false);
  assert.equal(kaartTonen({ ...basis, supporter: true }), false);
  assert.equal(kaartTonen({ ...basis, bijdrage: false }), false);
});

test('na "Nu niet" wacht het kaartje en na twee keer komt het niet meer terug', () => {
  const basis = { bijdrage: true, supporter: false, rustig: false, voltooid: 50, nee: 1, laatsteVraag: 1000 * DAG, nu: 1000 * DAG };
  assert.equal(kaartTonen(basis), false);
  assert.equal(kaartTonen({ ...basis, nu: (1000 + KAART_PAUZE_DAGEN - 1) * DAG }), false);
  assert.equal(kaartTonen({ ...basis, nu: (1000 + KAART_PAUZE_DAGEN) * DAG }), true);
  assert.equal(kaartTonen({ ...basis, nee: KAART_MAX_NEE, nu: (1000 + 365) * DAG }), false);
});
