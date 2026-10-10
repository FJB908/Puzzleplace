// Een partij Woordtuin tegen een vriend: #/partij/<id>
//
// De server bewaart de partij en bewaakt wie er aan de beurt is. Dit scherm laat het bord zien (hetzelfde paneel als tegen de
// computer), stuurt je woord op en kijkt af en toe of de ander gespeeld heeft. Je hoeft er niet op te wachten: sluit de app
// gerust, zodra de ander speelt zie je een cijfer bij Vrienden.

import { h, icon, choiceDialog, confirmDialog, announce } from '../ui.js';
import { FEATURES } from '../config.js';
import { getGameInfo } from '../games/registry.js';
import { maakPaneel } from '../games/woordtuin/paneel.js';
import { tip, makeRng } from '../games/woordtuin/engine.js';
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
  if (r.resigned) return r.resigned === myId ? 'Je bent gestopt met deze partij.' : `${oppName} is gestopt met deze partij.`;
  const mijn = r.scores?.[myId] ?? 0, hun = Object.entries(r.scores || {}).find(([id]) => id !== myId)?.[1] ?? 0;
  if (!r.winner) return `Gelijkspel: jullie hebben allebei ${mijn} bloemen.`;
  if (r.winner === myId) return `Jij hebt gewonnen met ${mijn} tegen ${hun}${r.tiebreak ? ' (bij gelijk aantal gaven de beschermde vakjes de doorslag)' : ''}.`;
  return `${oppName} won met ${hun} tegen ${mijn}${r.tiebreak ? ' (bij gelijk aantal gaven de beschermde vakjes de doorslag)' : ''}.`;
}

// Een nieuwe partij met een vriend: meteen beginnen, zonder tussenvenster. Elk krijgt 3 tips (een vriendelijke partij).
export async function nieuwePartij(friend) {
  try { const m = await matches.create(friend.id, 'woordtuin', { tips: 3 }); location.hash = `#/partij/${m.id}`; }
  catch (e) { await choiceDialog({ title: 'Dat lukte niet', text: e.message, actions: [{ label: 'Sluiten', value: true, primary: true, autofocus: true }] }); }
}

export function partijView({ id }, app) {
  if (!backendKnown()) return { ...loadingView(), nav: null };
  const user = auth.getUser();
  if (!FEATURES.friends || !user) { location.replace('#/vrienden'); return null; }
  const info = getGameInfo('woordtuin');

  const stage = h('div', { class: 'stage stage--bare' }, h('p', { class: 'muted', role: 'status' }, 'De partij wordt geladen…'));
  const subtitel = h('p', { class: 'muted' }, '');
  const help = h('button', { type: 'button', class: 'btn', onclick: () => choiceDialog({
    title: `Zo werkt ${info.name}`, body: h('ol', {}, info.howTo.map((s) => h('li', {}, s))), actions: [{ label: 'Begrepen', value: true, primary: true, autofocus: true }],
  }) }, icon('help'), 'Uitleg');
  const node = h('div', { class: 'view' },
    h('div', { class: 'play-bar' },
      h('a', { class: 'btn btn-quiet back', href: '#/vrienden' }, icon('back'), 'Terug'), help,
      h('header', { class: 'play-title' }, h('h1', { tabindex: '-1' }, 'Woordtuin'), subtitel)),
    stage);

  let match = null, paneel = null, slot = 1, opp = 'Je tegenstander', timer = null, dood = false, afgerond = false;
  const banner = h('p', { class: 'wt-uitslag', role: 'status' });
  const wacht = h('p', { class: 'wt-wacht' });
  const stop = h('button', { type: 'button', class: 'btn btn-quiet wt-stop', onclick: stoppen }, 'Partij stoppen');

  function toon(m, { animeer = false } = {}) {
    const eerder = match;
    match = m;
    paneel.setState({ ...m.pub }, { animeer });
    const klaar = m.status !== 'active';
    banner.textContent = klaar ? uitslagTekst(m, user.id, opp) : '';
    banner.hidden = !klaar;
    wacht.hidden = klaar || m.yourTurn;
    wacht.textContent = `Je hoeft niet te wachten: sluit de app gerust. Zodra ${opp} heeft gespeeld, zie je een cijfer bij Vrienden.`;
    stop.hidden = klaar;
    if (eerder && eerder.version !== m.version && m.pub.last && m.pub.last.player !== slot) {
      announce(`${opp} speelde ${m.pub.last.word}. Je bent aan de beurt.`);
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
      title: r.resigned ? 'De partij is afgelopen' : gewonnen ? 'Gewonnen, gefeliciteerd!' : gelijk ? 'Gelijkspel!' : 'Mooi gespeeld!',
      text: uitslagTekst(match, user.id, opp),
      joy: gewonnen || gelijk,
      actions: [
        { label: `Nog een partij met ${opp}`, value: 'nog', primary: true, autofocus: true },
        { label: 'Terug naar Vrienden', value: 'terug' },
      ],
      dismissValue: 'terug',
    });
    if (dood) return;
    if (keuze === 'nog') {
      const vriend = match.players.find((p) => p.id !== user.id);
      if (!vriend?.id) { location.hash = '#/vrienden'; return; }
      try { const m = await matches.create(vriend.id, 'woordtuin', match.config); location.hash = `#/partij/${m.id}`; }
      catch (e) { await choiceDialog({ title: 'Dat lukte niet', text: e.message, actions: [{ label: 'Sluiten', value: true, primary: true, autofocus: true }] }); }
    } else location.hash = '#/vrienden';
  }

  async function stoppen() {
    if (!(await confirmDialog({ title: 'Deze partij stoppen?', text: `De partij eindigt dan voor jullie allebei. Dat is helemaal niet erg: je kunt altijd een nieuwe beginnen met ${opp}.`, confirmLabel: 'Ja, stoppen' }))) return;
    try { toon(await matches.resign(id)); } catch (e) { announce(e.message); }
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
    try { m = await matches.get(id); }
    catch (e) {
      stage.replaceChildren(h('div', { class: 'stack' }, h('p', {}, e.status === 404 ? 'Deze partij bestaat niet (meer).' : e.message),
        h('a', { class: 'btn btn-primary btn-block', href: '#/vrienden' }, 'Terug naar Vrienden')));
      return;
    }
    if (dood) return;
    slot = m.pub.players.indexOf(user.id) + 1;
    const tegen = m.players.find((p) => p.id !== user.id);
    opp = tegen?.name || 'Je tegenstander';
    subtitel.textContent = `met ${opp}`;
    const tips = m.config?.tips > 0 ? Math.max(0, m.config.tips - usedTips(id)) : null;
    paneel = maakPaneel({
      me: slot, names: { [slot]: 'Jij', [3 - slot]: opp }, tips,
      onZet: async (path) => {
        try { toon(await matches.move(id, match.version, { path }), { animeer: true }); }
        catch (e) {
          if (e.code === 'versie') { await ververs(); throw new Error(`De stand was net veranderd. Kijk even naar het bord en probeer je woord nog eens.`); }
          throw e;
        }
      },
      onTip: tips === null ? undefined : async () => { const t = tip(match.pub, slot, makeRng(`tip|${id}|${usedTips(id)}`)); if (t) useTip(id); return t; },
    });
    stage.replaceChildren(h('div', {}, paneel.el, banner, wacht, h('div', { class: 'wt-onder' }, stop)));
    afgerond = m.status !== 'active';
    toon(m);
    afgerond = m.status !== 'active';
    timer = setInterval(() => { if (!document.hidden) ververs(); }, POLL_MS);
    document.addEventListener('visibilitychange', onZichtbaar);
  }
  const onZichtbaar = () => { if (!document.hidden) ververs(); };

  return {
    title: 'Woordtuin', nav: null, view: 'play', node, onShow: start,
    cleanup: () => { dood = true; clearInterval(timer); document.removeEventListener('visibilitychange', onZichtbaar); },
  };
}
