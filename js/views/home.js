// Start: wat is er nu te doen? In deze volgorde, en alleen wat er echt is:
//   1. (eerste keer) Is de tekst goed leesbaar?
//   2. Vrienden (max. 5): eerst wie op jou wacht, dan verzoeken, dan lopende partijen, dan de rest
//   3. Verder waar je was (met voortgang), of een spel kiezen
//   4. Puzzel van de dag
// Uitgelogd staat de uitnodiging om een account te maken onderaan, niet bovenaan.

import { h, icon, whenText, avatar, shareText, announce } from '../ui.js';
import { t, datumTekst, foutTekst, getTaal, taalInfo } from '../i18n/index.js';
import { TALEN } from '../shared/talen.js';
import * as store from '../store.js';
import { getGameInfo, dailyGame } from '../games/registry.js';
import { gameArt } from '../games/art.js';
import { gameTiles } from './games.js';
import { FEATURES } from '../config.js';
import * as auth from '../services/auth.js';
import * as social from '../services/social.js';
import * as matches from '../services/matches.js';
import { nieuwePartij } from './partij.js';
import { friendRows, stand, partijTaal } from '../shared/startvrienden.js';

function greeting() {
  const hour = new Date().getHours();
  const part = t(hour < 12 ? 'home.greeting.morning' : hour < 18 ? 'home.greeting.afternoon' : 'home.greeting.evening');
  const name = auth.getUser()?.name || store.getName();
  return name ? t('home.greetingName', { greeting: part, name }) : part;
}

const art = (id) => { const d = h('div', { class: 'art-box', 'aria-hidden': 'true' }); d.innerHTML = gameArt(id); return d; };

// ----- Eerste keer: tekstgrootte -----
const SIZES = ['normal', 'large', 'xlarge'];

function welcomeCard(app) {
  const buttons = SIZES.map((id) => h('button', {
    type: 'button', class: 'btn', 'aria-pressed': String(id === store.getSettings().textSize),
    onclick: () => { store.setSetting('textSize', id); app.applySettings(); buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(SIZES[i] === id))); },
  }, t(`size.${id}`)));
  return h('section', { class: 'card stack welcome', 'aria-labelledby': 'welcome-title' },
    h('h2', { id: 'welcome-title' }, t('home.welcome.title')),
    h('div', { class: 'seg', role: 'group', 'aria-label': t('home.welcome.sizeGroup') }, buttons),
    h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: () => { store.setSetting('welcomeDone', true); app.refresh(); } }, t('home.welcome.ok')));
}

// ----- Vrienden -----
function friendRow(r, me, act) {
  const f = r.friend;
  const wie = h('div', { class: 'who' }, h('strong', {}, f.name));
  const rij = (cls, children, tag = 'li', attrs = {}) => h(tag, { class: `fr ${cls}`, ...attrs }, avatar(f.name, f.id), wie, children);
  if (r.kind === 'verzoek') {
    wie.append(h('span', { class: 'muted' }, t('home.friends.request')));
    return rij('is-verzoek', h('div', { class: 'fr-acties' },
      h('button', { type: 'button', class: 'btn btn-primary', 'aria-label': t('home.friends.acceptAria', { name: f.name }), onclick: () => act(() => social.accept(f.id), t('home.friends.nowFriends', { name: f.name })) }, t('home.friends.accept')),
      h('button', { type: 'button', class: 'btn btn-quiet', 'aria-label': t('home.friends.declineAria', { name: f.name }), onclick: () => act(() => social.decline(f.id), t('home.friends.declined')) }, t('home.friends.decline'))));
  }
  if (r.kind === 'vrij') {
    wie.append(h('span', { class: 'muted' }, getGameInfo('woordtuin').name));
    return rij('is-vrij', h('button', { type: 'button', class: 'btn', 'aria-label': t('home.friends.newGameAria', { name: f.name }), onclick: () => nieuwePartij(f) }, t('home.friends.newGame')));
  }
  const s = stand(r.match, me);
  const beurt = r.kind === 'beurt';
  const taal = partijTaal(r.match, getTaal());
  const delen = [beurt ? t('home.friends.yourTurn') : t('home.friends.waitingFor', { name: f.name }), s, r.aantal > 1 ? t('home.friends.gamesCount', { n: r.aantal }) : '', taal ? TALEN[taal].native : ''].filter(Boolean);
  wie.append(h('span', { class: beurt ? 'beurt-tekst' : 'muted' }, delen.join(' · ')));
  // De hele rij is een link naar de partij; de knop is er alleen om te laten zien dat jij moet spelen
  const spel = getGameInfo('woordtuin').name;
  const a = h('a', { class: `fr ${beurt ? 'is-beurt' : 'is-wacht'}`, href: `#/partij/${r.match.id}`, 'aria-label': t(beurt ? 'home.friends.rowAriaTurn' : 'home.friends.rowAriaWait', { game: spel, name: f.name }) },
    avatar(f.name, f.id), wie, beurt ? h('span', { class: 'btn btn-primary', 'aria-hidden': 'true' }, t('home.friends.play')) : icon('chevron'));
  return h('li', {}, a);
}

function friendsSection() {
  if (!FEATURES.friends) return null;
  const user = auth.getUser();

  if (!user) {
    return { el: h('section', { class: 'fr-uit', 'aria-label': t('home.friends') },
      h('span', { class: 'tile' }, icon('friends')),
      h('div', {}, h('strong', {}, t('home.friends.signedOutTitle')), h('span', { class: 'muted' }, t('home.friends.signedOutText'))),
      h('div', { class: 'fr-acties' },
        h('a', { class: 'btn btn-primary', href: '#/account/nieuw' }, t('home.friends.createAccount')),
        h('a', { class: 'btn btn-quiet', href: '#/account/inloggen' }, t('home.friends.logIn')))), off: () => {} };
  }

  const list = h('ul', { class: 'fr-lijst' });
  const foot = h('div', { class: 'fr-voet' });
  const el = h('section', { class: 'fr-sectie', 'aria-labelledby': 'fr-titel' }, h('h2', { id: 'fr-titel' }, t('home.friends')), list, foot);

  async function act(fn, ok) {
    try { await fn(); announce(ok); } catch (e) { announce(foutTekst(e)); }
  }

  async function deelCode() {
    const u = auth.getUser();
    const url = `${location.origin}${location.pathname}#/vrienden/toevoegen/${u.code.replace('-', '')}`;
    const r = await shareText({ title: t('app.name'), text: t('home.friends.shareText', { code: u.code }), url });
    if (r === 'gekopieerd') announce(t('home.friends.linkCopied'));
  }

  function render() {
    const u = auth.getUser(); if (!u) return;
    const geladen = social.isLoaded() && matches.isLoaded();
    const { rows, meer, totaal } = friendRows(u.id, social.cached(), matches.cached(), taalInfo().locale);
    list.replaceChildren(...rows.map((r) => friendRow(r, u.id, act)));
    if (!rows.length) {
      foot.replaceChildren(geladen
        ? h('div', { class: 'fr-leeg' },
            h('p', {}, h('strong', {}, t('home.friends.none')), ' ', t('home.friends.noneHint')),
            h('div', { class: 'fr-acties' },
              h('button', { type: 'button', class: 'btn btn-primary', onclick: deelCode }, icon('friends'), t('home.friends.shareCode')),
              h('a', { class: 'btn btn-quiet', href: '#/vrienden' }, t('home.friends.haveCode'))))
        : h('p', { class: 'muted' }, t('common.loading')));
    } else {
      foot.replaceChildren(meer ? h('a', { class: 'link-quiet', href: '#/vrienden' }, t('home.friends.all', { n: totaal })) : null);
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
    return null;                                       // geen spel bezig: de spellen staan hieronder al open
  }
  const href = `#/spel/${info.id}/speel${last.slot === 'daily' ? '/dagelijks' : ''}`;
  const level = info.difficulties.find((d) => d.id === slot.difficulty)?.label;
  const pct = slot.progress != null ? Math.round(slot.progress * 100) : null;
  return h('a', { class: 'rij rij-spel', href, 'aria-label': pct != null ? t('home.continueAria', { game: info.name, pct }) : t('home.continueAriaNoPct', { game: info.name }) },
    h("span", { class: `rij-art game--${info.id}` }, art(info.id)),
    h('span', { class: 'rij-tekst' },
      h('strong', {}, info.name),
      h('span', { class: 'muted' }, [t('home.continue'), level, whenText(slot.updatedAt)].filter(Boolean).join(' · ')),
      pct != null ? h('span', { class: 'ws-bar', 'aria-hidden': 'true' }, h('i', { style: `width:${pct}%` })) : null),
    icon('chevron'));
}

// ----- Puzzel van de dag -----
function dailyRow() {
  const game = dailyGame();
  if (!game) return null;
  const now = new Date();
  const done = store.getGame(game.id).dailyDone === store.todayKey();
  const month = datumTekst(now, { month: 'short' }).replace('.', '');
  return h('a', { class: `daily${done ? ' is-done' : ''}`, href: `#/spel/${game.id}/speel/dagelijks` },
    h('span', { class: 'cal', 'aria-hidden': 'true' }, h('small', {}, month), h('b', {}, String(now.getDate()))),
    h('span', { class: 'daily-text' },
      h('strong', {}, t('home.daily')),
      h('span', { class: 'muted' }, game.name),
      done ? h('span', { class: 'chip chip-done' }, icon('check'), t('home.dailyDone')) : null));
}

export function homeView(_params, app) {
  const vrienden = friendsSection();
  const loggedIn = !!auth.getUser();
  const spellen = h('section', { class: 'home-spellen', 'aria-labelledby': 'home-spellen-titel' }, h('h2', { id: 'home-spellen-titel' }, t('games.title')), gameTiles());
  const delen = loggedIn ? [vrienden?.el, continueRow(), dailyRow(), spellen] : [continueRow(), dailyRow(), spellen, vrienden?.el];

  const node = h('div', { class: 'view view--home' },
    h('h1', { class: 'home-titel', tabindex: '-1' }, greeting()),
    store.getSettings().welcomeDone ? null : welcomeCard(app),
    ...delen);
  return { title: t('nav.home'), nav: 'home', view: 'home', decor: 'boog', node, cleanup: () => vrienden?.off() };
}
