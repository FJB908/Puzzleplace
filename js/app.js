// Opstarten: instellingen toepassen, menu bouwen, router starten.
//
// Routes (alles achter #, zodat het op elke simpele hosting werkt):
//   #/                          Start
//   #/spellen                   Alle spellen
//   #/spel/:id                  Spel: uitleg + niveau + starten
//   #/spel/:id/speel            Spelen (verder of nieuw)
//   #/spel/:id/speel/dagelijks  Puzzel van de dag
//   #/instellingen  #/hulp
//   #/account  #/vrienden       (alleen als FEATURES aan staat)

import { h, icon, announce } from './ui.js';
import { FEATURES, APP } from './config.js';
import { setDecor } from './decor.js';
import { initAmbient, initRipple, motionOK } from './effects.js';
import * as store from './store.js';
import { homeView } from './views/home.js';
import { gamesView } from './views/games.js';
import { gameDetailView } from './views/gameDetail.js';
import { playView } from './views/play.js';
import { settingsView } from './views/settings.js';
import { helpView } from './views/help.js';
import { accountView } from './views/account.js';
import { friendsView } from './views/friends.js';
import { partijView } from './views/partij.js';
import { detect, hasBackend } from './services/backend.js';
import * as auth from './services/auth.js';
import * as social from './services/social.js';
import * as matches from './services/matches.js';
import * as sync from './services/sync.js';
import { notFoundView } from './views/notFound.js';

// ----- Menu: één lijst; nieuwe onderdelen komen hier bij -----
const NAV_ALL = [
  { id: 'home', label: 'Start', href: '#/', icon: 'home' },
  { id: 'games', label: 'Spellen', href: '#/spellen', icon: 'games' },
  { id: 'friends', label: 'Vrienden', href: '#/vrienden', icon: 'friends', feature: 'friends' },
  { id: 'settings', label: 'Instellingen', href: '#/instellingen', icon: 'settings' },
];

// [patroon, view, parameters uit het patroon]
const ROUTES = [
  [/^\/?$/, homeView, () => ({})],
  [/^\/spellen$/, gamesView, () => ({})],
  [/^\/spel\/([\w-]+)$/, gameDetailView, (m) => ({ id: m[1] })],
  [/^\/spel\/([\w-]+)\/speel(?:\/(dagelijks))?$/, playView, (m) => ({ id: m[1], mode: m[2] })],
  [/^\/instellingen$/, settingsView, () => ({})],
  [/^\/hulp$/, helpView, () => ({})],
  [/^\/account(?:\/(\w+)(?:\/([\w-]+))?)?$/, accountView, (m) => ({ sub: m[1], arg: m[2] })],
  [/^\/vrienden$/, friendsView, () => ({})],
  [/^\/partij\/([\w-]+)$/, partijView, (m) => ({ id: m[1] })],
  [/^\/vrienden\/toevoegen\/([A-Za-z0-9-]{4,20})$/, friendsView, (m) => ({ code: m[1] })],
];

// ----- Instellingen op de pagina toepassen -----
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applySettings() {
  const s = store.getSettings();
  const root = document.documentElement;
  root.dataset.textsize = s.textSize;
  root.dataset.contrast = s.contrast;
  root.dataset.calm = String(!!s.calm);
  root.dataset.decor = String(s.decor !== false);
  root.dataset.theme = s.theme === 'auto' ? (darkQuery.matches ? 'dark' : 'light') : s.theme;
}
darkQuery.addEventListener?.('change', applySettings);

// ----- Menu tekenen -----
const navEl = document.getElementById('nav');
let activeNav = null;

// Het menu bouwen: "Vrienden" komt erbij zodra de app een server vindt
function buildNav() {
  const items = NAV_ALL.filter((item) => !item.feature || FEATURES[item.feature]);
  navEl.style.setProperty('--nav-count', items.length);
  navEl.replaceChildren(...items.map((item) => h('a', { href: item.href, 'data-nav': item.id }, icon(item.icon), item.label)));
  updateNav(activeNav);
  updateBadge();
}

// Een bolletje met een getal op "Vrienden": nieuwe verzoeken (en later: jij bent aan de beurt)
function updateBadge() {
  const link = navEl.querySelector('[data-nav="friends"]');
  if (!link) return;
  const { incoming, yourTurn } = auth.getCounts();
  const n = auth.getUser() ? incoming + yourTurn : 0;
  if (n > 0) { link.dataset.badge = String(n); link.setAttribute('aria-label', `Vrienden, ${n} nieuw`); }
  else { delete link.dataset.badge; link.removeAttribute('aria-label'); }
}

function updateNav(active) {
  activeNav = active;
  navEl.hidden = active == null; // tijdens het spelen geen menu
  if (!navEl.hidden) document.documentElement.style.setProperty('--nav-h', `${navEl.offsetHeight}px`);
  navEl.querySelectorAll('a').forEach((a) => {
    if (a.dataset.nav === active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// ----- Router -----
const main = document.getElementById('main');
let current = null;
let token = 0;

const app = { applySettings, refresh: () => render(false), announce };

async function render(moveFocus = true) {
  const mine = ++token;
  const path = location.hash.replace(/^#/, '') || '/';

  let result = null;
  for (const [pattern, view, toParams] of ROUTES) {
    const m = path.match(pattern);
    if (m) { result = await view(toParams(m), app); break; }
  }
  if (!result && !ROUTES.some(([pattern]) => pattern.test(path))) result = notFoundView();
  if (mine !== token || result == null) return; // ondertussen ergens anders heen of doorgestuurd

  const swap = () => {
    current?.cleanup?.();
    current = result;

    document.title = `${result.title} · ${APP.name}`;
    main.dataset.wide = String(!!result.wide);
    document.body.dataset.view = result.view || 'page';
    if (!moveFocus) result.node.classList.add('view--static');       // alleen verversen: niet opnieuw laten inschuiven
    [...result.node.children].forEach((child, i) => child.style.setProperty('--i', i));
    main.replaceChildren(result.node);
    updateNav(result.nav);

    result.onShow?.();

    if (moveFocus) {
      window.scrollTo(0, 0);
      const heading = main.querySelector('h1');
      (heading || main).focus({ preventScroll: true });
      announce(result.title);
    }
  };

  // Zachte overgang tussen pagina's (waar de browser dat kan), anders direct wisselen.
  if (moveFocus && motionOK() && document.startViewTransition && current) {
    try { await document.startViewTransition(swap).updateCallbackDone; } catch { /* al gewisseld of onderbroken */ }
  } else swap();

  const s = store.getSettings();
  setDecor(s.decor !== false && s.contrast !== 'high' ? result.decor ?? null : null);
}

// Weinig geheugen of processorkernen: wat rustiger op de achtergrond
if ((navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)) document.documentElement.dataset.lite = 'true';

applySettings();
new ResizeObserver(() => { if (!navEl.hidden) document.documentElement.style.setProperty('--nav-h', `${navEl.offsetHeight}px`); }).observe(navEl);
initAmbient();
initRipple();
window.addEventListener('hashchange', () => render(true));
buildNav();
render(true);

// Accounts en vrienden: alleen als er een server is. Geen server? Dan merkt niemand er iets van.
(async () => {
  if (!(await detect())) { if (/^\/(vrienden|partij|account)(\/|$)/.test(location.hash.replace(/^#/, ''))) render(false); return; }
  buildNav();
  let lastUser = null, ready = false;
  auth.subscribe(({ user }) => {
    updateBadge();
    const onHome = (location.hash.replace(/^#/, '') || '/') === '/';
    if (ready && onHome && user?.id !== lastUser) render(false);         // in- of uitgelogd: Start opnieuw tekenen (de rest ververst Start zelf)
    lastUser = user?.id;
  });
  await auth.restore();
  ready = true;
  updateBadge();
  social.startPolling();
  matches.init();
  sync.init();
  // Schermen die pas met de server compleet zijn (Start met vrienden, account, partijen), nu opnieuw tekenen
  const route = location.hash.replace(/^#/, '') || '/';
  if (route === '/' || /^\/(account|vrienden|partij|instellingen|hulp)(\/|$)/.test(route)) render(false);
})();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline-modus is een extraatje */ });
}
