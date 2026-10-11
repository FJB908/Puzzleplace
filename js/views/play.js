// Spelscherm: een rustig kader om het spel zelf. Het menu onderaan verdwijnt,
// zodat je niet per ongeluk wegtikt. Voortgang wordt na elke zet bewaard,
// dus "Terug" is altijd veilig (geen waarschuwing nodig).

import { h, icon, choiceDialog, announce } from '../ui.js';
import { getGameInfo, isReady } from '../games/registry.js';
import * as store from '../store.js';
import { notFoundView } from './notFound.js';
import { t, getTaal } from '../i18n/index.js';
import { TALEN } from '../shared/talen.js';

export async function playView({ id, mode }, app) {
  const game = getGameInfo(id);
  if (!game) return notFoundView();
  if (!isReady(game)) { location.replace(`#/spel/${id}`); return null; }

  const daily = mode === 'dagelijks';
  const slotName = daily ? 'daily' : 'normal';
  const today = store.todayKey();
  const record = store.getGame(id);

  // Het bewaarde spel van een andere dag telt niet meer mee.
  let slot = store.getSlot(id, slotName);
  if (daily && slot && slot.day !== today) slot = null;
  // Een spel dat je nog niet bent begonnen volgt de taal van nu; een spel dat al loopt blijft in zijn eigen taal (oude spellen waren Nederlands)
  if (slot && slot.state == null && slot.taal !== getTaal()) slot = null;

  // Nieuw slot aanmaken als dat nog niet bestaat.
  if (!slot) {
    slot = {
      seed: daily ? today : Math.random().toString(36).slice(2, 10),
      taal: getTaal(),
      difficulty: daily ? 'gemiddeld' : record.difficulty,
      state: null,
      updatedAt: Date.now(),
      ...(daily ? { day: today } : {}),
    };
    store.updateGame(id, (r) => { r.slots[slotName] = slot; });
  }

  const backHref = daily ? '#/' : `#/spel/${id}`;
  const level = game.difficulties.find((d) => d.id === slot.difficulty)?.label || '';
  const stage = h('div', { class: 'stage' }, h('p', { class: 'muted', role: 'status' }, t('play.loading')));

  const helpButton = h('button', { type: 'button', class: 'btn', onclick: showHelp }, icon('help'), t('play.howTo'));
  function showHelp() {
    return choiceDialog({
      title: t('play.howToTitle', { game: game.name }),
      body: h('ol', {}, game.howTo.map((s) => h('li', {}, s))),
      actions: [{ label: t('play.understood'), value: true, primary: true, autofocus: true }],
    });
  }

  const node = h('div', { class: 'view' },
    // Compacte kop: terug, de naam en het niveau in het midden, uitleg rechts. Zo blijft er zoveel mogelijk ruimte voor het spel.
    h('div', { class: 'play-bar' },
      h('a', { class: 'btn btn-quiet back', href: backHref }, icon('back'), t('common.back')),
      helpButton,
      h('header', { class: 'play-title' },
        h('h1', { tabindex: '-1' }, daily ? t('play.dailyTitle', { game: game.name }) : game.name),
        h('p', { class: 'muted' }, level))),
    stage,
    h('p', { class: 'save-note' }, t('play.autosave')),
  );

  let cleanup = null;
  let finished = false;      // het spel is afgelopen of weggegooid: er wordt niets meer bewaard
  let gone = false;          // je hebt het scherm verlaten: dan geen slotbericht meer

  const ctx = {
    gameId: id,
    daily,
    difficulty: slot.difficulty,
    seed: slot.seed,
    taal: slot.taal || 'nl',
    saved: slot.state,
    settings: { ...store.getSettings() },
    announce,
    // meta.progress (0 tot 1) laat op de kaarten zien hoe ver je bent. Zonder progress verdwijnt een oude waarde,
    // zodat er nooit een stand getoond wordt die bij een eerder moment hoort.
    save(state, meta = {}) {
      if (finished) return;
      store.updateGame(id, (r) => {
        r.slots[slotName] = { ...r.slots[slotName], state, updatedAt: Date.now(), progress: meta.progress ?? null };
      });
      store.setLastGame(id, slotName);
    },
    // Spel weggooien (bijv. na "game over"): de bewaarde stand verdwijnt.
    discard() {
      finished = true;
      store.updateGame(id, (r) => { r.slots[slotName] = store.clearedSlot(); });
    },
    // Het spel is uitgespeeld. Dat wordt meteen vastgelegd, ook als het spel nog een winst-animatie laat zien (result.delay,
    // in ms): verlaat je het scherm tijdens die animatie, dan staat er geen half spel meer bij "Verder spelen".
    // result mag ook { title, text, joy } meegeven voor een eigen slotbericht (bijv. "Gewonnen!" of "Mooi gespeeld!")
    async complete(result = {}) {
      if (finished) return;
      finished = true;
      store.updateGame(id, (r) => {
        r.completed = (r.completed || 0) + 1;
        r.slots[slotName] = store.clearedSlot();
        if (daily) r.dailyDone = today;
      });
      if (result.delay) await new Promise((resolve) => setTimeout(resolve, result.delay));
      if (gone) return;
      announce(result.title ?? t('play.done.announce'));
      const choice = await choiceDialog({
        title: result.title ?? t('play.done.title'),
        text: result.text ?? t(daily ? 'play.done.text.daily' : 'play.done.text'),
        body: result.body,
        joy: result.joy ?? true,
        actions: [
          { label: daily ? t('play.done.backHome') : t('play.done.again'), value: daily ? 'home' : 'again', primary: true, autofocus: true },
          { label: t('play.done.otherGame'), value: 'games' },
          ...(daily ? [] : [{ label: t('play.done.toHome'), value: 'home' }]),
        ],
        dismissValue: daily ? 'home' : 'detail',
      });
      location.hash = choice === 'again' ? `#/spel/${id}` : choice === 'games' ? '#/spellen' : choice === 'detail' ? `#/spel/${id}` : '#/';
    },
  };

  // Een spel dat al loopt is in zijn eigen taal begonnen. Is de app nu in een andere taal, dan vragen we wat je wilt: verder in die taal, of een nieuw spel in de taal van nu.
  async function taalKeuze() {
    const van = slot.taal || 'nl', naar = getTaal();
    if (slot.state == null || van === naar || !TALEN[van]) return;
    const keuze = await choiceDialog({
      title: t('play.otherLanguage.title'),
      text: t('play.otherLanguage.text', { from: TALEN[van].native, to: TALEN[naar].native }),
      actions: [
        { label: t('play.otherLanguage.new', { language: TALEN[naar].native }), value: 'nieuw', primary: true, autofocus: true },
        { label: t('play.otherLanguage.keep', { language: TALEN[van].native }), value: 'houd' },
      ],
      dismissValue: 'houd',
    });
    if (keuze !== 'nieuw') return;
    slot = { seed: daily ? today : Math.random().toString(36).slice(2, 10), taal: naar, difficulty: slot.difficulty, state: null, updatedAt: Date.now(), ...(daily ? { day: today } : {}) };
    store.updateGame(id, (r) => { r.slots[slotName] = slot; });
    Object.assign(ctx, { seed: slot.seed, taal: naar, saved: null });
  }

  // Spel laden en starten zodra het kader op het scherm staat (onShow).
  const start = async () => {
    try {
      await taalKeuze();
      const mod = await game.load();
      stage.replaceChildren();
      const result = await mod.mount(stage, ctx);
      if (typeof result === 'function') cleanup = result;
      store.setLastGame(id, slotName);
    } catch (err) {
      console.error(err);
      stage.replaceChildren(
        h('div', { class: 'stack' },
          h('p', {}, t('play.loadFailed')),
          h('button', { type: 'button', class: 'btn btn-primary', onclick: () => app.refresh() }, t('common.retry'))));
    }
  };

  return { title: game.name, nav: null, view: 'play', wide: !!game.wide, node, onShow: start, cleanup: () => { gone = true; if (cleanup) cleanup(); } };
}
