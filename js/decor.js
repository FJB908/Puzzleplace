// Versiering: kersenbloesemtakken. De tekeningen zijn SVG-tekst (gemaakt door
// tools/make-blossoms.mjs) en worden inline in de pagina gezet. Daardoor kan elke bloem
// apart opengaan en kan de hele tak zachtjes wiegen.
//
// Ze worden pas geladen als ze nodig zijn (dynamic import), zodat de start snel blijft.

const LOADERS = {
  'hang-rechts': () => import('./decor/hang-rechts.js'),
  'hang-links': () => import('./decor/hang-links.js'),
  'boog': () => import('./decor/boog.js'),
  'spray': () => import('./decor/spray.js'),
  'takje-a': () => import('./decor/takje-a.js'),
  'takje-b': () => import('./decor/takje-b.js'),
  'takje-c': () => import('./decor/takje-c.js'),
};

// Zet een tekening in `el`. `bloom` laat de bloemen één voor één opengaan.
export async function mountArt(el, name, { bloom = true } = {}) {
  const load = LOADERS[name];
  if (!load) return null;
  const mod = await load();
  el.innerHTML = mod.default;                   // vertrouwde, zelf gegenereerde SVG
  el.style.setProperty('--ratio', String(mod.ratio));
  el.dataset.art = name;
  el.classList.remove('art--bloom');
  if (bloom) { void el.offsetWidth; el.classList.add('art--bloom'); }
  return mod;
}

// De grote tak bovenaan de pagina. Wisselt netjes van tekening als de pagina wisselt.
const decorEl = () => document.querySelector('.decor');
let wanted = null;

export async function setDecor(name) {
  const el = decorEl();
  if (!el) return;
  wanted = name;
  if (!name) { el.hidden = true; return; }
  el.hidden = false;
  if (el.dataset.art === name) return;
  const first = !el.dataset.art;
  if (!first) { el.classList.add('is-leaving'); await new Promise((r) => setTimeout(r, 180)); }
  if (wanted !== name) return;                  // ondertussen alweer een andere pagina
  el.dataset.side = name === 'hang-links' ? 'left' : 'right';
  await mountArt(el, name);
  el.classList.remove('is-leaving');
}
