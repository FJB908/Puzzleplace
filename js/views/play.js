// Spelscherm: een rustig kader om het spel zelf. Het menu onderaan verdwijnt,
// zodat je niet per ongeluk wegtikt. Voortgang wordt na elke zet bewaard,
// dus "Terug" is altijd veilig (geen waarschuwing nodig).

import { h, icon, choiceDialog, announce } from '../ui.js';
import { getGameInfo, isReady } from '../games/registry.js';
import * as store from '../store.js';
import { notFoundView } from './notFound.js';

export async function playView({ id, mode }, app) {
  const game = getGameInfo(id);
  if (!game) return notFoundView();
  if (!isReady(game)) { location.replace(`#/spel/${id}`); return null; }

  const daily = mode === 'dagelijks';
  const slotName = daily ? 'daily' : 'normal';
  const today = store.todayKey();
  const record = store.getGame(id);

  // Het bewaarde spel van een andere dag telt niet meer mee.
  let slot = record.slots[slotName];
  if (daily && slot && slot.day !== today) slot = null;

  // Nieuw slot aanmaken als dat nog niet bestaat.
  if (!slot) {
    slot = {
      seed: daily ? today : Math.random().toString(36).slice(2, 10),
      difficulty: daily ? 'gemiddeld' : record.difficulty,
      state: null,
      updatedAt: Date.now(),
      ...(daily ? { day: today } : {}),
    };
    store.updateGame(id, (r) => { r.slots[slotName] = slot; });
  }

  const backHref = daily ? '#/' : `#/spel/${id}`;
  const level = game.difficulties.find((d) => d.id === slot.difficulty)?.label || '';
  const stage = h('div', { class: 'stage' }, h('p', { class: 'muted', role: 'status' }, 'Het spel wordt geladen…'));

  const helpButton = h('button', { type: 'button', class: 'btn', onclick: showHelp }, icon('help'), 'Uitleg');
  function showHelp() {
    return choiceDialog({
      title: `Zo werkt ${game.name}`,
      body: h('ol', {}, game.howTo.map((s) => h('li', {}, s))),
      actions: [{ label: 'Begrepen', value: true, primary: true, autofocus: true }],
    });
  }

  const node = h('div', { class: 'view' },
    h('div', { class: 'play-bar' },
      h('a', { class: 'btn btn-quiet back', href: backHref }, icon('back'), 'Terug'),
      helpButton),
    h('header', { class: 'play-title' },
      h('h1', { tabindex: '-1' }, daily ? `Puzzel van de dag: ${game.name}` : game.name),
      h('p', { class: 'muted' }, level)),
    stage,
    h('p', { class: 'save-note' }, 'Je voortgang wordt vanzelf bewaard.'),
  );

  let cleanup = null;
  let finished = false;

  const ctx = {
    gameId: id,
    difficulty: slot.difficulty,
    seed: slot.seed,
    saved: slot.state,
    settings: { ...store.getSettings() },
    announce,
    save(state) {
      if (finished) return;
      store.updateGame(id, (r) => {
        r.slots[slotName] = { ...r.slots[slotName], state, updatedAt: Date.now() };
      });
      store.setLastGame(id, slotName);
    },
    async complete(result) {
      if (finished) return;
      finished = true;
      store.updateGame(id, (r) => {
        r.completed = (r.completed || 0) + 1;
        r.slots[slotName] = null;
        if (daily) r.dailyDone = today;
      });
      announce('Goed gedaan! Het spel is uitgespeeld.');
      const choice = await choiceDialog({
        title: 'Goed gedaan!',
        text: `Je hebt ${daily ? 'de puzzel van de dag' : 'dit spel'} uitgespeeld.`,
        actions: [
          { label: daily ? 'Terug naar Start' : 'Nog een keer', value: daily ? 'home' : 'again', primary: true, autofocus: true },
          { label: 'Ander spel kiezen', value: 'games' },
          ...(daily ? [] : [{ label: 'Naar Start', value: 'home' }]),
        ],
        dismissValue: daily ? 'home' : 'detail',
      });
      location.hash = choice === 'again' ? `#/spel/${id}` : choice === 'games' ? '#/spellen' : choice === 'detail' ? `#/spel/${id}` : '#/';
    },
  };

  // Spel laden en starten zodra het kader op het scherm staat (onShow).
  const start = async () => {
    try {
      const mod = await game.load();
      stage.replaceChildren();
      const result = await mod.mount(stage, ctx);
      if (typeof result === 'function') cleanup = result;
      store.setLastGame(id, slotName);
    } catch (err) {
      console.error(err);
      stage.replaceChildren(
        h('div', { class: 'stack' },
          h('p', {}, 'Het spel kon niet worden geladen. Controleer je verbinding en probeer het nog eens.'),
          h('button', { type: 'button', class: 'btn btn-primary', onclick: () => app.refresh() }, 'Opnieuw proberen')));
    }
  };

  return { title: game.name, nav: null, node, onShow: start, cleanup: () => cleanup && cleanup() };
}
