// Vrienden.
//
//   #/vrienden                          je vriendencode, verzoeken en je vrienden
//   #/vrienden/toevoegen/KODE           een link die iemand je stuurt: je ziet wie het is en bevestigt
//
// Je voegt iemand toe met zijn of haar vriendencode, nooit door te zoeken op een naam. Zo komen er geen
// vreemden bij en blijft alles overzichtelijk.

import { h, icon, avatar, copyText, shareText, dayText, choiceDialog, confirmDialog, announce } from '../ui.js';
import { FEATURES } from '../config.js';
import * as auth from '../services/auth.js';
import * as social from '../services/social.js';
import * as matches from '../services/matches.js';
import { uitslagTekst, nieuwePartij } from './partij.js';
import { field, form } from './forms.js';
import { notFoundView, loadingView } from './notFound.js';
import { backendKnown } from '../services/backend.js';
import { rememberFriendCode } from './account.js';

const page = (node, extra = {}) => ({ title: 'Vrienden', nav: 'friends', decor: 'spray', node, ...extra });
const inviteLink = (code) => `${location.origin}${location.pathname}#/vrienden/toevoegen/${code.replace('-', '')}`;

function loggedOut(code) {
  if (code) rememberFriendCode(code);
  return page(h('div', { class: 'view' },
    h('header', { class: 'page-header' }, h('h1', { tabindex: '-1' }, 'Vrienden'),
      h('p', {}, code ? 'Iemand wil je als vriend toevoegen. Maak eerst een account of log in; daarna ga je meteen verder.' : 'Speel samen met mensen die je kent. Daarvoor heb je een account nodig.')),
    h('div', { class: 'stack' },
      h('a', { class: 'btn btn-primary btn-block', href: '#/account/nieuw' }, 'Account maken'),
      h('a', { class: 'btn btn-block', href: '#/account/inloggen' }, 'Ik heb al een account'))));
}

// De code groot, met knoppen om te kopiëren en te delen
function myCode(user, rerender) {
  const label = (btn, text) => { btn.lastChild.textContent = text; setTimeout(() => { btn.lastChild.textContent = btn.dataset.label; }, 2500); };
  const copy = h('button', { type: 'button', class: 'btn', 'data-label': 'Kopieer', onclick: async () => label(copy, (await copyText(user.code)) ? 'Gekopieerd' : 'Niet gelukt') }, icon('check'), h('span', {}, 'Kopieer'));
  const share = h('button', { type: 'button', class: 'btn btn-primary', 'data-label': 'Deel mijn code', onclick: async () => {
    const r = await shareText({ title: 'Puzzelplaats', text: `Speel met mij op Puzzelplaats! Mijn vriendencode is ${user.code}.`, url: inviteLink(user.code) });
    if (r === 'gekopieerd') label(share, 'Link gekopieerd'); else if (r === 'mislukt') label(share, 'Niet gelukt');
  } }, icon('friends'), h('span', {}, 'Deel mijn code'));
  const renew = h('button', { type: 'button', class: 'btn btn-quiet', onclick: async () => {
    if (!(await confirmDialog({ title: 'Nieuwe code maken?', text: 'Je oude code werkt dan niet meer. Je bestaande vrienden blijven gewoon je vrienden.', confirmLabel: 'Ja, nieuwe code' }))) return;
    try { await auth.newFriendCode(); announce('Nieuwe code gemaakt'); rerender(); } catch (e) { announce(e.message); }
  } }, 'Nieuwe code maken');
  return h('section', { class: 'card code-card', 'aria-labelledby': 'code-titel' },
    h('h2', { id: 'code-titel' }, 'Jouw vriendencode'),
    h('p', { class: 'code', 'aria-label': user.code.split('-').join(', ') }, user.code.split('-').map((g) => h('span', {}, g))),
    h('p', { class: 'muted' }, 'Geef deze code aan iemand die je kent. Die kan jou dan als vriend toevoegen.'),
    h('div', { class: 'code-actions' }, share, copy), renew);
}

function row(person, buttons, sub) {
  return h('li', { class: 'friend' }, avatar(person.name, person.id),
    h('div', { class: 'who' }, h('strong', {}, person.name), sub ? h('span', { class: 'muted' }, sub) : null),
    h('div', { class: 'friend-actions' }, buttons));
}

// Hoe staan jullie ervoor? Alleen partijen die uitgespeeld zijn (niet gestopt) tellen mee.
function stand(friendId, myId) {
  let ik = 0, zij = 0;
  for (const m of matches.cached()) {
    if (m.status !== 'done' || !m.result?.scores || !m.players.some((p) => p.id === friendId)) continue;
    if (m.result.winner === myId) ik++; else if (m.result.winner === friendId) zij++;
  }
  return ik + zij ? `jullie staan ${ik}–${zij}` : '';
}

function partijRij(m, myId) {
  const tegen = m.players.find((p) => p.id !== myId) || { name: 'Verwijderd account' };
  const klaar = m.status !== 'active';
  const s = m.summary?.scores;
  const mijn = s?.[myId], hun = s && Object.entries(s).find(([id]) => id !== myId)?.[1];
  const status = klaar ? uitslagTekst(m, myId, tegen.name) : m.yourTurn ? 'Jij bent aan de beurt' : `${tegen.name} is aan de beurt`;
  return h('li', { class: `friend partij${m.yourTurn ? ' jouw-beurt' : ''}` }, avatar(tegen.name, tegen.id),
    h('div', { class: 'who' }, h('strong', {}, `Woordtuin met ${tegen.name}`),
      h('span', { class: m.yourTurn ? 'beurt-tekst' : 'muted' }, status),
      !klaar && s ? h('span', { class: 'muted' }, `Jij ${mijn} · ${tegen.name} ${hun} · nog ${m.summary.open} open`) : null),
    h('div', { class: 'friend-actions' }, h('a', { class: `btn ${m.yourTurn ? 'btn-primary' : ''}`, href: `#/partij/${m.id}`, 'aria-label': `${klaar ? 'Bekijk' : m.yourTurn ? 'Speel' : 'Open'} de partij met ${tegen.name}` }, klaar ? 'Bekijken' : m.yourTurn ? 'Spelen' : 'Openen')));
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
    try { await fn(); if (ok) announce(ok); } catch (e) { announce(e.message); await choiceDialog({ title: 'Dat lukte niet', text: e.message, actions: [{ label: 'Sluiten', value: true, primary: true, autofocus: true }] }); }
  }

  async function addByCode(raw) {
    const r = await social.request(raw);
    announce(r.status === 'accepted' ? `Jij en ${r.friend.name} zijn nu vrienden.` : `Verzoek verstuurd naar ${r.friend.name}.`);
    return r;
  }

  function render(data) {
    if (!alive) return;
    const u = auth.getUser(); if (!u) return;
    const addField = field({ label: 'Heb je een code gekregen?', name: 'code', autocomplete: 'off', hint: 'Typ de vriendencode van iemand anders. Hoofdletters en streepjes maakt niet uit.', required: true });
    const add = form({ fields: [addField], submitLabel: 'Verzoek sturen', busyLabel: 'Even kijken…', onSubmit: async (v) => {
      const r = await addByCode(v.code).catch((e) => { e.code = 'code'; throw e; });
      addField.input.value = '';
      message.textContent = r.status === 'accepted' ? `Jij en ${r.friend.name} zijn nu vrienden!` : `Verzoek verstuurd naar ${r.friend.name}. Zodra ${r.friend.name} accepteert, zie je het hier.`;
    } });

    const incoming = data.incoming.length ? h('section', { 'aria-labelledby': 'inkomend' }, h('h2', { id: 'inkomend' }, 'Wil je vrienden worden?'),
      h('ul', { class: 'friends' }, data.incoming.map((p) => row(p, [
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => act(() => social.accept(p.id), `${p.name} is nu je vriend.`) }, icon('check'), 'Ja'),
        h('button', { type: 'button', class: 'btn btn-quiet', onclick: () => act(() => social.decline(p.id), 'Verzoek geweigerd.') }, 'Nee')], 'wil je als vriend')))) : null;

    const outgoing = data.outgoing.length ? h('section', { 'aria-labelledby': 'uitgaand' }, h('h2', { id: 'uitgaand' }, 'Wacht op antwoord'),
      h('ul', { class: 'friends' }, data.outgoing.map((p) => row(p, [
        h('button', { type: 'button', class: 'btn btn-quiet', onclick: () => act(() => social.remove(p.id), 'Verzoek ingetrokken.') }, 'Intrekken')], `gevraagd ${dayText(p.requested)}`)))) : null;

    const alle = [...matches.cached()];
    const actief = alle.filter((m) => m.status === 'active').sort((a, b) => (b.yourTurn - a.yourTurn) || (b.updatedAt - a.updatedAt));
    const afgelopen = alle.filter((m) => m.status !== 'active').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
    const partijen = actief.length || afgelopen.length ? h('section', { 'aria-labelledby': 'partijen' }, h('h2', { id: 'partijen' }, 'Partijen'),
      h('ul', { class: 'friends' }, [...actief, ...afgelopen].map((m) => partijRij(m, u.id)))) : null;

    const friends = data.friends.length ? h('ul', { class: 'friends' }, data.friends.map((p) => row(p, [
      h('button', { type: 'button', class: 'btn btn-primary', 'aria-label': `Woordtuin spelen met ${p.name}`, onclick: () => nieuwePartij(p) }, icon('woordtuin'), 'Woordtuin'),
      h('button', { type: 'button', class: 'btn btn-quiet btn-danger', 'aria-label': `${p.name} verwijderen`, onclick: async () => {
        if (await confirmDialog({ title: `${p.name} verwijderen?`, text: `Jullie zijn dan geen vrienden meer. Je kunt later altijd weer een verzoek sturen.`, confirmLabel: 'Ja, verwijderen' })) act(() => social.remove(p.id), `${p.name} is verwijderd.`);
      } }, 'Verwijderen')], [`laatst gezien ${dayText(p.lastSeen)}`, stand(p.id, u.id)].filter(Boolean).join(' · '))))
      : h('div', { class: 'notice' }, h('strong', {}, 'Nog geen vrienden'), h('p', {}, 'Deel je code met iemand die je kent, of vul hierboven de code van iemand anders in. Zodra jullie vrienden zijn, kun je straks samen spelen.'));

    body.replaceChildren(...[incoming, partijen,
      h('section', { 'aria-labelledby': 'jouw-vrienden' }, h('h2', { id: 'jouw-vrienden' }, data.friends.length ? `Jouw vrienden (${data.friends.length})` : 'Jouw vrienden'), friends),
      outgoing, myCode(u, () => render(social.cached())),
      h('section', { class: 'card stack', 'aria-labelledby': 'toevoegen' }, h('h2', { id: 'toevoegen' }, 'Vriend toevoegen'), add, message)].filter(Boolean));
  }

  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' }, h('h1', { tabindex: '-1' }, 'Vrienden'), h('p', {}, 'Speel samen met mensen die je kent.')),
    body);
  body.append(h('p', { class: 'muted' }, 'Even laden…'));

  const off = social.subscribe(render);
  const off2 = matches.subscribe(() => render(social.cached()));
  matches.list().catch(() => {});
  social.list().then(async (d) => {
    render(d);
    if (code) {                                              // iemand stuurde je een link: laat zien wie het is, en vraag of je het wilt
      let who;
      try { who = await social.lookup(code); } catch (e) { await choiceDialog({ title: 'Deze link werkt niet', text: e.message, actions: [{ label: 'Sluiten', value: true, primary: true, autofocus: true }] }); location.hash = '#/vrienden'; return; }
      rememberFriendCode('');
      location.hash = '#/vrienden';
      if (who.self) { await choiceDialog({ title: 'Dit is je eigen code', text: 'Stuur deze link aan iemand anders, dan kan die jou toevoegen.', actions: [{ label: 'Prima', value: true, primary: true, autofocus: true }] }); return; }
      const ok = await confirmDialog({ title: `${who.name} als vriend toevoegen?`, text: `We sturen ${who.name} een verzoek. Zodra ${who.name} accepteert, zijn jullie vrienden.`, confirmLabel: 'Ja, verstuur verzoek', cancelLabel: 'Nee' });
      if (ok) act(() => addByCode(code), null);
    }
  }).catch((e) => { body.replaceChildren(h('div', { class: 'notice' }, h('p', {}, e.message))); });

  return page(node, { cleanup: () => { alive = false; off(); off2(); } });
}
