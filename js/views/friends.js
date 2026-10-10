// Vrienden.
//
//   #/vrienden                          je vriendencode, verzoeken en je vrienden
//   #/vrienden/toevoegen/KODE           een link die iemand je stuurt: je ziet wie het is en bevestigt
//
// Je voegt iemand toe met zijn of haar vriendencode, nooit door te zoeken op een naam. Zo komen er geen
// vreemden bij en blijft alles overzichtelijk.

import { h, icon, avatar, copyText, shareText, dayText, choiceDialog, confirmDialog, announce, persoonNaam } from '../ui.js';
import { t, foutTekst, getTaal } from '../i18n/index.js';
import { TALEN } from '../shared/talen.js';
import { partijTaal } from '../shared/startvrienden.js';
import { getGameInfo } from '../games/registry.js';
import { FEATURES } from '../config.js';
import * as auth from '../services/auth.js';
import * as social from '../services/social.js';
import * as matches from '../services/matches.js';
import { uitslagTekst, nieuwePartij } from './partij.js';
import { field, form } from './forms.js';
import { notFoundView, loadingView } from './notFound.js';
import { backendKnown } from '../services/backend.js';
import { rememberFriendCode } from './account.js';

const page = (node, extra = {}) => ({ title: t('nav.friends'), nav: 'friends', decor: 'spray', node, ...extra });
const inviteLink = (code) => `${location.origin}${location.pathname}#/vrienden/toevoegen/${code.replace('-', '')}`;

function loggedOut(code) {
  if (code) rememberFriendCode(code);
  return page(h('div', { class: 'view' },
    h('header', { class: 'page-header' }, h('h1', { tabindex: '-1' }, t('nav.friends')),
      h('p', {}, code ? t('friends.loggedOut.link') : t('friends.loggedOut.text'))),
    h('div', { class: 'stack' },
      h('a', { class: 'btn btn-primary btn-block', href: '#/account/nieuw' }, t('account.create')),
      h('a', { class: 'btn btn-block', href: '#/account/inloggen' }, t('account.haveOne')))));
}

// De code groot, met knoppen om te kopiëren en te delen
function myCode(user, rerender) {
  const label = (btn, text) => { btn.lastChild.textContent = text; setTimeout(() => { btn.lastChild.textContent = btn.dataset.label; }, 2500); };
  const copy = h('button', { type: 'button', class: 'btn', 'data-label': t('account.copy'), onclick: async () => label(copy, (await copyText(user.code)) ? t('account.copied') : t('account.copyFailed')) }, icon('check'), h('span', {}, t('account.copy')));
  const share = h('button', { type: 'button', class: 'btn btn-primary', 'data-label': t('home.friends.shareCode'), onclick: async () => {
    const r = await shareText({ title: t('app.name'), text: t('home.friends.shareText', { code: user.code }), url: inviteLink(user.code) });
    if (r === 'gekopieerd') label(share, t('friends.shareLinkCopied')); else if (r === 'mislukt') label(share, t('account.copyFailed'));
  } }, icon('friends'), h('span', {}, t('home.friends.shareCode')));
  const renew = h('button', { type: 'button', class: 'btn btn-quiet', onclick: async () => {
    if (!(await confirmDialog({ title: t('friends.renew.title'), text: t('friends.renew.text'), confirmLabel: t('friends.renew.yes') }))) return;
    try { await auth.newFriendCode(); announce(t('friends.renewed')); rerender(); } catch (e) { announce(foutTekst(e)); }
  } }, t('friends.renewCode'));
  return h('section', { class: 'card code-card', 'aria-labelledby': 'code-titel' },
    h('h2', { id: 'code-titel' }, t('friends.yourCode')),
    h('p', { class: 'code', 'aria-label': user.code.split('-').join(', ') }, user.code.split('-').map((g) => h('span', {}, g))),
    h('p', { class: 'muted' }, t('friends.yourCodeHint')),
    h('div', { class: 'code-actions' }, share, copy), renew);
}

function row(person, buttons, sub) {
  return h('li', { class: 'friend' }, avatar(person.name, person.id),
    h('div', { class: 'who' }, h('strong', {}, persoonNaam(person)), sub ? h('span', { class: 'muted' }, sub) : null),
    h('div', { class: 'friend-actions' }, buttons));
}

// Hoe staan jullie ervoor? Alleen partijen die uitgespeeld zijn (niet gestopt) tellen mee.
function stand(friendId, myId) {
  let ik = 0, zij = 0;
  for (const m of matches.cached()) {
    if (m.status !== 'done' || !m.result?.scores || !m.players.some((p) => p.id === friendId)) continue;
    if (m.result.winner === myId) ik++; else if (m.result.winner === friendId) zij++;
  }
  return ik + zij ? t('friends.score', { me: ik, them: zij }) : '';
}

function partijRij(m, myId) {
  const tegen = m.players.find((p) => p.id !== myId) || { name: '' };
  const naam = persoonNaam(tegen);
  const klaar = m.status !== 'active';
  const s = m.summary?.scores;
  const mijn = s?.[myId], hun = s && Object.entries(s).find(([id]) => id !== myId)?.[1];
  const status = klaar ? uitslagTekst(m, myId, naam) : m.yourTurn ? t('friends.statusTurn') : t('friends.statusTheirTurn', { name: naam });
  const knop = klaar ? 'view' : m.yourTurn ? 'play' : 'open';
  const taal = partijTaal(m, getTaal());                      // alleen als de partij in een andere taal is dan de app
  return h('li', { class: `friend partij${m.yourTurn ? ' jouw-beurt' : ''}` }, avatar(naam, tegen.id || naam),
    h('div', { class: 'who' }, h('strong', {}, t('friends.gameWith', { game: getGameInfo('woordtuin').name, name: naam })),
      h('span', { class: m.yourTurn ? 'beurt-tekst' : 'muted' }, taal ? `${status} · ${TALEN[taal].native}` : status),
      !klaar && s ? h('span', { class: 'muted' }, t('friends.scoreLine', { mine: mijn, name: naam, theirs: hun, open: m.summary.open })) : null),
    h('div', { class: 'friend-actions' }, h('a', { class: `btn ${m.yourTurn ? 'btn-primary' : ''}`, href: `#/partij/${m.id}`, 'aria-label': t(`friends.aria${knop[0].toUpperCase()}${knop.slice(1)}`, { name: naam }) }, t(`friends.${knop}`))));
}

export function friendsView({ code }, app) {
  if (!backendKnown()) return loadingView();
  if (!FEATURES.friends) return notFoundView();
  const user = auth.getUser();
  if (!user) return loggedOut(code);

  const body = h('div', { class: 'stack' });
  const message = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  let alive = true;

  async function act(fn, ok) {
    try { await fn(); if (ok) announce(ok); } catch (e) { announce(foutTekst(e)); await choiceDialog({ title: t('common.didNotWork'), text: foutTekst(e), actions: [{ label: t('common.close'), value: true, primary: true, autofocus: true }] }); }
  }

  async function addByCode(raw) {
    const r = await social.request(raw);
    announce(r.status === 'accepted' ? t('friends.nowFriendsAnnounce', { name: r.friend.name }) : t('friends.requestSentAnnounce', { name: r.friend.name }));
    return r;
  }

  function render(data) {
    if (!alive) return;
    const u = auth.getUser(); if (!u) return;
    const addField = field({ label: t('friends.haveCode'), name: 'code', autocomplete: 'off', hint: t('friends.haveCodeHint'), required: true });
    const add = form({ fields: [addField], submitLabel: t('friends.sendRequest'), busyLabel: t('account.login.busy'), onSubmit: async (v) => {
      const r = await addByCode(v.code).catch((e) => { e.code = 'code'; throw e; });
      addField.input.value = '';
      message.textContent = r.status === 'accepted' ? t('friends.nowFriends', { name: r.friend.name }) : t('friends.requestSent', { name: r.friend.name });
    } });

    const incoming = data.incoming.length ? h('section', { 'aria-labelledby': 'inkomend' }, h('h2', { id: 'inkomend' }, t('friends.wantsToBe')),
      h('ul', { class: 'friends' }, data.incoming.map((p) => row(p, [
        h('button', { type: 'button', class: 'btn btn-primary', 'aria-label': t('home.friends.acceptAria', { name: p.name }), onclick: () => act(() => social.accept(p.id), t('home.friends.nowFriends', { name: p.name })) }, icon('check'), t('common.yes')),
        h('button', { type: 'button', class: 'btn btn-quiet', 'aria-label': t('home.friends.declineAria', { name: p.name }), onclick: () => act(() => social.decline(p.id), t('home.friends.declined')) }, t('common.no'))], t('friends.wantsToBeRow'))))) : null;

    const outgoing = data.outgoing.length ? h('section', { 'aria-labelledby': 'uitgaand' }, h('h2', { id: 'uitgaand' }, t('friends.waiting')),
      h('ul', { class: 'friends' }, data.outgoing.map((p) => row(p, [
        h('button', { type: 'button', class: 'btn btn-quiet', onclick: () => act(() => social.remove(p.id), t('friends.withdrawn')) }, t('friends.withdraw'))], t('friends.asked', { when: dayText(p.requested) }))))) : null;

    const alle = [...matches.cached()];
    const actief = alle.filter((m) => m.status === 'active').sort((a, b) => (b.yourTurn - a.yourTurn) || (b.updatedAt - a.updatedAt));
    const afgelopen = alle.filter((m) => m.status !== 'active').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
    const partijen = actief.length || afgelopen.length ? h('section', { 'aria-labelledby': 'partijen' }, h('h2', { id: 'partijen' }, t('friends.games')),
      h('ul', { class: 'friends' }, [...actief, ...afgelopen].map((m) => partijRij(m, u.id)))) : null;

    const friends = data.friends.length ? h('ul', { class: 'friends' }, data.friends.map((p) => row(p, [
      h('button', { type: 'button', class: 'btn btn-primary', 'aria-label': t('friends.playWith', { game: getGameInfo('woordtuin').name, name: p.name }), onclick: () => nieuwePartij(p) }, icon('woordtuin'), getGameInfo('woordtuin').name),
      h('button', { type: 'button', class: 'btn btn-quiet btn-danger', 'aria-label': t('friends.removeAria', { name: p.name }), onclick: async () => {
        if (await confirmDialog({ title: t('friends.removeTitle', { name: p.name }), text: t('friends.removeText'), confirmLabel: t('friends.removeYes') })) act(() => social.remove(p.id), t('friends.removed', { name: p.name }));
      } }, t('friends.remove'))], [t('friends.lastSeen', { when: dayText(p.lastSeen) }), stand(p.id, u.id)].filter(Boolean).join(' · '))))
      : h('div', { class: 'notice' }, h('strong', {}, t('friends.none.title')), h('p', {}, t('friends.none.text')));

    body.replaceChildren(...[incoming, partijen,
      h('section', { 'aria-labelledby': 'jouw-vrienden' }, h('h2', { id: 'jouw-vrienden' }, data.friends.length ? t('friends.yourFriendsN', { n: data.friends.length }) : t('friends.yourFriends')), friends),
      outgoing, myCode(u, () => render(social.cached())),
      h('section', { class: 'card stack', 'aria-labelledby': 'toevoegen' }, h('h2', { id: 'toevoegen' }, t('friends.addTitle')), add, message)].filter(Boolean));
  }

  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' }, h('h1', { tabindex: '-1' }, t('nav.friends')), h('p', {}, t('friends.subtitle'))),
    body);
  body.append(h('p', { class: 'muted' }, t('common.loading')));

  const off = social.subscribe(render);
  const off2 = matches.subscribe(() => render(social.cached()));
  matches.list().catch(() => {});
  social.list().then(async (d) => {
    render(d);
    if (code) {                                              // iemand stuurde je een link: laat zien wie het is, en vraag of je het wilt
      let who;
      try { who = await social.lookup(code); } catch (e) { await choiceDialog({ title: t('friends.link.brokenTitle'), text: foutTekst(e), actions: [{ label: t('common.close'), value: true, primary: true, autofocus: true }] }); location.hash = '#/vrienden'; return; }
      rememberFriendCode('');
      location.hash = '#/vrienden';
      if (who.self) { await choiceDialog({ title: t('friends.link.ownTitle'), text: t('friends.link.ownText'), actions: [{ label: t('common.fine'), value: true, primary: true, autofocus: true }] }); return; }
      const ok = await confirmDialog({ title: t('friends.link.addTitle', { name: who.name }), text: t('friends.link.addText', { name: who.name }), confirmLabel: t('friends.link.yes'), cancelLabel: t('common.no') });
      if (ok) act(() => addByCode(code), null);
    }
  }).catch((e) => { body.replaceChildren(h('div', { class: 'notice' }, h('p', {}, foutTekst(e)))); });

  return page(node, { cleanup: () => { alive = false; off(); off2(); } });
}
