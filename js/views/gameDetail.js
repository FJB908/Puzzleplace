// Voor het spelen: wat is dit spel, welk niveau, en dan één grote knop.
// Flow: Spellen -> dit scherm -> Spelen. Nooit meer dan drie tikken vanaf Start.

import { h, icon, avatar, confirmDialog } from '../ui.js';
import { FEATURES } from '../config.js';
import * as auth from '../services/auth.js';
import * as social from '../services/social.js';
import * as matches from '../services/matches.js';
import { meestGespeeld } from '../shared/startvrienden.js';
import { nieuwePartij } from './partij.js';
import { getGameInfo, isReady } from '../games/registry.js';
import * as store from '../store.js';
import { gameArt } from '../games/art.js';
import { notFoundView } from './notFound.js';
import { t } from '../i18n/index.js';

// Het aantal bloesems laat zien hoe moeilijk een niveau is (1 tot 4)
function bloomRow(n, total) {
  return h('span', { class: 'lv-bloom', 'aria-hidden': 'true' },
    Array.from({ length: total }, (_, k) => h('i', { class: k < n ? 'on' : '' })));
}

export function gameDetailView({ id }, app) {
  const game = getGameInfo(id);
  if (!game) return notFoundView();

  const record = store.getGame(id);
  const ready = isReady(game);
  const saved = store.getSlot(id, 'normal');
  const resumable = ready && saved && saved.state != null;
  let level = resumable ? saved.difficulty : record.difficulty;
  if (!game.difficulties.some((d) => d.id === level)) level = game.difficulties[0].id;

  const art = h('div', { class: 'art-box', 'aria-hidden': 'true' });
  art.innerHTML = gameArt(id);

  const header = h('header', { class: `detail-hero game--${id}` },
    h('a', { class: 'btn btn-quiet back', href: '#/spellen' }, icon('back'), t('common.back')),
    h('div', { class: 'dh-panel' }, art),
    h('div', { class: 'dh-text' },
      h('h1', { tabindex: '-1' }, game.name),
      h('p', {}, game.summary),
      record.completed ? h('span', { class: 'chip chip-done' }, icon('check'), t('detail.solved', { n: record.completed })) : null),
  );

  const howTo = h('details', { class: 'disclosure' },
    h('summary', {}, t('detail.howTo')),
    h('div', { class: 'disclosure-body' }, h('ol', {}, game.howTo.map((s) => h('li', {}, s)))),
  );

  if (!ready) {
    return {
      title: game.name, nav: 'games', decor: 'hang-rechts',
      node: h('div', { class: 'view' }, header, howTo,
        h('div', { class: 'notice', role: 'note' },
          h('strong', {}, t('detail.soon')),
          h('p', {}, t('detail.soonText'))),
        h('a', { class: 'btn btn-primary btn-block', href: '#/spellen' }, t('detail.backToGames'))),
    };
  }

  // Niveaukeuze: kaarten met bloesems, geen saaie lijst
  const levelPicker = h('fieldset', { class: 'levels' },
    h('legend', {}, t('detail.howHard')),
    h('div', { class: 'level-grid' },
      game.difficulties.map((d, i) => h('label', { class: 'level' },
        h('input', {
          type: 'radio', name: 'level', value: d.id, checked: d.id === level,
          disabled: resumable, // een bewaard spel heeft zijn eigen niveau
          onchange: () => { level = d.id; store.updateGame(id, (r) => { r.difficulty = d.id; }); },
        }),
        h('span', { class: 'level-body' },
          bloomRow(i + 1, game.difficulties.length),
          h('strong', {}, d.label),
          h('small', {}, d.hint))))),
    resumable ? h('p', { class: 'field-hint' }, t('detail.levelLocked', { newGame: t('detail.newGame') })) : null,
  );

  async function startNew() {
    if (resumable) {
      const ok = await confirmDialog({
        title: t('detail.newGameConfirmTitle'),
        text: t('detail.newGameConfirmText'),
        confirmLabel: t('detail.newGameConfirmYes'),
      });
      if (!ok) return;
      // Het bewaarde spel is weg: het scherm gaat open voor een ander niveau (kies er een en tik op Starten)
      store.updateGame(id, (r) => { r.slots.normal = store.clearedSlot(); });
      app.refresh();
      return;
    }
    store.updateGame(id, (r) => { r.slots.normal = store.clearedSlot(); r.difficulty = level; });
    location.hash = `#/spel/${id}/speel`;
  }

  // Altijd zichtbaar onderaan: de hoofdactie
  const actions = resumable
    ? [
        h('a', { class: 'btn btn-primary btn-block', href: `#/spel/${id}/speel` }, icon('play'), saved.progress != null ? t('detail.continuePct', { pct: Math.round(saved.progress * 100) }) : t('detail.continue')),
        h('button', { type: 'button', class: 'btn btn-block', onclick: startNew }, t('detail.newGame')),
      ]
    : [h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: startNew }, icon('play'), t('detail.start'))];

  // Woordtuin: ook tegen een vriend, met de meest gespeelde vrienden bovenaan
  const vriendenBlok = id === 'woordtuin' && FEATURES.friends ? vriendenSectie() : null;

  return {
    title: game.name, nav: 'games', decor: 'hang-rechts',
    node: h('div', { class: 'view' }, header, levelPicker, howTo, h('div', { class: 'actionbar' }, actions), vriendenBlok?.el),
    cleanup: () => vriendenBlok?.off(),
  };
}


// "Speel tegen een vriend": zonder account een uitnodiging om in te loggen, anders de vrienden (meest gespeeld eerst) met één knop per vriend
function vriendenSectie() {
  const lijst = h('div', { class: 'stack' });
  const el = h('section', { class: 'card stack detail-vrienden', 'aria-labelledby': 'dv-titel' }, h('h2', { id: 'dv-titel' }, t('detail.friend.title')), lijst);
  const nodig = () => h('a', { class: 'btn btn-block', href: '#/account/inloggen' }, icon('user'), t('detail.friend.loginButton'));
  function render() {
    const u = auth.getUser();
    if (!u) { lijst.replaceChildren(h('p', {}, t('detail.friend.login')), nodig()); return; }
    const data = social.cached(), partijen = matches.cached();
    if (!(social.isLoaded() && matches.isLoaded())) { lijst.replaceChildren(h('p', { class: 'muted' }, t('common.loading'))); return; }
    const rijen = meestGespeeld(u.id, data.friends, partijen);
    if (!rijen.length) { lijst.replaceChildren(h('p', {}, t('detail.friend.none')), h('a', { class: 'btn btn-block', href: '#/vrienden' }, icon('friends'), t('detail.friend.addButton'))); return; }
    const MAX = 6;
    lijst.replaceChildren(...[
      h('ul', { class: 'dv-lijst' }, rijen.slice(0, MAX).map(({ friend, aantal, lopend }) => h('li', { class: 'dv-rij' },
        avatar(friend.name, friend.id),
        h('span', { class: 'dv-wie' }, h('strong', {}, friend.name), aantal ? h('small', { class: 'muted' }, t('detail.friend.played', { n: aantal })) : null),
        lopend
          ? h('a', { class: 'btn btn-primary', href: `#/partij/${lopend.id}` }, icon('play'), t('detail.continue'))
          : h('button', { type: 'button', class: 'btn btn-primary', onclick: () => nieuwePartij(friend) }, icon('play'), t('detail.newGame'))))),
      rijen.length > MAX ? h('a', { class: 'link-quiet', href: '#/vrienden' }, t('detail.friend.all')) : null].filter(Boolean));
  }
  render();
  if (auth.getUser()) { social.list().catch(() => {}); matches.list().catch(() => {}); }
  const offs = [social.subscribe(render), matches.subscribe(render), auth.subscribe(render)];
  return { el, off: () => offs.forEach((f) => f()) };
}
