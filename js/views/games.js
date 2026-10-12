// Spellen: elk spel als een kaart met een eigen illustratie, een korte uitleg en jouw voortgang.

import { h, icon } from '../ui.js';
import { t } from '../i18n/index.js';
import { games, isReady } from '../games/registry.js';
import * as store from '../store.js';
import { gameArt } from '../games/art.js';
import { dagLint } from './dagLint.js';
import { vriendenKiezer } from './vriendenKiezer.js';
import { FEATURES } from '../config.js';

function card(game) {
  const ready = isReady(game);
  const rec = store.getGame(game.id);
  const slot = store.getSlot(game.id, 'normal');
  const busy = ready && slot?.state != null;
  const pct = busy && slot.progress != null ? Math.round(slot.progress * 100) : null;
  const art = h('div', { class: 'art-box', 'aria-hidden': 'true' });
  art.innerHTML = gameArt(game.id);

  const chips = [];
  if (!ready) chips.push(h('span', { class: 'chip' }, t('games.comingSoon')));
  else {
    if (busy) chips.push(h('span', { class: 'chip chip-busy' }, pct != null ? t('games.inProgressPct', { pct }) : t('games.inProgress')));
    if (rec.completed) chips.push(h('span', { class: 'chip chip-done' }, icon('check'), t('games.solved', { n: rec.completed })));
    if (!busy && !rec.completed) chips.push(h('span', { class: 'chip' }, t('games.levels', { n: game.difficulties.length })));
  }

  // Sudoku: bovenaan de kaart de Sudoku van vandaag. Woordtuin: een knopje met twee poppetjes dat drie vrienden laat zien om mee te spelen.
  const lint = ready && game.id === 'sudoku' ? dagLint() : null;
  const vrienden = ready && game.id === 'woordtuin' && FEATURES.friends ? vriendenKnop() : null;
  const kaart = h('a', { class: `game-card game--${game.id}`, href: `#/spel/${game.id}` },
    h('span', { class: 'gc-panel' }, art),
    h('span', { class: 'gc-body' },
      h('span', { class: 'gc-title' }, h('strong', {}, game.name), icon('chevron')),
      h('span', { class: 'gc-desc' }, game.summary),
      h('span', { class: 'gc-chips' }, chips),
      pct != null ? h('span', { class: 'ws-bar gc-bar', 'aria-hidden': 'true' }, h('i', { style: `width:${pct}%` })) : null));
  return h('li', { class: `gc-item${lint ? ' met-lint' : ''}${vrienden ? ' met-vrienden' : ''}` }, lint, kaart, vrienden?.knop, vrienden?.paneel);
}

// Twee poppetjes op de kaart van Woordtuin: tik erop en er verschijnen drie vrienden met wie je een partij kunt beginnen
function vriendenKnop() {
  const kiezer = vriendenKiezer({ max: 3 });
  const paneel = h('div', { class: 'gc-vrienden-paneel', id: 'gc-vrienden', hidden: true }, h('strong', { class: 'gc-vrienden-titel' }, t('detail.friend.title')), kiezer.el);
  const knop = h('button', { type: 'button', class: 'gc-vrienden', 'aria-expanded': 'false', 'aria-controls': 'gc-vrienden', 'aria-label': t('detail.friend.title'), onclick: () => {
    const open = paneel.hidden;
    paneel.hidden = !open; knop.setAttribute('aria-expanded', String(open)); knop.classList.toggle('is-open', open);
  } }, icon('friends'));
  return { knop, paneel };
}

// Alle spellen als kleine tegels, voor op Start: je ziet meteen wat er is en kiest met één tik
export function gameTiles() {
  return h('ul', { class: 'game-mini' }, games.filter(isReady).map((game) => {
    const art = h('span', { class: 'art-box', 'aria-hidden': 'true' });
    art.innerHTML = gameArt(game.id);
    const tegel = h('a', { class: `game-mini-tegel game--${game.id}`, href: `#/spel/${game.id}` }, h('span', { class: 'gm-art' }, art), h('strong', {}, game.name));
    return game.id === 'sudoku' ? h('li', { class: 'gm-breed' }, dagLint(), tegel) : h('li', {}, tegel);
  }));
}

export function gamesView() {
  const sorted = [...games].sort((a, b) => Number(isReady(b)) - Number(isReady(a)));
  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('h1', { tabindex: '-1' }, t('games.title')),
      h('p', {}, t('games.subtitle')),
    ),
    h('ul', { class: 'game-grid' }, sorted.map(card)),
  );
  return { title: t('games.title'), nav: 'games', decor: 'hang-rechts', node };
}
