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
import * as store from './store.js';
import { homeView } from './views/home.js';
import { gamesView } from './views/games.js';
import { gameDetailView } from './views/gameDetail.js';
import { playView } from './views/play.js';
import { settingsView } from './views/settings.js';
import { helpView } from './views/help.js';
import { accountView, friendsView } from './views/future.js';
import { notFoundView } from './views/notFound.js';

// ----- Menu: één lijst; nieuwe onderdelen komen hier bij -----
const NAV = [
  { id: 'home', label: 'Start', href: '#/', icon: 'home' },
  { id: 'games', label: 'Spellen', href: '#/spellen', icon: 'games' },
  { id: 'friends', label: 'Vrienden', href: '#/vrienden', icon: 'friends', feature: 'friends' },
  { id: 'settings', label: 'Instellingen', href: '#/instellingen', icon: 'settings' },
].filter((item) => !item.feature || FEATURES[item.feature]);

// [patroon, view, parameters uit het patroon]
const ROUTES = [
  [/^\/?$/, homeView, () => ({})],
  [/^\/spellen$/, gamesView, () => ({})],
  [/^\/spel\/([\w-]+)$/, gameDetailView, (m) => ({ id: m[1] })],
  [/^\/spel\/([\w-]+)\/speel(?:\/(dagelijks))?$/, playView, (m) => ({ id: m[1], mode: m[2] })],
  [/^\/instellingen$/, settingsView, () => ({})],
  [/^\/hulp$/, helpView, () => ({})],
  [/^\/account$/, accountView, () => ({})],
  [/^\/vrienden$/, friendsView, () => ({})],
];

// ----- Instellingen op de pagina toepassen -----
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applySettings() {
  const s = store.getSettings();
  const root = document.documentElement;
  root.dataset.textsize = s.textSize;
  root.dataset.contrast = s.contrast;
  root.dataset.calm = String(!!s.calm);
  root.dataset.theme = s.theme === 'auto' ? (darkQuery.matches ? 'dark' : 'light') : s.theme;
}
darkQuery.addEventListener?.('change', applySettings);

// ----- Menu tekenen -----
const navEl = document.getElementById('nav');
navEl.style.setProperty('--nav-count', NAV.length);
navEl.append(...NAV.map((item) => h('a', { href: item.href, 'data-nav': item.id }, icon(item.icon), item.label)));

function updateNav(active) {
  navEl.hidden = active == null; // tijdens het spelen geen menu
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

  current?.cleanup?.();
  current = result;

  document.title = `${result.title} · ${APP.name}`;
  main.replaceChildren(result.node);
  updateNav(result.nav);

  result.onShow?.();

  if (moveFocus) {
    window.scrollTo(0, 0);
    const heading = main.querySelector('h1');
    (heading || main).focus({ preventScroll: true });
    announce(result.title);
  }
}

applySettings();
window.addEventListener('hashchange', () => render(true));
render(true);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline-modus is een extraatje */ });
}
