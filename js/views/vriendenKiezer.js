// De vrienden met wie je het meest speelt, elk met één knop om een partij Woordtuin te beginnen (of verder te gaan). Voor de pagina van
// Woordtuin en voor het uitklapvenstertje in het spellenmenu.

import { h, icon, avatar } from '../ui.js';
import { t } from '../i18n/index.js';
import * as auth from '../services/auth.js';
import * as social from '../services/social.js';
import * as matches from '../services/matches.js';
import { meestGespeeld } from '../shared/startvrienden.js';
import { nieuwePartij } from './partij.js';

export function vriendenKiezer({ max = 3, alle = false } = {}) {
  const el = h('div', { class: 'stack vk' });
  const nodig = () => h('a', { class: 'btn btn-block', href: '#/account/inloggen' }, icon('user'), t('detail.friend.loginButton'));
  function render() {
    const u = auth.getUser();
    if (!u) { el.replaceChildren(h('p', {}, t('detail.friend.login')), nodig()); return; }
    if (!(social.isLoaded() && matches.isLoaded())) { el.replaceChildren(h('p', { class: 'muted' }, t('common.loading'))); return; }
    const rijen = meestGespeeld(u.id, social.cached().friends, matches.cached());
    if (!rijen.length) { el.replaceChildren(h('p', {}, t('detail.friend.none')), h('a', { class: 'btn btn-block', href: '#/vrienden' }, icon('friends'), t('detail.friend.addButton'))); return; }
    el.replaceChildren(...[
      h('ul', { class: 'dv-lijst' }, rijen.slice(0, max).map(({ friend, aantal, lopend }) => h('li', { class: 'dv-rij' },
        avatar(friend.name, friend.id),
        h('span', { class: 'dv-wie' }, h('strong', {}, friend.name), aantal ? h('small', { class: 'muted' }, t('detail.friend.played', { n: aantal })) : null),
        lopend
          ? h('a', { class: 'btn btn-primary', href: `#/partij/${lopend.id}` }, icon('play'), t('detail.continue'))
          : h('button', { type: 'button', class: 'btn btn-primary', onclick: () => nieuwePartij(friend) }, icon('play'), t('detail.newGame'))))),
      alle || rijen.length > max ? h('a', { class: 'link-quiet', href: '#/vrienden' }, t('detail.friend.all')) : null].filter(Boolean));
  }
  render();
  if (auth.getUser()) { social.list().catch(() => {}); matches.list().catch(() => {}); }
  const offs = [social.subscribe(render), matches.subscribe(render), auth.subscribe(render)];
  return { el, off: () => offs.forEach((f) => f()) };
}
