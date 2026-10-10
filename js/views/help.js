// Hulp: korte vragen met korte antwoorden, in gewone taal.

import { h, icon, richText } from '../ui.js';
import { FEATURES } from '../config.js';
import { t, getTaal } from '../i18n/index.js';
import { TALEN } from '../shared/talen.js';
import { getGameInfo } from '../games/registry.js';

export function helpView() {
  const woordtuin = getGameInfo('woordtuin').name;
  const bron = TALEN[getTaal()].woordenlijst;
  // Namen van schermen en knoppen komen uit dezelfde teksten als de rest van de app, zodat ze precies kloppen
  const p = {
    settings: t('nav.settings'), games: t('nav.games'), friends: t('nav.friends'), account: t('settings.account'),
    textSize: t('settings.textSize'), large: t('size.large'), xlarge: t('size.xlarge'), back: t('common.back'),
    newGame: t('detail.newGame'), language: t('language.title'), game: woordtuin, instructions: t('play.howTo'),
    source: `[${bron.naam}](${bron.url})`, license: bron.licentie,
  };
  const vraag = (n) => [t(`help.q${n}`, p), richText(t(`help.a${n}`, p))];
  const nummers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, ...(FEATURES.friends ? [12] : [])];
  // Bij de vriendenvraag heet de knop zoals op Start: "Nieuwe partij"
  p.newGame = t('detail.newGame');
  const lijst = nummers.map((n) => (n === 12 ? [t('help.q12', p), richText(t('help.a12', { ...p, newGame: t('home.friends.newGame') }))] : vraag(n)));

  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('a', { class: 'btn btn-quiet back', href: '#/instellingen' }, icon('back'), t('common.back')),
      h('h1', { tabindex: '-1' }, t('help.title')),
      h('p', {}, t('help.subtitle')),
    ),
    h('div', { class: 'stack' },
      lijst.map(([q, a]) => h('details', { class: 'disclosure' },
        h('summary', {}, q),
        h('div', { class: 'disclosure-body' }, h('p', {}, a))))),
  );
  return { title: t('help.title'), nav: 'settings', decor: 'spray', node };
}
