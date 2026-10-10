// Start: het eerste wat je ziet. Eén duidelijke volgende stap, daaronder de dagpuzzel en de spellen.
//   1. (eerste keer) Is de tekst goed leesbaar?
//   2. Hoofdkaart: verder waar je was (met voortgang), of een spel kiezen
//   3. Puzzel van de dag, met een afscheurkalender
//   4. Alle spellen als tegels met een eigen illustratie

import { h, icon, whenText } from '../ui.js';
import { mountArt } from '../decor.js';
import * as store from '../store.js';
import { games, getGameInfo, dailyGame, isReady } from '../games/registry.js';
import { gameArt } from '../games/art.js';
import * as auth from '../services/auth.js';
import * as social from '../services/social.js';
import * as matches from '../services/matches.js';
import { avatar } from '../ui.js';

function greeting() {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond';
  const name = store.getName();
  return name ? `${part}, ${name}` : part;
}

const art = (id) => { const d = h('div', { class: 'art-box', 'aria-hidden': 'true' }); d.innerHTML = gameArt(id); return d; };

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
  const el = h('div', { class: 'hero-art', 'aria-hidden': 'true' });
  if (store.getSettings().decor !== false) mountArt(el, 'takje-a');
  return el;
}

function mainCard() {
  const last = store.getLastGame();
  const info = last && getGameInfo(last.id);
  const slot = info && store.getGame(info.id).slots[last.slot];

  if (info && slot && slot.state != null) {
    const href = `#/spel/${info.id}/speel${last.slot === 'daily' ? '/dagelijks' : ''}`;
    const level = info.difficulties.find((d) => d.id === slot.difficulty)?.label;
    const pct = slot.progress != null ? Math.round(slot.progress * 100) : null;
    return h('section', { class: 'hero', 'aria-labelledby': 'hero-title' }, heroArt(),
      h('h2', { id: 'hero-title' }, `Verder met ${info.name}`),
      h('div', { class: 'hero-row' },
        h('div', { class: 'hero-thumb' }, art(info.id)),
        h('p', {}, `${level ? `${level} · ` : ''}laatst gespeeld ${whenText(slot.updatedAt)}`)),
      pct != null
        ? h('div', { class: 'hero-progress' },
            h('div', { class: 'ws-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': 'Voortgang' }, h('i', { style: `width:${pct}%` })),
            h('span', {}, `${pct}% klaar`))
        : null,
      h('a', { class: 'btn btn-block', href }, icon('play'), 'Verder spelen'),
    );
  }
  return h('section', { class: 'hero', 'aria-labelledby': 'hero-title' }, heroArt(),
    h('h2', { id: 'hero-title' }, 'Kies een spel'),
    h('p', {}, 'Begin met een puzzel die bij je past. Je voortgang wordt vanzelf bewaard.'),
    h('a', { class: 'btn btn-block', href: '#/spellen' }, icon('games'), 'Naar alle spellen'),
  );
}

// Puzzel van de dag, met een afscheurkalender
function dailyCard() {
  const game = dailyGame();
  if (!game) return null;
  const now = new Date();
  const done = store.getGame(game.id).dailyDone === store.todayKey();
  const month = now.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', '');
  return h('a', { class: `daily${done ? ' is-done' : ''}`, href: `#/spel/${game.id}/speel/dagelijks` },
    h('span', { class: 'cal', 'aria-hidden': 'true' }, h('small', {}, month), h('b', {}, String(now.getDate()))),
    h('span', { class: 'daily-text' },
      h('span', { class: 'kicker' }, 'Puzzel van de dag'),
      h('strong', {}, game.name),
      h('span', { class: 'muted' }, 'Elke dag een nieuwe'),
      done ? h('span', { class: 'chip chip-done' }, icon('check'), 'Vandaag gedaan') : h('span', { class: 'chip chip-busy' }, 'Nog te doen')),
  );
}

// Iemand wil je als vriend toevoegen: dat zie je meteen op Start
function friendNotice() {
  const user = auth.getUser();
  const n = user ? auth.getCounts().incoming : 0;
  if (!n) return null;
  const cached = social.cached().incoming;
  const first = cached[0];
  return h('a', { class: 'notice-link', href: '#/vrienden' },
    first && n === 1 ? avatar(first.name, first.id) : h('span', { class: 'bubble' }, icon('friends')),
    h('span', {}, h('strong', {}, n === 1 ? (first ? `${first.name} wil je vriend worden` : 'Iemand wil je vriend worden') : `${n} mensen willen je vriend worden`), h('span', { class: 'muted' }, 'Tik om te antwoorden')));
}

// Een vriend wacht op jouw zet: dat zie je meteen op Start
function beurtNotice() {
  const user = auth.getUser();
  if (!user) return null;
  const mijn = matches.cached().filter((m) => m.status === 'active' && m.yourTurn);
  if (!mijn.length) return null;
  const een = mijn.length === 1, tegen = mijn[0].players.find((p) => p.id !== user.id) || { name: 'Een vriend' };
  return h('a', { class: 'notice-link', href: een ? `#/partij/${mijn[0].id}` : '#/vrienden' },
    een ? avatar(tegen.name, tegen.id) : h('span', { class: 'bubble' }, icon('friends')),
    h('span', {}, h('strong', {}, een ? `${tegen.name} wacht op jou` : `${mijn.length} vrienden wachten op jou`), h('span', { class: 'muted' }, een ? 'Jij bent aan de beurt in Woordtuin' : 'Tik om te kiezen')));
}

function tile(game) {
  const ready = isReady(game);
  const rec = store.getGame(game.id);
  const busy = ready && rec.slots.normal?.state != null;
  return h('li', {}, h('a', { class: `tile-game game--${game.id}`, href: `#/spel/${game.id}` },
    h('span', { class: 'tg-art' }, art(game.id)),
    h('span', { class: 'tg-name' }, game.name),
    busy ? h('span', { class: 'chip chip-busy' }, 'Bezig') : !ready ? h('span', { class: 'chip' }, 'Binnenkort') : null));
}

export function homeView(_params, app) {
  const date = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });

  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('p', { class: 'kicker' }, date),
      h('h1', { tabindex: '-1' }, greeting()),
      h('p', {}, 'Wat wil je vandaag doen?'),
    ),
    store.getSettings().welcomeDone ? null : welcomeCard(app),
    beurtNotice(),
    friendNotice(),
    mainCard(),
    dailyCard(),
    h('section', { 'aria-labelledby': 'tiles-title', class: 'stack' },
      h('div', { class: 'section-head' },
        h('h2', { id: 'tiles-title' }, 'Spellen'),
        h('a', { class: 'link-quiet', href: '#/spellen' }, 'Alles bekijken')),
      h('ul', { class: 'tiles' }, games.map(tile))),
    h('p', { class: 'muted' }, 'Even vastgelopen? ', h('a', { href: '#/hulp' }, 'Bekijk de hulp')),
  );
  return { title: 'Start', nav: 'home', view: 'home', decor: 'boog', node };
}
