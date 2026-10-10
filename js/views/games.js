// Spellen: alle spellen onder elkaar, groot en met één zin uitleg.
// Speelbare spellen staan bovenaan; "binnenkort" onderaan.

import { h, icon } from '../ui.js';
import { games, isReady } from '../games/registry.js';
import * as store from '../store.js';

function gameCard(game) {
  const ready = isReady(game);
  const inProgress = ready && store.hasProgress(game.id);
  return h('li', {},
    h('a', { class: 'card card-link', href: `#/spel/${game.id}` },
      h('span', { class: 'tile' }, icon(game.icon)),
      h('span', {},
        h('span', { class: 'title' }, game.name), h('br'),
        h('span', { class: 'desc' }, game.summary),
        !ready ? [h('br'), h('span', { class: 'badge' }, 'Komt binnenkort')] : null,
        inProgress ? [h('br'), h('span', { class: 'badge badge-done' }, 'Bezig')] : null,
      ),
      icon('chevron'),
    ),
  );
}

export function gamesView() {
  const sorted = [...games].sort((a, b) => Number(isReady(b)) - Number(isReady(a)));
  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('h1', { tabindex: '-1' }, 'Spellen'),
      h('p', {}, 'Kies een spel om te spelen.'),
    ),
    h('ul', { class: 'list' }, sorted.map(gameCard)),
  );
  return { title: 'Spellen', nav: 'games', decor: 'hang-rechts', node };
}
