// "Sudoku van vandaag": een compact lint met een kalenderblaadje, de stand van vandaag en je reeks, plus een knopje naar het archief.
// Het niveau staat er bewust niet bij: dat zie je pas als je de Sudoku hebt opgelost.

import { h, icon } from '../ui.js';
import { t, datumTekst } from '../i18n/index.js';
import * as store from '../store.js';
import { reeks, tijdTekst } from '../shared/dagelijks.js';

const ID = 'sudoku';

export function dagLint() {
  const today = store.todayKey();
  const rec = store.getDaily(ID);
  const gedaan = rec[today];
  const bezig = !gedaan && store.getSlot(ID, store.dailySlot(today))?.state != null;
  const n = reeks(rec, today);
  const now = new Date();
  const maand = datumTekst(now, { month: 'short' }).replace('.', '');
  const status = gedaan ? (gedaan.time != null ? t('home.dailyDoneTime', { time: tijdTekst(gedaan.time) }) : t('home.dailyDone')) : bezig ? t('home.dailyBusy') : t('home.dailyHint');
  return h('div', { class: `dag-lint${gedaan ? ' is-done' : ''}${bezig ? ' is-bezig' : ''}` },
    h('a', { class: 'dl-hoofd', href: `#/spel/${ID}/speel/dagelijks` },
      h('span', { class: 'cal', 'aria-hidden': 'true' }, h('small', {}, maand), h('b', {}, String(now.getDate()))),
      h('span', { class: 'dl-tekst' },
        h('strong', {}, t('home.daily')),
        h('span', { class: 'dl-status' }, gedaan ? icon('check') : null, status)),
      n > 0 ? h('span', { class: 'dl-reeks', title: t('home.dailyStreak', { n }) }, icon('flame'), h('b', {}, String(n))) : null),
    h('a', { class: 'dl-archief', href: `#/spel/${ID}/dagelijks`, 'aria-label': t('home.dailyArchive') }, icon('calendar')));
}
