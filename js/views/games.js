// Spellen: elk spel als een kaart met een eigen illustratie, een korte uitleg en jouw voortgang.

import { h, icon } from '../ui.js';
import { games, isReady } from '../games/registry.js';
import * as store from '../store.js';
import { gameArt } from '../games/art.js';

function card(game) {
  const ready = isReady(game);
  const rec = store.getGame(game.id);
  const slot = rec.slots.normal;
  const busy = ready && slot?.state != null;
  const pct = busy && slot.progress != null ? Math.round(slot.progress * 100) : null;
  const art = h('div', { class: 'art-box', 'aria-hidden': 'true' });
  art.innerHTML = gameArt(game.id);

  const chips = [];
  if (!ready) chips.push(h('span', { class: 'chip' }, 'Komt binnenkort'));
  else {
    if (busy) chips.push(h('span', { class: 'chip chip-busy' }, pct != null ? `Bezig · ${pct}%` : 'Bezig'));
    if (rec.completed) chips.push(h('span', { class: 'chip chip-done' }, icon('check'), rec.completed === 1 ? 'Eén keer opgelost' : `${rec.completed} keer opgelost`));
    if (!busy && !rec.completed) chips.push(h('span', { class: 'chip' }, `${game.difficulties.length} niveaus`));
  }

  return h('li', {}, h('a', { class: `game-card game--${game.id}`, href: `#/spel/${game.id}` },
    h('span', { class: 'gc-panel' }, art),
    h('span', { class: 'gc-body' },
      h('span', { class: 'gc-title' }, h('strong', {}, game.name), icon('chevron')),
      h('span', { class: 'gc-desc' }, game.summary),
      h('span', { class: 'gc-chips' }, chips),
      pct != null ? h('span', { class: 'ws-bar gc-bar', 'aria-hidden': 'true' }, h('i', { style: `width:${pct}%` })) : null)));
}

export function gamesView() {
  const sorted = [...games].sort((a, b) => Number(isReady(b)) - Number(isReady(a)));
  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('h1', { tabindex: '-1' }, 'Spellen'),
      h('p', {}, 'Kies een spel om te spelen.'),
    ),
    h('ul', { class: 'game-grid' }, sorted.map(card)),
  );
  return { title: 'Spellen', nav: 'games', decor: 'hang-rechts', node };
}
