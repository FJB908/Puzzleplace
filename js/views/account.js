// Account: aanmelden, inloggen, wachtwoord vergeten en je gegevens beheren.
//
//   #/account                 overzicht (of uitleg als je niet bent ingelogd)
//   #/account/nieuw           account maken
//   #/account/klaar           herstelcode bewaren (direct na aanmelden)
//   #/account/inloggen        inloggen
//   #/account/herstel         wachtwoord vergeten
//   #/account/wachtwoord      wachtwoord wijzigen
//   #/account/herstelcode     nieuwe herstelcode maken
//   #/account/verwijderen     account verwijderen
//
// Bewust simpel: je meldt je aan met je voornaam, e-mailadres en een wachtwoord. Je kunt altijd zonder account blijven spelen.

import { h, icon, avatar, copyText, choiceDialog, confirmDialog, announce } from '../ui.js';
import { FEATURES } from '../config.js';
import * as auth from '../services/auth.js';
import * as sync from '../services/sync.js';
import * as store from '../store.js';
import { field, passwordField, form } from './forms.js';
import { notFoundView } from './notFound.js';

const PENDING_RECOVERY = 'pp-herstelcode';
const PENDING_FRIEND = 'pp-vriendcode';
const stash = {
  get: (k) => { try { return sessionStorage.getItem(k) || ''; } catch { return ''; } },
  set: (k, v) => { try { if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k); } catch { /* niet erg */ } },
};
export const rememberFriendCode = (code) => stash.set(PENDING_FRIEND, code);

const page = (title, node, extra = {}) => ({ title, nav: 'settings', decor: 'spray', node, ...extra });
const back = (href = '#/account', label = 'Terug') => h('a', { class: 'btn btn-quiet back', href }, icon('back'), label);
const header = (title, text, backHref) => h('header', { class: 'page-header' }, backHref ? back(backHref) : null, h('h1', { tabindex: '-1' }, title), text ? h('p', {}, text) : null);

// ----- Niet ingelogd -----
function intro() {
  const point = (iconName, title, text) => h('li', { class: 'point' }, h('span', { class: 'tile' }, icon(iconName)), h('span', {}, h('strong', {}, title), h('br'), h('span', { class: 'muted' }, text)));
  return page('Account', h('div', { class: 'view' },
    header('Account', 'Met een account speel je op al je apparaten verder en kun je met vrienden spelen.', '#/instellingen'),
    h('ul', { class: 'points' },
      point('games', 'Je voortgang op al je apparaten', 'Begin op je telefoon, ga verder op je tablet.'),
      point('friends', 'Vrienden en familie', 'Voeg iemand toe met een code. Geen vreemden, geen zoekopdrachten.'),
      point('daily', 'Straks samen spelen', 'Puzzels met beurten, ook als je niet tegelijk online bent.')),
    h('div', { class: 'stack' },
      h('a', { class: 'btn btn-primary btn-block', href: '#/account/nieuw' }, 'Account maken'),
      h('a', { class: 'btn btn-block', href: '#/account/inloggen' }, 'Ik heb al een account')),
    h('p', { class: 'muted' }, 'Je kunt altijd zonder account blijven spelen. Alles werkt dan gewoon op dit apparaat.')));
}

function signupView() {
  const pending = stash.get(PENDING_FRIEND);
  const f = { naam: field({ label: 'Je voornaam', name: 'naam', autocomplete: 'given-name', maxlength: 24, enterkeyhint: 'next', hint: 'Zo zien je vrienden je.' }),
    email: field({ label: 'Je e-mailadres', name: 'email', type: 'email', autocomplete: 'email', inputmode: 'email', enterkeyhint: 'next', hint: 'Hiermee log je in. We sturen er geen reclame naartoe.' }),
    wachtwoord: passwordField({ name: 'wachtwoord', autocomplete: 'new-password', suggest: true, hint: 'Minstens 8 tekens. Drie woorden achter elkaar is veilig en makkelijk te onthouden.' }) };
  return page('Account maken', h('div', { class: 'view' },
    header('Account maken', pending ? 'Maak eerst een account, daarna kun je je vriend of vriendin toevoegen.' : null, '#/account'),
    form({ fields: [f.naam, f.email, f.wachtwoord], submitLabel: 'Account maken', busyLabel: 'Account wordt gemaakt…',
      onSubmit: async (v) => {
        const r = await auth.signUp({ name: v.naam, email: v.email, password: v.wachtwoord });
        stash.set(PENDING_RECOVERY, r.recoveryCode);
        location.hash = '#/account/klaar';
      } }),
    h('p', { class: 'muted' }, 'Heb je al een account? ', h('a', { href: '#/account/inloggen' }, 'Log dan in'), '.')));
}

function loginView() {
  const f = { email: field({ label: 'Je e-mailadres', name: 'email', type: 'email', autocomplete: 'username', inputmode: 'email', enterkeyhint: 'next' }),
    wachtwoord: passwordField({ name: 'wachtwoord' }) };
  const wrong = new Set(['inloggen']);
  return page('Inloggen', h('div', { class: 'view' },
    header('Inloggen', null, '#/account'),
    form({ fields: [f.email, f.wachtwoord], submitLabel: 'Inloggen', busyLabel: 'Even kijken…',
      extra: h('p', { class: 'center' }, h('a', { href: '#/account/herstel' }, 'Wachtwoord vergeten?')),
      onSubmit: async (v) => {
        try { await auth.signIn({ email: v.email, password: v.wachtwoord }); }
        catch (e) { if (wrong.has(e.code)) e.code = 'wachtwoord'; throw e; }   // de melding bij het wachtwoordveld
        announce('Je bent ingelogd.');
        const pending = stash.get(PENDING_FRIEND);
        location.hash = pending ? `#/vrienden/toevoegen/${pending}` : '#/account';
      } }),
    h('p', { class: 'muted' }, 'Nog geen account? ', h('a', { href: '#/account/nieuw' }, 'Maak er een'), '.')));
}

// ----- Herstelcode -----
function codeCard(code) {
  const copy = h('button', { type: 'button', class: 'btn', onclick: async () => {
    const ok = await copyText(code);
    copy.lastChild.textContent = ok ? 'Gekopieerd' : 'Niet gelukt';
    setTimeout(() => { copy.lastChild.textContent = 'Kopieer'; }, 2500);
  } }, icon('check'), h('span', {}, 'Kopieer'));
  return h('section', { class: 'card code-card', 'aria-labelledby': 'herstel-titel' },
    h('h2', { id: 'herstel-titel' }, 'Je herstelcode'),
    h('p', { class: 'code', 'aria-label': code.split('-').join(', ') }, code.split('-').map((g) => h('span', {}, g))),
    h('div', { class: 'code-actions' }, copy, h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, icon('pencil'), 'Afdrukken')));
}

function readyView() {
  const code = stash.get(PENDING_RECOVERY);
  const user = auth.getUser();
  if (!user || !code) return page('Account', h('div', { class: 'view' }, header('Account', null, '#/account'), h('a', { class: 'btn btn-primary btn-block', href: '#/account' }, 'Naar je account')));
  const ok = h('input', { type: 'checkbox', id: 'bewaard', onchange: () => { go.disabled = !ok.checked; } });
  const go = h('button', { type: 'button', class: 'btn btn-primary btn-block', disabled: true, onclick: () => {
    stash.set(PENDING_RECOVERY, '');
    const pending = stash.get(PENDING_FRIEND);
    location.hash = pending ? `#/vrienden/toevoegen/${pending}` : '#/vrienden';
  } }, 'Doorgaan');
  return page('Account klaar', h('div', { class: 'view' },
    h('header', { class: 'page-header' }, h('h1', { tabindex: '-1' }, `Gelukt, ${user.name}!`), h('p', {}, 'Je account is klaar. Nog één belangrijk ding.')),
    codeCard(code),
    h('div', { class: 'notice' }, h('strong', {}, 'Bewaar deze code op een veilige plek.'),
      h('p', {}, 'Vergeet je ooit je wachtwoord, dan kies je met deze code een nieuw wachtwoord. Schrijf hem op papier, of bewaar hem bij je belangrijke papieren. We kunnen hem niet voor je terugvinden, maar je kunt later wel een nieuwe laten maken.')),
    h('label', { class: 'check', for: 'bewaard' }, ok, h('span', {}, 'Ik heb de code bewaard')),
    go,
    h('a', { class: 'link-quiet center', href: '#/vrienden', onclick: () => stash.set(PENDING_RECOVERY, '') }, 'Ik doe dit later')), { decor: null });
}

function newRecoveryView() {
  const f = passwordField({ label: 'Je wachtwoord', name: 'wachtwoord', hint: 'Ter controle, voordat we een nieuwe herstelcode maken. De oude werkt daarna niet meer.' });
  const out = h('div', { class: 'stack' });
  return page('Nieuwe herstelcode', h('div', { class: 'view' },
    header('Nieuwe herstelcode', null, '#/account'),
    form({ fields: [f], submitLabel: 'Nieuwe herstelcode maken', onSubmit: async (v) => {
      const { api } = await import('../services/backend.js');
      const r = await api('POST', '/api/me/recovery', { password: v.wachtwoord });
      out.replaceChildren(codeCard(r.recoveryCode), h('div', { class: 'notice' }, h('p', {}, 'Bewaar deze nieuwe code goed. De oude werkt niet meer.')));
    } }), out));
}

function recoverView() {
  const f = { email: field({ label: 'Je e-mailadres', name: 'email', type: 'email', autocomplete: 'username', inputmode: 'email' }),
    herstelCode: field({ label: 'Je herstelcode', name: 'herstelcode', autocomplete: 'off', hint: 'Dat is de code van 12 tekens die je bij het aanmelden kreeg, zoals K7P4-QM2X-9TBR.' }),
    wachtwoord: passwordField({ label: 'Een nieuw wachtwoord', name: 'wachtwoord', autocomplete: 'new-password', suggest: true }) };
  return page('Wachtwoord vergeten', h('div', { class: 'view' },
    header('Wachtwoord vergeten', 'Met je herstelcode kies je een nieuw wachtwoord.', '#/account/inloggen'),
    form({ fields: [f.email, f.herstelCode, f.wachtwoord], submitLabel: 'Nieuw wachtwoord instellen',
      onSubmit: async (v) => {
        const r = await auth.recover({ email: v.email, recoveryCode: v.herstelcode, password: v.wachtwoord }).catch((e) => { if (e.code === 'herstel') e.code = 'herstelcode'; throw e; });
        stash.set(PENDING_RECOVERY, r.recoveryCode);
        location.hash = '#/account/klaar';
      } }),
    h('p', { class: 'muted' }, 'Ook de herstelcode kwijt? Dan kunnen we helaas niet bij je account. Je kunt een nieuw account maken; de voortgang op je apparaten blijft bestaan.')));
}

// ----- Ingelogd -----
function syncCard() {
  const text = h('p', { class: 'muted' });
  const button = h('button', { type: 'button', class: 'btn', onclick: () => sync.syncNow() }, icon('check'), 'Nu synchroniseren');
  const show = (s) => {
    const t = s.at ? new Date(s.at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '';
    text.textContent = s.state === 'bezig' ? 'Even bijwerken…' : s.state === 'fout' ? `Niet gelukt: ${s.error}` : s.at ? `Alles is bijgewerkt (${t}).` : 'Wordt zo bijgewerkt.';
    button.disabled = s.state === 'bezig';
  };
  show(sync.getStatus());
  const off = sync.subscribe(show);
  return { el: h('section', { class: 'card stack', 'aria-labelledby': 'sync-titel' }, h('h2', { id: 'sync-titel' }, 'Je voortgang op al je apparaten'), text, button), off };
}

function overview(app) {
  const user = auth.getUser();
  const s = syncCard();
  let nameForm;
  const renameDetails = h('details', { class: 'disclosure' }, h('summary', {}, 'Je naam wijzigen'),
    h('div', { class: 'disclosure-body' }, (nameForm = form({ fields: [field({ label: 'Je voornaam', name: 'naam', value: user.name, autocomplete: 'given-name', maxlength: 24 })], submitLabel: 'Opslaan',
      onSubmit: async (v) => { await auth.rename(v.naam); announce('Naam opgeslagen'); app.refresh(); } }))));

  async function logout() {
    const choice = await choiceDialog({
      title: 'Uitloggen?', text: 'Je voortgang staat veilig in je account. Je kunt later gewoon weer inloggen.',
      actions: [
        { label: 'Uitloggen', value: 'uit', primary: true, autofocus: true },
        { label: 'Uitloggen en alles op dit apparaat wissen', value: 'wis' },
        { label: 'Blijven ingelogd', value: null },
      ], dismissValue: null,
    });
    if (!choice) return;
    await sync.syncNow();                                          // eerst nog alles opslaan in je account
    await auth.signOut();
    if (choice === 'wis') { store.resetAll(); }
    location.hash = '#/';
  }

  const row = (iconName, title, desc, href) => h('a', { class: 'card card-link', href },
    h('span', { class: 'tile' }, icon(iconName)), h('span', {}, h('span', { class: 'title' }, title), h('br'), h('span', { class: 'desc' }, desc)), icon('chevron'));

  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header profile' }, back('#/instellingen'),
      h('div', { class: 'profile-row' }, avatar(user.name, user.id), h('div', {}, h('h1', { tabindex: '-1' }, user.name), h('p', {}, user.email)))),
    s.el,
    row('friends', 'Vrienden', 'Je vriendencode en je vrienden', '#/vrienden'),
    renameDetails,
    h('div', { class: 'list' },
      row('settings', 'Wachtwoord wijzigen', 'Kies een nieuw wachtwoord', '#/account/wachtwoord'),
      row('help', 'Nieuwe herstelcode', 'Als je de oude kwijt bent', '#/account/herstelcode')),
    h('div', { class: 'stack' },
      h('button', { type: 'button', class: 'btn btn-block', onclick: logout }, 'Uitloggen'),
      h('a', { class: 'btn btn-danger btn-block', href: '#/account/verwijderen' }, 'Account verwijderen')));
  return page('Account', node, { cleanup: s.off });
}

function changePasswordView() {
  const f = { oud: passwordField({ label: 'Je huidige wachtwoord', name: 'wachtwoord' }), nieuw: passwordField({ label: 'Je nieuwe wachtwoord', name: 'nieuw', autocomplete: 'new-password', suggest: true }) };
  return page('Wachtwoord wijzigen', h('div', { class: 'view' }, header('Wachtwoord wijzigen', 'Op je andere apparaten moet je daarna opnieuw inloggen.', '#/account'),
    form({ fields: [f.oud, f.nieuw], submitLabel: 'Wachtwoord wijzigen', onSubmit: async (v) => {
      await auth.changePassword(v.wachtwoord, v.nieuw);
      await choiceDialog({ title: 'Gelukt', text: 'Je wachtwoord is gewijzigd.', actions: [{ label: 'Prima', value: true, primary: true, autofocus: true }] });
      location.hash = '#/account';
    } })));
}

function deleteView() {
  const f = passwordField({ label: 'Je wachtwoord', name: 'wachtwoord', hint: 'Ter controle.' });
  return page('Account verwijderen', h('div', { class: 'view' },
    header('Account verwijderen', 'Je account, je vrienden en je opgeslagen voortgang op onze server worden gewist. Wat op je apparaten staat, blijft staan.', '#/account'),
    form({ fields: [f], submitLabel: 'Ja, verwijder mijn account', onSubmit: async (v) => {
      if (!(await confirmDialog({ title: 'Zeker weten?', text: 'Dit kan niet ongedaan worden gemaakt.', confirmLabel: 'Ja, verwijderen' }))) return;
      await auth.deleteAccount(v.wachtwoord);
      location.hash = '#/';
    } })));
}

export function accountView({ sub }, app) {
  if (!FEATURES.accounts) return notFoundView();
  const user = auth.getUser();
  if (sub === 'nieuw') return user ? overview(app) : signupView();
  if (sub === 'inloggen') return user ? overview(app) : loginView();
  if (sub === 'herstel') return recoverView();
  if (sub === 'klaar') return readyView();
  if (!user) return intro();
  if (sub === 'wachtwoord') return changePasswordView();
  if (sub === 'herstelcode') return newRecoveryView();
  if (sub === 'verwijderen') return deleteView();
  return overview(app);
}
