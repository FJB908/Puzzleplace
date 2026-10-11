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

import { h, icon, avatar, copyText, choiceDialog, confirmDialog, announce, richText } from '../ui.js';
import { t, tijdTekst, foutTekst } from '../i18n/index.js';
import { getGameInfo } from '../games/registry.js';
import { FEATURES } from '../config.js';
import * as auth from '../services/auth.js';
import * as sync from '../services/sync.js';
import * as emails from '../services/emails.js';
import * as store from '../store.js';
import { field, passwordField, form } from './forms.js';
import { notFoundView, loadingView } from './notFound.js';
import { backendKnown } from '../services/backend.js';

const PENDING_RECOVERY = 'pp-herstelcode';
const PENDING_FRIEND = 'pp-vriendcode';
const stash = {
  get: (k) => { try { return sessionStorage.getItem(k) || ''; } catch { return ''; } },
  set: (k, v) => { try { if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k); } catch { /* niet erg */ } },
};
export const rememberFriendCode = (code) => stash.set(PENDING_FRIEND, code);

const page = (title, node, extra = {}) => ({ title, nav: 'settings', decor: 'spray', node, ...extra });
const back = (href = '#/account', label = t('common.back')) => h('a', { class: 'btn btn-quiet back', href }, icon('back'), label);
const header = (title, text, backHref) => h('header', { class: 'page-header' }, backHref ? back(backHref) : null, h('h1', { tabindex: '-1' }, title), text ? h('p', {}, text) : null);

// "Doorgaan met Facebook": alleen als de server een Facebook-app heeft. Staat bovenaan, want met één tik ben je er.
const FB_LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="#fff"/><path fill="#1877f2" d="M13.4 21v-7.3h2.5l.4-2.9h-2.9V9c0-.8.2-1.4 1.4-1.4h1.600V5c-.3 0-1.200-.1-2.300-.1-2.300 0-3.800 1.400-3.800 3.900v2.100H7.800v2.900h2.500V21z"/></svg>';
function facebookBlock(label = t('account.facebook.continue')) {
  if (!FEATURES.facebookLogin) return null;
  const logo = h('span', { class: 'fb-logo' }); logo.innerHTML = FB_LOGO;
  return h('div', { class: 'stack fb-block' },
    h('button', { type: 'button', class: 'btn btn-facebook btn-block', onclick: () => auth.startFacebook() }, logo, label),
    h('p', { class: 'divider' }, h('span', {}, t('account.orEmail'))));
}

// Waar je na inloggen heen gaat: eerst een vriend toevoegen als je via een link kwam, anders naar Start
function afterLogin() {
  const pending = stash.get(PENDING_FRIEND);
  location.hash = pending ? `#/vrienden/toevoegen/${pending}` : '#/';
}

// ----- Niet ingelogd -----
function intro() {
  const point = (iconName, title, text) => h('li', { class: 'point' }, h('span', { class: 'tile' }, icon(iconName)), h('span', {}, h('strong', {}, title), h('br'), h('span', { class: 'muted' }, text)));
  return page(t('account.title'), h('div', { class: 'view' },
    header(t('account.title'), t('account.intro.text'), '#/instellingen'),
    h('ul', { class: 'points' },
      point('games', t('account.intro.p1.title'), t('account.intro.p1.text')),
      point('friends', t('account.intro.p2.title'), t('account.intro.p2.text')),
      point('woordtuin', t('account.intro.p3.title', { game: getGameInfo('woordtuin').name }), t('account.intro.p3.text'))),
    h('div', { class: 'stack' },
      h('a', { class: 'btn btn-primary btn-block', href: '#/account/nieuw' }, t('account.create')),
      h('a', { class: 'btn btn-block', href: '#/account/inloggen' }, t('account.haveOne'))),
    h('p', { class: 'muted' }, t('account.optional'))));
}

function signupView() {
  const pending = stash.get(PENDING_FRIEND);
  const f = { naam: field({ label: t('account.firstName'), name: 'naam', autocomplete: 'given-name', maxlength: 24, enterkeyhint: 'next', hint: t('account.firstNameHint') }),
    email: field({ label: t('account.email'), name: 'email', type: 'email', autocomplete: 'email', inputmode: 'email', enterkeyhint: 'next', hint: t('account.emailHint'), suggestions: emails.remembered() }),
    wachtwoord: passwordField({ name: 'wachtwoord', autocomplete: 'new-password', suggest: true, hint: t('account.passwordHint') }) };
  return page(t('account.create'), h('div', { class: 'view' },
    header(t('account.create'), pending ? t('account.signup.pending') : null, '#/account'),
    facebookBlock(),
    form({ fields: [f.naam, f.email, f.wachtwoord], submitLabel: t('account.create'), busyLabel: t('account.signup.busy'),
      onSubmit: async (v) => {
        const r = await auth.signUp({ name: v.naam, email: v.email, password: v.wachtwoord });
        emails.remember(v.email);
        stash.set(PENDING_RECOVERY, r.recoveryCode);
        location.hash = '#/account/klaar';
      } }),
    h('p', { class: 'muted' }, richText(t('account.signup.haveAccount')))));
}

function loginView() {
  const known = emails.remembered();
  const f = { email: field({ label: t('account.email'), name: 'email', type: 'email', autocomplete: 'username', inputmode: 'email', enterkeyhint: 'next', value: known[0] || '', suggestions: known }),
    wachtwoord: passwordField({ name: 'wachtwoord' }) };
  const wrong = new Set(['inloggen']);
  return page(t('account.login'), h('div', { class: 'view' },
    header(t('account.login'), null, '#/account'),
    facebookBlock(),
    form({ fields: [f.email, f.wachtwoord], submitLabel: t('account.login'), busyLabel: t('account.login.busy'),
      extra: h('p', { class: 'center' }, h('a', { href: '#/account/herstel' }, t('account.forgot'))),
      onSubmit: async (v) => {
        try { await auth.signIn({ email: v.email, password: v.wachtwoord }); }
        catch (e) { if (wrong.has(e.code)) e.code = 'wachtwoord'; throw e; }   // de melding bij het wachtwoordveld
        emails.remember(v.email);
        announce(t('account.loggedIn'));
        afterLogin();
      } }),
    h('p', { class: 'muted' }, richText(t('account.login.noAccount')))));
}

// ----- Herstelcode -----
function codeCard(code) {
  const copy = h('button', { type: 'button', class: 'btn', onclick: async () => {
    const ok = await copyText(code);
    copy.lastChild.textContent = ok ? t('account.copied') : t('account.copyFailed');
    setTimeout(() => { copy.lastChild.textContent = t('account.copy'); }, 2500);
  } }, icon('check'), h('span', {}, t('account.copy')));
  return h('section', { class: 'card code-card', 'aria-labelledby': 'herstel-titel' },
    h('h2', { id: 'herstel-titel' }, t('account.recoveryCode')),
    h('p', { class: 'code', 'aria-label': code.split('-').join(', ') }, code.split('-').map((g) => h('span', {}, g))),
    h('div', { class: 'code-actions' }, copy, h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, icon('pencil'), t('account.print'))));
}

function readyView() {
  const code = stash.get(PENDING_RECOVERY);
  const user = auth.getUser();
  if (!user || !code) return page(t('account.title'), h('div', { class: 'view' }, header(t('account.title'), null, '#/account'), h('a', { class: 'btn btn-primary btn-block', href: '#/account' }, t('account.toAccount'))));
  const ok = h('input', { type: 'checkbox', id: 'bewaard', onchange: () => { go.disabled = !ok.checked; } });
  const go = h('button', { type: 'button', class: 'btn btn-primary btn-block', disabled: true, onclick: () => {
    stash.set(PENDING_RECOVERY, '');
    afterLogin();
  } }, t('account.done.continue'));
  return page(t('account.readyTitle'), h('div', { class: 'view' },
    h('header', { class: 'page-header' }, h('h1', { tabindex: '-1' }, t('account.done.title', { name: user.name })), h('p', {}, t('account.done.text'))),
    codeCard(code),
    h('div', { class: 'notice' }, h('strong', {}, t('account.done.keep')),
      h('p', {}, t('account.done.keepText'))),
    h('label', { class: 'check', for: 'bewaard' }, ok, h('span', {}, t('account.done.saved'))),
    go,
    h('a', { class: 'link-quiet center', href: '#/', onclick: () => stash.set(PENDING_RECOVERY, '') }, t('account.done.later'))), { decor: null });
}

function newRecoveryView() {
  const f = passwordField({ label: t('account.yourPassword'), name: 'wachtwoord', hint: t('account.newRecovery.hint') });
  const out = h('div', { class: 'stack' });
  return page(t('account.newRecovery'), h('div', { class: 'view' },
    header(t('account.newRecovery'), null, '#/account'),
    form({ fields: [f], submitLabel: t('account.newRecovery.make'), onSubmit: async (v) => {
      const { api } = await import('../services/backend.js');
      const r = await api('POST', '/api/me/recovery', { password: v.wachtwoord });
      out.replaceChildren(codeCard(r.recoveryCode), h('div', { class: 'notice' }, h('p', {}, t('account.newRecovery.keep'))));
    } }), out));
}

// Wachtwoord vergeten: standaard met een code per e-mail; wie zijn herstelcode heeft kan die ook gebruiken (#/account/herstel/code)
function recoverView(modus) {
  const emailVeld = () => field({ label: t('account.email'), name: 'email', type: 'email', autocomplete: 'username', inputmode: 'email', value: emails.remembered()[0] || '', suggestions: emails.remembered() });
  if (modus === 'code') {
    const f = { email: emailVeld(),
      herstelCode: field({ label: t('account.recoveryLabel'), name: 'herstelcode', autocomplete: 'off', hint: t('account.recoveryHint') }),
      wachtwoord: passwordField({ label: t('account.newPassword'), name: 'wachtwoord', autocomplete: 'new-password', suggest: true }) };
    return page(t('account.forgotTitle'), h('div', { class: 'view' },
      header(t('account.forgotTitle'), t('account.forgot.text'), '#/account/inloggen'),
      form({ fields: [f.email, f.herstelCode, f.wachtwoord], submitLabel: t('account.setPassword'),
        onSubmit: async (v) => {
          const r = await auth.recover({ email: v.email, recoveryCode: v.herstelcode, password: v.wachtwoord }).catch((e) => { if (e.code === 'herstel') e.code = 'herstelcode'; throw e; });
          stash.set(PENDING_RECOVERY, r.recoveryCode);
          location.hash = '#/account/klaar';
        } }),
      h('p', { class: 'center' }, h('a', { href: '#/account/herstel' }, t('account.forgot.useMail'))),
      h('p', { class: 'muted' }, t('account.lostBoth'))));
  }
  const slot = h('div', { class: 'stack' });
  const stap1 = () => {
    const email = emailVeld();
    slot.replaceChildren(form({ fields: [email], submitLabel: t('account.mail.send'), onSubmit: async (v) => { await auth.forgotMail(v.email); stap2(v.email); } }));
  };
  const stap2 = (adres) => {
    const code = field({ label: t('account.mail.codeLabel'), name: 'code', autocomplete: 'one-time-code', hint: t('account.mail.codeHint'), autofocus: true });
    const nieuw = passwordField({ label: t('account.newPassword'), name: 'wachtwoord', autocomplete: 'new-password', suggest: true });
    slot.replaceChildren(h('p', { class: 'notice', role: 'status' }, t('account.mail.sentForgot')),
      form({ fields: [code, nieuw], submitLabel: t('account.setPassword'), onSubmit: async (v) => { await auth.resetMail({ email: adres, code: v.code, password: v.wachtwoord }); afterLogin(); } }));
  };
  stap1();
  return page(t('account.forgotTitle'), h('div', { class: 'view' },
    header(t('account.forgotTitle'), t('account.forgot.mailText'), '#/account/inloggen'),
    slot,
    h('p', { class: 'center' }, h('a', { href: '#/account/herstel/code' }, t('account.forgot.useRecovery')))));
}

// ----- Ingelogd -----
function syncCard() {
  const text = h('p', { class: 'muted' });
  const button = h('button', { type: 'button', class: 'btn', onclick: () => sync.syncNow() }, icon('check'), t('account.sync.now'));
  const show = (s) => {
    const tijd = s.at ? tijdTekst(new Date(s.at), { hour: '2-digit', minute: '2-digit' }) : '';
    text.textContent = s.state === 'bezig' ? t('account.sync.busy') : s.state === 'fout' ? t('account.sync.failed', { error: s.error }) : s.at ? t('account.sync.ok', { time: tijd }) : t('account.sync.soon');
    button.disabled = s.state === 'bezig';
  };
  show(sync.getStatus());
  const off = sync.subscribe(show);
  return { el: h('section', { class: 'card stack', 'aria-labelledby': 'sync-titel' }, h('h2', { id: 'sync-titel' }, t('account.sync.title')), text, button), off };
}

function overview(app) {
  const user = auth.getUser();
  const s = syncCard();
  let nameForm;
  const renameDetails = h('details', { class: 'disclosure' }, h('summary', {}, t('account.changeName')),
    h('div', { class: 'disclosure-body' }, (nameForm = form({ fields: [field({ label: t('account.firstName'), name: 'naam', value: user.name, autocomplete: 'given-name', maxlength: 24 })], submitLabel: t('account.save'),
      onSubmit: async (v) => { await auth.rename(v.naam); announce(t('account.nameSaved')); app.refresh(); } }))));

  async function logout() {
    const choice = await choiceDialog({
      title: t('account.logout.title'), text: t('account.logout.text'),
      actions: [
        { label: t('account.logout'), value: 'uit', primary: true, autofocus: true },
        { label: t('account.logout.wipe'), value: 'wis' },
        { label: t('account.logout.stay'), value: null },
      ], dismissValue: null,
    });
    if (!choice) return;
    await sync.syncNow();                                          // eerst nog alles opslaan in je account
    await auth.signOut();
    if (choice === 'wis') { store.resetAll(); emails.forgetAll(); }
    location.hash = '#/';
  }

  const row = (iconName, title, desc, href) => h('a', { class: 'card card-link', href },
    h('span', { class: 'tile' }, icon(iconName)), h('span', {}, h('span', { class: 'title' }, title), h('br'), h('span', { class: 'desc' }, desc)), icon('chevron'));

  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header profile' }, back('#/instellingen'),
      h('div', { class: 'profile-row' }, avatar(user.name, user.id), h('div', {}, h('h1', { tabindex: '-1' }, user.name), h('p', {}, user.email || t('account.viaFacebook'))))),
    s.el,
    row('friends', t('nav.friends'), t('account.friendsHint'), '#/vrienden'),
    renameDetails,
    user.hasPassword ? h('div', { class: 'list' },
      row('settings', t('account.changePassword'), t('account.changePasswordHint'), '#/account/wachtwoord'),
      row('help', t('account.newRecovery'), t('account.newRecoveryHint'), '#/account/herstelcode')) : null,
    h('div', { class: 'stack' },
      h('button', { type: 'button', class: 'btn btn-block', onclick: logout }, t('account.logout')),
      h('a', { class: 'btn btn-danger btn-block', href: '#/account/verwijderen' }, t('account.delete'))));
  return page(t('account.title'), node, { cleanup: s.off });
}

// Wachtwoord veranderen: met je huidige wachtwoord, of (als je dat niet weet) met een code die we per e-mail sturen
function changePasswordView() {
  const klaar = async () => {
    await choiceDialog({ title: t('account.changed.title'), text: t('account.changed.text'), actions: [{ label: t('account.changed.ok'), value: true, primary: true, autofocus: true }] });
    location.hash = '#/account';
  };
  const f = { oud: passwordField({ label: t('account.currentPassword'), name: 'wachtwoord' }), nieuw: passwordField({ label: t('account.newPasswordLabel'), name: 'nieuw', autocomplete: 'new-password', suggest: true }) };
  const metWachtwoord = form({ fields: [f.oud, f.nieuw], submitLabel: t('account.changePassword'), onSubmit: async (v) => { await auth.changePassword(v.wachtwoord, v.nieuw); await klaar(); } });
  const mailBlok = h('section', { class: 'card stack' });
  const knop = () => {
    const melding = h('p', { class: 'form-error', role: 'alert', hidden: true });
    const b = h('button', { type: 'button', class: 'btn', onclick: async () => {
      b.disabled = true; melding.hidden = true;
      try { await auth.changePasswordCode(); stap2(); } catch (e) { melding.textContent = foutTekst(e); melding.hidden = false; b.disabled = false; }
    } }, icon('mail'), t('account.mail.send'));
    mailBlok.replaceChildren(h('p', {}, t('account.changePassword.mailText')), b, melding);
  };
  const stap2 = () => {
    const code = field({ label: t('account.mail.codeLabel'), name: 'code', autocomplete: 'one-time-code', hint: t('account.mail.codeHint'), autofocus: true });
    const nieuw = passwordField({ label: t('account.newPasswordLabel'), name: 'nieuw', autocomplete: 'new-password', suggest: true });
    mailBlok.replaceChildren(h('p', { class: 'notice', role: 'status' }, t('account.mail.sentChange', { email: auth.getUser()?.email || '' })),
      form({ fields: [code, nieuw], submitLabel: t('account.changePassword'), onSubmit: async (v) => { await auth.changePassword('', v.nieuw, v.code); await klaar(); } }));
  };
  knop();
  return page(t('account.changePassword'), h('div', { class: 'view' }, header(t('account.changePassword'), t('account.changePassword.text'), '#/account'), metWachtwoord, mailBlok));
}

function deleteView() {
  const heeftWachtwoord = auth.getUser().hasPassword;
  const f = passwordField({ label: t('account.yourPassword'), name: 'wachtwoord', hint: t('account.delete.passwordHint') });
  return page(t('account.delete'), h('div', { class: 'view' },
    header(t('account.delete'), t('account.delete.text'), '#/account'),
    form({ fields: heeftWachtwoord ? [f] : [], submitLabel: t('account.delete.submit'), onSubmit: async (v) => {
      if (!(await confirmDialog({ title: t('account.delete.confirmTitle'), text: t('account.delete.confirmText'), confirmLabel: t('account.delete.confirmYes') }))) return;
      await auth.deleteAccount(v.wachtwoord);
      emails.forgetAll();
      location.hash = '#/';
    } })));
}

// Terug van Facebook: het ticket inwisselen. Mislukt dat (geannuleerd, verlopen), dan een rustige uitleg.
function facebookView(ticket) {
  const status = h('p', { class: 'muted', role: 'status' }, t('forms.busy'));
  const mislukt = (text) => { status.textContent = text; node.append(
    h('div', { class: 'stack' }, h('a', { class: 'btn btn-primary btn-block', href: '#/account/inloggen' }, t('common.retry')), h('a', { class: 'btn btn-block', href: '#/' }, t('common.backHome')))); };
  const node = h('div', { class: 'view' }, h('header', { class: 'page-header' }, h('h1', { tabindex: '-1' }, t('account.facebook.title'))), status);
  if (ticket === 'fout') mislukt(t('account.facebook.failed'));
  else auth.claimFacebook(ticket).then(({ user }) => { if (user.email) emails.remember(user.email); announce(t('account.loggedIn')); afterLogin(); })
    .catch((e) => mislukt(foutTekst(e) || t('account.facebook.failedShort')));
  return page(t('account.facebook.title'), node);
}

export function accountView({ sub, arg }, app) {
  if (!backendKnown()) return loadingView();
  if (!FEATURES.accounts) return notFoundView();
  const user = auth.getUser();
  if (sub === 'nieuw') return user ? overview(app) : signupView();
  if (sub === 'inloggen') return user ? overview(app) : loginView();
  if (sub === 'herstel') return recoverView(arg);
  if (sub === 'klaar') return readyView();
  if (sub === 'facebook' && arg) return FEATURES.facebookLogin ? facebookView(arg) : notFoundView();
  if (!user) return intro();
  if (sub === 'wachtwoord') return changePasswordView();
  if (sub === 'herstelcode') return newRecoveryView();
  if (sub === 'verwijderen') return deleteView();
  return overview(app);
}
