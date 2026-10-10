// Voor het spelen: wat is dit spel, welk niveau, en dan één grote knop.
// Flow: Spellen -> dit scherm -> Spelen. Nooit meer dan drie tikken vanaf Start.

import { h, icon, confirmDialog } from '../ui.js';
import { getGameInfo, isReady } from '../games/registry.js';
import * as store from '../store.js';
import { notFoundView } from './notFound.js';

export function gameDetailView({ id }, app) {
  const game = getGameInfo(id);
  if (!game) return notFoundView();

  const record = store.getGame(id);
  const ready = isReady(game);
  const saved = record.slots.normal;
  const resumable = ready && saved && saved.state != null;
  let level = resumable ? saved.difficulty : record.difficulty;

  const header = h('header', { class: 'page-header' },
    h('a', { class: 'btn btn-quiet back', href: '#/spellen' }, icon('back'), 'Terug'),
    h('div', { class: 'card-link', style: 'grid-template-columns:auto 1fr' },
      h('span', { class: 'tile' }, icon(game.icon)),
      h('h1', { tabindex: '-1' }, game.name)),
    h('p', {}, game.summary),
  );

  const howTo = h('details', { class: 'disclosure' },
    h('summary', {}, 'Zo werkt het'),
    h('div', { class: 'disclosure-body' }, h('ol', {}, game.howTo.map((s) => h('li', {}, s)))),
  );

  if (!ready) {
    return {
      title: game.name, nav: 'games', decor: 'hang-rechts',
      node: h('div', { class: 'view' }, header, howTo,
        h('div', { class: 'notice', role: 'note' },
          h('strong', {}, 'Dit spel komt binnenkort.'),
          h('p', {}, 'We werken eraan. Probeer ondertussen een ander spel.')),
        h('a', { class: 'btn btn-primary btn-block', href: '#/spellen' }, 'Terug naar alle spellen')),
    };
  }

  const levelPicker = h('fieldset', {},
    h('legend', {}, 'Hoe moeilijk?'),
    h('div', { class: 'options options--stack' },
      game.difficulties.map((d) => h('label', { class: 'option' },
        h('input', {
          type: 'radio', name: 'level', value: d.id, checked: d.id === level,
          disabled: resumable, // een bewaard spel heeft zijn eigen niveau
          onchange: () => { level = d.id; store.updateGame(id, (r) => { r.difficulty = d.id; }); },
        }),
        h('span', { class: 'option-body' }, h('strong', {}, d.label), h('small', {}, d.hint)),
      ))),
    resumable ? h('p', { class: 'field-hint' }, 'Kies "Nieuw spel" om een ander niveau te kiezen.') : null,
  );

  async function startNew() {
    if (resumable) {
      const ok = await confirmDialog({
        title: 'Nieuw spel beginnen?',
        text: 'Je bewaarde spel wordt dan vervangen.',
        confirmLabel: 'Ja, nieuw spel',
      });
      if (!ok) return;
    }
    store.updateGame(id, (r) => { r.slots.normal = null; r.difficulty = level; });
    location.hash = `#/spel/${id}/speel`;
  }

  // Bewaard spel: "Verder spelen" is de hoofdkeuze. Anders is "Spel starten" dat.
  const actions = resumable
    ? [
        h('a', { class: 'btn btn-primary btn-block', href: `#/spel/${id}/speel` }, icon('play'), 'Verder spelen'),
        h('button', { type: 'button', class: 'btn btn-block', onclick: startNew }, 'Nieuw spel'),
      ]
    : [h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: startNew }, icon('play'), 'Spel starten')];

  return {
    title: game.name, nav: 'games', decor: 'hang-rechts',
    node: h('div', { class: 'view' }, header, howTo, levelPicker, h('div', { class: 'stack' }, actions)),
  };
}
