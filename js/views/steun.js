// "Hoe verdient deze app geld?": eerlijk en in gewone taal uitgelegd wat gratis is, wat een video doet en wat de eenmalige bijdrage geeft.
// De pagina bestaat alleen als steun aan staat (zie js/steun/ en docs/STEUN.md); anders is het een gewone "niet gevonden".

import { h, icon, announce } from '../ui.js';
import { t } from '../i18n/index.js';
import * as steun from '../steun/index.js';
import { notFoundView } from './notFound.js';

const metTijdslimiet = (belofte, ms) => Promise.race([belofte, new Promise((r) => setTimeout(() => r(null), ms))]);

export async function steunView(_params, app) {
  if (!steun.zichtbaar()) return notFoundView();
  const bijdrage = steun.bijdrageAan(), video = steun.videoAan();
  const supporter = steun.isSupporter();
  const ruwePrijs = bijdrage && !supporter ? await metTijdslimiet(steun.prijs(), 1500) : null;
  const prijs = ruwePrijs ? String(ruwePrijs).replace(/\s/g, '\u00a0') : null;          // het bedrag breekt niet af midden in "€ 4,99"

  const weg = (titel, tekst) => h('div', { class: 'steun-weg' }, h('h3', {}, titel), h('p', {}, tekst));
  const status = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });

  let bijdrageKaart = null;
  if (bijdrage && supporter) {
    bijdrageKaart = h('section', { class: 'card stack steun-dank', 'aria-labelledby': 'steun-dank-titel' },
      h('h2', { id: 'steun-dank-titel' }, t('steun.thanks.title')), h('p', {}, t('steun.thanks.text')));
  } else if (bijdrage) {
    const koop = h('button', {
      type: 'button', class: 'btn btn-primary btn-block',
      onclick: async () => {
        koop.disabled = true;
        const r = await steun.wordSupporter();
        koop.disabled = false;
        if (r === 'gekocht') { announce(t('steun.thanks.title')); app.refresh(); }
      },
    }, icon('heart'), prijs ? t('steun.become', { price: prijs }) : t('steun.becomeNoPrice'));
    const herstel = h('button', {
      type: 'button', class: 'btn btn-quiet',
      onclick: async () => {
        const r = await steun.herstelAankoop();
        if (r === 'hersteld') { announce(t('steun.restore.done')); app.refresh(); }
        else if (r === 'geen') status.textContent = t('steun.restore.none');
      },
    }, t('steun.restore'));
    bijdrageKaart = h('section', { class: 'card stack', 'aria-label': t('steun.way.supporter.title') }, koop, herstel, status);
  }

  const node = h('div', { class: 'view steun-pagina' },
    h('header', { class: 'page-header' },
      h('h1', { tabindex: '-1' }, t('steun.page.heading')),
      h('p', {}, t('steun.page.lead'))),
    h('section', { class: 'card stack' }, h('p', {}, t('steun.free')), h('p', {}, t('steun.costs'))),
    h('section', { class: 'card stack', 'aria-labelledby': 'steun-wegen' },
      h('h2', { id: 'steun-wegen' }, t('steun.ways')),
      video ? weg(t('steun.way.video.title'), t('steun.way.video.text')) : null,
      bijdrage ? weg(t('steun.way.supporter.title'), t('steun.way.supporter.text')) : null,
      h('p', { class: 'muted' }, t('steun.way.nothing'))),
    bijdrageKaart,
    video ? h('p', { class: 'muted' }, t('steun.privacy')) : null,
    steun.testModus ? h('p', { class: 'steun-test' }, t('steun.testNote')) : null,
  );
  return { title: t('steun.title'), nav: 'settings', decor: 'hang-links', node };
}
