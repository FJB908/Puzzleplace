// Start: het eerste wat je ziet. Eén duidelijke volgende stap, geen drukte.
//   1. (eerste keer) Is de tekst goed leesbaar?
//   2. Hoofdkaart: verder waar je was, of een spel kiezen
//   3. Puzzel van de dag (alleen als er speelbare spellen zijn)
//   4. Alle spellen

import { h, icon, whenText } from '../ui.js';
import { mountArt } from '../decor.js';
import * as store from '../store.js';
import { getGameInfo, dailyGame } from '../games/registry.js';

function greeting() {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond';
  const name = store.getName();
  return name ? `${part}, ${name}` : part;
}

const SIZES = [
  { id: 'normal', label: 'Normaal' },
  { id: 'large', label: 'Groot' },
  { id: 'xlarge', label: 'Extra groot' },
];

function welcomeCard(app) {
  const current = store.getSettings().textSize;
  return h('section', { class: 'card stack', 'aria-labelledby': 'welcome-title' },
    h('h2', { id: 'welcome-title' }, 'Welkom! Is de tekst goed te lezen?'),
    h('p', { class: 'muted' }, 'Kies de grootte die je prettig vindt. Je kunt dit later altijd aanpassen bij Instellingen.'),
    h('div', { class: 'options', role: 'group', 'aria-label': 'Tekstgrootte' },
      SIZES.map((s) => h('label', { class: 'option' },
        h('input', {
          type: 'radio', name: 'welcome-size', value: s.id, checked: s.id === current,
          onchange: () => { store.setSetting('textSize', s.id); app.applySettings(); },
        }),
        h('span', { class: 'option-body' }, h('strong', {}, s.label)),
      ))),
    h('button', {
      type: 'button', class: 'btn btn-primary btn-block',
      onclick: () => { store.setSetting('welcomeDone', true); app.refresh(); },
    }, 'Zo is het goed'),
  );
}

// Hoofdkaart: donkerblauw vlak met een bloeiend takje bovenin
function heroArt() {
  const art = h('div', { class: 'hero-art', 'aria-hidden': 'true' });
  const s = store.getSettings();
  if (s.decor !== false) mountArt(art, 'takje-a');
  return art;
}

function mainCard() {
  const last = store.getLastGame();
  const info = last && getGameInfo(last.id);
  const slot = info && store.getGame(info.id).slots[last.slot];

  if (info && slot && slot.state != null) {
    const href = `#/spel/${info.id}/speel${last.slot === 'daily' ? '/dagelijks' : ''}`;
    const level = info.difficulties.find((d) => d.id === slot.difficulty)?.label;
    return h('section', { class: 'hero', 'aria-labelledby': 'hero-title' }, heroArt(),
      h('h2', { id: 'hero-title' }, `Verder met ${info.name}`),
      h('p', {}, `${level ? `${level} · ` : ''}laatst gespeeld ${whenText(slot.updatedAt)}`),
      h('a', { class: 'btn btn-block', href }, icon('play'), 'Verder spelen'),
    );
  }
  return h('section', { class: 'hero', 'aria-labelledby': 'hero-title' }, heroArt(),
    h('h2', { id: 'hero-title' }, 'Kies een spel'),
    h('p', {}, 'Begin met een puzzel die bij je past. Je voortgang wordt vanzelf bewaard.'),
    h('a', { class: 'btn btn-block', href: '#/spellen' }, icon('games'), 'Naar alle spellen'),
  );
}

function dailyCard() {
  const game = dailyGame();
  if (!game) return null;
  const done = store.getGame(game.id).dailyDone === store.todayKey();
  return h('a', { class: 'card card-link', href: `#/spel/${game.id}/speel/dagelijks` },
    h('span', { class: 'tile' }, icon('daily')),
    h('span', {},
      h('span', { class: 'title' }, 'Puzzel van de dag'), h('br'),
      h('span', { class: 'desc' }, game.name), h('br'),
      done ? h('span', { class: 'badge badge-done' }, '✓ Vandaag gedaan') : null,
    ),
    icon('chevron'),
  );
}

export function homeView(_params, app) {
  const last = store.getLastGame();
  const resuming = last && store.hasProgress(last.id, last.slot);

  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('h1', { tabindex: '-1' }, greeting()),
      h('p', {}, 'Wat wil je vandaag doen?'),
    ),
    store.getSettings().welcomeDone ? null : welcomeCard(app),
    mainCard(),
    dailyCard(),
    // Als de hoofdkaart al "verder spelen" is, blijft "alle spellen" hier als tweede keuze.
    resuming
      ? h('a', { class: 'card card-link', href: '#/spellen' },
          h('span', { class: 'tile' }, icon('games')),
          h('span', {}, h('span', { class: 'title' }, 'Alle spellen'), h('br'), h('span', { class: 'desc' }, 'Kies iets anders')),
          icon('chevron'))
      : null,
    h('p', { class: 'muted' }, 'Even vastgelopen? ', h('a', { href: '#/hulp' }, 'Bekijk de hulp')),
  );
  return { title: 'Start', nav: 'home', view: 'home', decor: 'boog', node };
}
