// Schermen voor functies die er later bij komen. Ze zijn alleen bereikbaar als
// de bijbehorende schakelaar in config.js aan staat (zie app.js).

import { h, icon } from '../ui.js';
import { FEATURES } from '../config.js';
import * as auth from '../services/auth.js';
import { notFoundView } from './notFound.js';

export function accountView() {
  if (!FEATURES.accounts) return notFoundView();
  const user = auth.getUser();
  const providers = auth.providers();

  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('a', { class: 'btn btn-quiet back', href: '#/instellingen' }, icon('back'), 'Terug'),
      h('h1', { tabindex: '-1' }, 'Account'),
      h('p', {}, user ? `Ingelogd als ${user.name}.` : 'Je speelt nu zonder account. Dat is prima.')),
    user
      ? h('button', { type: 'button', class: 'btn btn-block', onclick: () => auth.signOut().then(() => location.reload()) }, 'Uitloggen')
      : h('div', { class: 'stack' }, providers.map((p) =>
          h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: () => auth.signIn(p.id) }, p.label))),
  );
  return { title: 'Account', nav: 'settings', decor: 'spray', node };
}

export function friendsView() {
  if (!FEATURES.friends) return notFoundView();
  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('h1', { tabindex: '-1' }, 'Vrienden'),
      h('p', {}, 'Speel samen met mensen die je kent.')),
    h('div', { class: 'notice' }, h('p', {}, 'Je hebt nog geen vrienden toegevoegd.')),
  );
  return { title: 'Vrienden', nav: 'friends', decor: 'spray', node };
}
