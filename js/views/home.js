// Start: wat is er nu te doen? In deze volgorde, en alleen wat er echt is:
//   1. (eerste keer) Is de tekst goed leesbaar?
//   2. Vrienden (max. 5): eerst wie op jou wacht, dan verzoeken, dan lopende partijen, dan de rest
//   3. Verder waar je was (met voortgang), of een spel kiezen
//   4. Puzzel van de dag
// Uitgelogd staat de uitnodiging om een account te maken onderaan, niet bovenaan.

import { h, icon, whenText, avatar, shareText, announce } from '../ui.js';
import * as store from '../store.js';
import { getGameInfo, dailyGame } from '../games/registry.js';
import { gameArt } from '../games/art.js';
import { FEATURES } from '../config.js';
import * as auth from '../services/auth.js';
import * as social from '../services/social.js';
import * as matches from '../services/matches.js';
import { nieuwePartij } from './partij.js';
import { friendRows, stand } from '../shared/startvrienden.js';

function greeting() {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond';
  const name = auth.getUser()?.name || store.getName();
  return name ? `${part}, ${name}` : part;
}

const art = (id) => { const d = h('div', { class: 'art-box', 'aria-hidden': 'true' }); d.innerHTML = gameArt(id); return d; };

// ----- Eerste keer: tekstgrootte -----
const SIZES = [
  { id: 'normal', label: 'Normaal' },
  { id: 'large', label: 'Groot' },
  { id: 'xlarge', label: 'Extra groot' },
];

function welcomeCard(app) {
  const buttons = SIZES.map((s) => h('button', {
    type: 'button', class: 'btn', 'aria-pressed': String(s.id === store.getSettings().textSize),
    onclick: () => { store.setSetting('textSize', s.id); app.applySettings(); buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(SIZES[i].id === s.id))); },
  }, s.label));
  return h('section', { class: 'card stack welcome', 'aria-labelledby': 'welcome-title' },
    h('h2', { id: 'welcome-title' }, 'Is de tekst goed te lezen?'),
    h('div', { class: 'seg', role: 'group', 'aria-label': 'Tekstgrootte' }, buttons),
    h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: () => { store.setSetting('welcomeDone', true); app.refresh(); } }, 'Zo is het goed'));
}

// ----- Vrienden -----
function friendRow(r, me, act) {
  const f = r.friend;
  const wie = h('div', { class: 'who' }, h('strong', {}, f.name));
  const rij = (cls, children, tag = 'li', attrs = {}) => h(tag, { class: `fr ${cls}`, ...attrs }, avatar(f.name, f.id), wie, children);
  if (r.kind === 'verzoek') {
    wie.append(h('span', { class: 'muted' }, 'Vriendverzoek'));
    return rij('is-verzoek', h('div', { class: 'fr-acties' },
      h('button', { type: 'button', class: 'btn btn-primary', 'aria-label': `${f.name} als vriend toevoegen`, onclick: () => act(() => social.accept(f.id), `${f.name} is nu je vriend.`) }, 'Ja'),
      h('button', { type: 'button', class: 'btn btn-quiet', 'aria-label': `Verzoek van ${f.name} weigeren`, onclick: () => act(() => social.decline(f.id), 'Verzoek geweigerd.') }, 'Nee')));
  }
  if (r.kind === 'vrij') {
    wie.append(h('span', { class: 'muted' }, 'Woordtuin'));
    return rij('is-vrij', h('button', { type: 'button', class: 'btn', 'aria-label': `Nieuwe partij Woordtuin met ${f.name}`, onclick: () => nieuwePartij(f) }, 'Nieuwe partij'));
  }
  const s = stand(r.match, me);
  const meer = r.aantal > 1 ? ` · ${r.aantal} partijen` : '';
  const beurt = r.kind === 'beurt';
  wie.append(h('span', { class: beurt ? 'beurt-tekst' : 'muted' }, beurt ? `Jouw beurt${s ? ` · ${s}` : ''}${meer}` : `Wacht op ${f.name}${s ? ` · ${s}` : ''}${meer}`));
  // De hele rij is een link naar de partij; de knop is er alleen om te laten zien dat jij moet spelen
  const a = h('a', { class: `fr ${beurt ? 'is-beurt' : 'is-wacht'}`, href: `#/partij/${r.match.id}`, 'aria-label': `${beurt ? 'Spelen' : 'Bekijken'}: Woordtuin met ${f.name}. ${beurt ? 'Jij bent aan de beurt.' : `${f.name} is aan de beurt.`}` },
    avatar(f.name, f.id), wie, beurt ? h('span', { class: 'btn btn-primary', 'aria-hidden': 'true' }, 'Spelen') : icon('chevron'));
  return h('li', {}, a);
}

function friendsSection() {
  if (!FEATURES.friends) return null;
  const user = auth.getUser();

  if (!user) {
    return { el: h('section', { class: 'fr-uit', 'aria-label': 'Vrienden' },
      h('span', { class: 'tile' }, icon('friends')),
      h('div', {}, h('strong', {}, 'Speel met vrienden'), h('span', { class: 'muted' }, 'Met een account kan het ook op je andere apparaten.')),
      h('div', { class: 'fr-acties' },
        h('a', { class: 'btn btn-primary', href: '#/account/nieuw' }, 'Account maken'),
        h('a', { class: 'btn btn-quiet', href: '#/account/inloggen' }, 'Inloggen'))), off: () => {} };
  }

  const list = h('ul', { class: 'fr-lijst' });
  const foot = h('div', { class: 'fr-voet' });
  const el = h('section', { class: 'fr-sectie', 'aria-labelledby': 'fr-titel' }, h('h2', { id: 'fr-titel' }, 'Vrienden'), list, foot);

  async function act(fn, ok) {
    try { await fn(); announce(ok); } catch (e) { announce(e.message); }
  }

  async function deelCode() {
    const u = auth.getUser();
    const url = `${location.origin}${location.pathname}#/vrienden/toevoegen/${u.code.replace('-', '')}`;
    const r = await shareText({ title: 'Puzzelplaats', text: `Speel met mij op Puzzelplaats! Mijn vriendencode is ${u.code}.`, url });
    if (r === 'gekopieerd') announce('Link gekopieerd. Plak hem in een bericht.');
  }

  function render() {
    const u = auth.getUser(); if (!u) return;
    const geladen = social.isLoaded() && matches.isLoaded();
    const { rows, meer, totaal } = friendRows(u.id, social.cached(), matches.cached());
    list.replaceChildren(...rows.map((r) => friendRow(r, u.id, act)));
    if (!rows.length) {
      foot.replaceChildren(geladen
        ? h('div', { class: 'fr-leeg' },
            h('p', {}, h('strong', {}, 'Nog geen vrienden.'), ' Deel je code, dan kunnen jullie samen spelen.'),
            h('div', { class: 'fr-acties' },
              h('button', { type: 'button', class: 'btn btn-primary', onclick: deelCode }, icon('friends'), 'Deel mijn code'),
              h('a', { class: 'btn btn-quiet', href: '#/vrienden' }, 'Ik heb een code')))
        : h('p', { class: 'muted' }, 'Even laden…'));
    } else {
      foot.replaceChildren(meer ? h('a', { class: 'link-quiet', href: '#/vrienden' }, `Alle vrienden (${totaal})`) : null);
    }
  }

  render();
  matches.list().catch(() => {});
  social.list().catch(() => {});
  let incoming = auth.getCounts().incoming;
  const offs = [social.subscribe(render), matches.subscribe(render),
    auth.subscribe(({ counts }) => { if (counts.incoming !== incoming) { incoming = counts.incoming; social.list().catch(() => {}); } })];
  return { el, off: () => offs.forEach((f) => f()) };
}

// ----- Verder spelen / een spel kiezen -----
function continueRow() {
  const last = store.getLastGame();
  const info = last && getGameInfo(last.id);
  const slot = info && store.getSlot(info.id, last.slot);
  if (!(info && slot && slot.state != null)) {
    return h('a', { class: 'rij', href: '#/spellen' }, h('span', { class: 'tile' }, icon('games')),
      h('span', { class: 'rij-tekst' }, h('strong', {}, 'Kies een spel'), h('span', { class: 'muted' }, 'Sudoku, woordzoeker en meer')), icon('chevron'));
  }
  const href = `#/spel/${info.id}/speel${last.slot === 'daily' ? '/dagelijks' : ''}`;
  const level = info.difficulties.find((d) => d.id === slot.difficulty)?.label;
  const pct = slot.progress != null ? Math.round(slot.progress * 100) : null;
  return h('a', { class: 'rij rij-spel', href, 'aria-label': `Verder met ${info.name}${pct != null ? `, ${pct} procent klaar` : ''}` },
    h("span", { class: `rij-art game--${info.id}` }, art(info.id)),
    h('span', { class: 'rij-tekst' },
      h('strong', {}, info.name),
      h('span', { class: 'muted' }, `Verder spelen · ${level ? `${level} · ` : ''}${whenText(slot.updatedAt)}`),
      pct != null ? h('span', { class: 'ws-bar', 'aria-hidden': 'true' }, h('i', { style: `width:${pct}%` })) : null),
    icon('chevron'));
}

// ----- Puzzel van de dag -----
function dailyRow() {
  const game = dailyGame();
  if (!game) return null;
  const now = new Date();
  const done = store.getGame(game.id).dailyDone === store.todayKey();
  const month = now.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', '');
  return h('a', { class: `daily${done ? ' is-done' : ''}`, href: `#/spel/${game.id}/speel/dagelijks` },
    h('span', { class: 'cal', 'aria-hidden': 'true' }, h('small', {}, month), h('b', {}, String(now.getDate()))),
    h('span', { class: 'daily-text' },
      h('strong', {}, 'Puzzel van de dag'),
      h('span', { class: 'muted' }, game.name),
      done ? h('span', { class: 'chip chip-done' }, icon('check'), 'Vandaag gedaan') : null));
}

export function homeView(_params, app) {
  const vrienden = friendsSection();
  const loggedIn = !!auth.getUser();
  const delen = loggedIn ? [vrienden?.el, continueRow(), dailyRow()] : [continueRow(), dailyRow(), vrienden?.el];

  const node = h('div', { class: 'view view--home' },
    h('h1', { class: 'home-titel', tabindex: '-1' }, greeting()),
    store.getSettings().welcomeDone ? null : welcomeCard(app),
    ...delen);
  return { title: 'Start', nav: 'home', view: 'home', decor: 'boog', node, cleanup: () => vrienden?.off() };
}
