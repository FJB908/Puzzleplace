// Taalkeuze: de eerste keer als de app de taal van je toestel niet kent, en later via Instellingen.
// Elke taal staat in zijn eigen naam (en met de Engelse naam eronder), zodat je je taal ook herkent als de rest van het scherm je niet helpt.

import { h, icon } from '../ui.js';
import { t, getTaal, zetTaal } from '../i18n/index.js';
import { TALEN } from '../shared/talen.js';
import * as store from '../store.js';

export function taalView({ eerste = false, klaar = null } = {}) {
  const huidig = getTaal();
  const kies = async (id) => {
    store.setSetting('taal', id);
    if (eerste) { await zetTaal(id); klaar?.(); return; }
    await zetTaal(id);                                        // de rest van de app tekent zichzelf opnieuw
    location.hash = '#/instellingen';
  };
  const lijst = Object.entries(TALEN).sort(([, a], [, b]) => a.english.localeCompare(b.english, 'en'));
  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      !eerste ? h('a', { class: 'btn btn-quiet back', href: '#/instellingen' }, icon('back'), t('common.back')) : null,
      h('h1', { tabindex: '-1' }, eerste ? 'Language' : t('language.title')),
      // Eerste keer: we weten nog niet welke taal je leest, dus het woord "taal" in een paar talen
      eerste ? h('p', { class: 'muted', lang: 'en' }, 'Choose your language · Kies je taal · Sprache wählen · Choisissez votre langue · Elige tu idioma')
             : h('p', { class: 'muted' }, t('language.chooseLater'))),
    h('ul', { class: 'taal-lijst' }, lijst.map(([id, info]) => h('li', {},
      h('button', { type: 'button', class: `taal-keuze${!eerste && id === huidig ? ' is-gekozen' : ''}`, lang: info.locale, 'aria-pressed': String(!eerste && id === huidig), onclick: () => kies(id) },
        h('span', { class: 'taal-naam' }, info.native),
        h('span', { class: 'taal-eng', lang: 'en' }, info.english),
        !eerste && id === huidig ? icon('check') : null)))),
    eerste ? h('p', { class: 'muted', lang: 'en' }, 'You can change this later in Settings.') : null);
  return { title: eerste ? 'Language' : t('language.title'), nav: eerste ? null : 'settings', decor: 'spray', node };
}
