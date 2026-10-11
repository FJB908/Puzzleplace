// Een partij Woordtuin tegen een vriend: #/partij/<id>
//
// De server bewaart de partij en bewaakt wie er aan de beurt is. Dit scherm laat het bord zien (hetzelfde paneel als tegen de
// computer), stuurt je woord op en kijkt af en toe of de ander gespeeld heeft. Je hoeft er niet op te wachten: sluit de app
// gerust, zodra de ander speelt zie je een cijfer bij Vrienden.

import { h, icon, choiceDialog, confirmDialog, announce, persoonNaam } from '../ui.js';
import { t, foutTekst, getTaal } from '../i18n/index.js';
import { FEATURES } from '../config.js';
import { getGameInfo } from '../games/registry.js';
import { maakPaneel } from '../games/woordtuin/paneel.js';
import { tip, makeRng, taalVan } from '../games/woordtuin/engine.js';
import { laadWoordenboek } from '../games/woordtuin/woordenboek.js';
import { uitslagKaart } from '../games/woordtuin/uitslag.js';
import { TALEN } from '../shared/talen.js';
import { burst, rain, motionOK } from '../effects.js';
import * as auth from '../services/auth.js';
import * as matches from '../services/matches.js';
import { loadingView } from './notFound.js';
import { backendKnown } from '../services/backend.js';

const POLL_MS = 12_000;
const tipsKey = (id) => `pp-tips:${id}`;
const usedTips = (id) => { try { return Number(sessionStorage.getItem(tipsKey(id)) ?? localStorage.getItem(tipsKey(id))) || 0; } catch { return 0; } };
const useTip = (id) => { try { localStorage.setItem(tipsKey(id), String(usedTips(id) + 1)); } catch { /* geen opslag: dan telt het niet mee */ } };

// Uitslag in gewone woorden, vanuit het oogpunt van wie meekijkt
export function uitslagTekst(match, myId, oppName) {
  const r = match.result;
  if (!r) return '';
  if (r.resigned) return r.resigned === myId ? t('match.result.resignedMe') : t('match.result.resignedThem', { name: oppName });
  const mijn = r.scores?.[myId] ?? 0, hun = Object.entries(r.scores || {}).find(([id]) => id !== myId)?.[1] ?? 0;
  if (!r.winner) return t('match.result.draw', { n: mijn });
  if (r.winner === myId) return t(r.tiebreak ? 'match.result.wonTiebreak' : 'match.result.won', { mine: mijn, theirs: hun });
  return t(r.tiebreak ? 'match.result.lostTiebreak' : 'match.result.lost', { name: oppName, mine: mijn, theirs: hun });
}

// Een nieuwe partij met een vriend: meteen beginnen, zonder tussenvenster. Elk krijgt 3 tips (een vriendelijke partij).
export async function nieuwePartij(friend) {
  try { const m = await matches.create(friend.id, 'woordtuin', { tips: 3, lang: getTaal() }); location.hash = `#/partij/${m.id}`; }
  catch (e) { await choiceDialog({ title: t('common.didNotWork'), text: foutTekst(e), actions: [{ label: t('common.close'), value: true, primary: true, autofocus: true }] }); }
}

export function partijView({ id }, app) {
  if (!backendKnown()) return { ...loadingView(), nav: null };
  const user = auth.getUser();
  if (!FEATURES.friends || !user) { location.replace('#/vrienden'); return null; }
  const info = getGameInfo('woordtuin');

  const stage = h('div', { class: 'stage stage--bare' }, h('p', { class: 'muted', role: 'status' }, t('match.loading')));
  const subtitel = h('p', { class: 'muted' }, '');
  const help = h('button', { type: 'button', class: 'btn', onclick: () => choiceDialog({
    title: t('play.howToTitle', { game: info.name }), body: h('ol', {}, info.howTo.map((s) => h('li', {}, s))), actions: [{ label: t('play.understood'), value: true, primary: true, autofocus: true }],
  }) }, icon('help'), t('play.howTo'));
  const node = h('div', { class: 'view' },
    h('div', { class: 'play-bar' },
      h('a', { class: 'btn btn-quiet back', href: '#/vrienden' }, icon('back'), t('common.back')), help,
      h('header', { class: 'play-title' }, h('h1', { tabindex: '-1' }, info.name), subtitel)),
    stage);

  let match = null, paneel = null, slot = 1, opp = t('match.opponent'), timer = null, dood = false, afgerond = false;
  const banner = h('p', { class: 'wt-uitslag', role: 'status' });
  const uitslagKnop = h('button', { type: 'button', class: 'btn btn-primary btn-block', hidden: true, onclick: () => einde() }, icon('check'), t('play.viewResult'));
  const wacht = h('p', { class: 'wt-wacht' });
  const stop = h('button', { type: 'button', class: 'btn btn-quiet wt-stop', onclick: stoppen }, t('match.stop'));

  function toon(m, { animeer = false } = {}) {
    const eerder = match;
    match = m;
    paneel.setState({ ...m.pub }, { animeer });
    const klaar = m.status !== 'active';
    banner.textContent = klaar ? uitslagTekst(m, user.id, opp) : '';
    banner.hidden = !klaar;
    uitslagKnop.hidden = !klaar || !!m.result?.resigned;
    wacht.hidden = klaar || m.yourTurn;
    wacht.textContent = t('match.waitNote', { name: opp, friends: t('nav.friends') });
    stop.hidden = klaar;
    if (eerder && eerder.version !== m.version && m.pub.last && m.pub.last.player !== slot) {
      announce(m.pub.last.pass ? t('woordtuin.last.other.pass', { name: opp }) : t('match.played', { name: opp, word: m.pub.last.word }));
    }
    if (klaar && !afgerond && eerder) { afgerond = true; einde(); }
    if (klaar) afgerond = true;
  }

  async function einde() {
    const r = match.result || {};
    const gewonnen = r.winner === user.id, gelijk = !r.winner && !r.resigned;
    if (gewonnen && motionOK()) {
      burst({ x: innerWidth / 2, y: innerHeight / 2, count: 26, power: 420, cone: [-170, -10], size: [14, 26], life: [1500, 2300] });
      rain({ count: 36 });
    }
    const keuze = await choiceDialog({
      title: t(r.resigned ? 'match.over.resigned' : gewonnen ? 'match.over.won' : gelijk ? 'match.over.draw' : 'match.over.lost'),
      text: uitslagTekst(match, user.id, opp),
      joy: gewonnen || gelijk,
      closable: true,                                               // kruisje: eerst de partij nog bekijken; "Toon de uitslag" brengt dit venster terug
      body: r.resigned ? null : uitslagKaart(match.pub, { [slot]: { naam: persoonNaam(user), id: user.id }, [3 - slot]: { naam: opp, id: match.players.find((p) => p.id !== user.id)?.id || opp } }, slot),
      actions: [
        { label: t('match.again', { name: opp }), value: 'nog', primary: true, autofocus: true },
        { label: t('match.backToFriends'), value: 'terug' },
      ],
      dismissValue: 'blijf',
    });
    if (dood || keuze === 'blijf') return;
    if (keuze === 'nog') {
      const vriend = match.players.find((p) => p.id !== user.id);
      if (!vriend?.id) { location.hash = '#/vrienden'; return; }
      try { const m = await matches.create(vriend.id, 'woordtuin', match.config); location.hash = `#/partij/${m.id}`; }
      catch (e) { await choiceDialog({ title: t('common.didNotWork'), text: foutTekst(e), actions: [{ label: t('common.close'), value: true, primary: true, autofocus: true }] }); }
    } else location.hash = '#/vrienden';
  }

  async function stoppen() {
    if (!(await confirmDialog({ title: t('match.stop.title'), text: t('match.stop.text', { name: opp }), confirmLabel: t('match.stop.yes') }))) return;
    try { toon(await matches.resign(id)); } catch (e) { announce(foutTekst(e)); }
  }

  async function ververs({ animeer = true } = {}) {
    if (dood || !match) return;
    try {
      const m = await matches.get(id, match.version);
      if (m && !dood) toon(m, { animeer });
    } catch { /* geen verbinding: volgende keer */ }
  }

  async function start() {
    let m;
    try {
      m = await matches.get(id);
      await laadWoordenboek(taalVan(m.pub));                         // de woorden van de taal van deze partij
    } catch (e) {
      stage.replaceChildren(h('div', { class: 'stack' }, h('p', {}, e.status === 404 ? t('match.notFound') : e.status !== undefined ? foutTekst(e) : t('play.loadFailed')),
        h('a', { class: 'btn btn-primary btn-block', href: '#/vrienden' }, t('match.backToFriends'))));
      return;
    }
    if (dood) return;
    slot = m.pub.players.indexOf(user.id) + 1;
    const tegen = m.players.find((p) => p.id !== user.id);
    opp = tegen ? persoonNaam(tegen) : t('match.opponent');
    // Speelt de ander in een andere taal dan de app van jou? Dan staat dat erbij, zodat je weet waarom de woorden anders zijn
    const taal = taalVan(m.pub);
    subtitel.textContent = taal === getTaal() ? t('match.with', { name: opp }) : `${t('match.with', { name: opp })} · ${TALEN[taal].native}`;
    const tips = m.config?.tips > 0 ? Math.max(0, m.config.tips - usedTips(id)) : null;
    paneel = maakPaneel({
      me: slot, names: { [slot]: t('match.you'), [3 - slot]: opp }, tips,
      onZet: async (path) => {
        try { toon(await matches.move(id, match.version, { path }), { animeer: true }); }
        catch (e) {
          if (e.code === 'versie') { await ververs(); throw new Error(t('match.versionChanged')); }
          if (e.key === 'move.over') { await ververs({ animeer: false }); throw e; }          // de partij is al afgelopen (de ander was eerder): laat de uitslag zien
          throw e;
        }
      },
      onPas: async () => {
        try { toon(await matches.move(id, match.version, { pass: true }), { animeer: true }); }
        catch (e) {
          if (e.code === 'versie') { await ververs(); throw new Error(t('match.versionChanged')); }
          if (e.key === 'move.over') { await ververs({ animeer: false }); throw e; }
          throw e;
        }
      },
      onTip: tips === null ? undefined : async () => { const hint = tip(match.pub, slot, makeRng(`tip|${id}|${usedTips(id)}`)); if (hint) useTip(id); return hint; },
    });
    stage.replaceChildren(h('div', {}, paneel.el, banner, uitslagKnop, wacht, h('div', { class: 'wt-onder' }, stop)));
    afgerond = m.status !== 'active';
    toon(m);
    afgerond = m.status !== 'active';
    timer = setInterval(() => { if (!document.hidden) ververs(); }, POLL_MS);
    document.addEventListener('visibilitychange', onZichtbaar);
  }
  const onZichtbaar = () => { if (!document.hidden) ververs(); };

  return {
    title: info.name, nav: null, view: 'play', node, onShow: start,
    cleanup: () => { dood = true; clearInterval(timer); document.removeEventListener('visibilitychange', onZichtbaar); },
  };
}
