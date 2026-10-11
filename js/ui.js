import { mountArt } from './decor.js';
import { motionOK } from './effects.js';
import { t, datumTekst } from './i18n/index.js';

// Kleine bouwstenen voor de schermen: elementen maken, iconen, dialogen.
// Tekst gaat altijd via textContent (nooit innerHTML), dus veilig voor namen.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

// Tekst met [links](#/pad): de tekst tussen [ ] wordt een link. Handig voor vertaalde teksten, waar de volgorde per taal anders is.
export function richText(tekst) {
  const uit = [];
  let laatste = 0;
  for (const m of tekst.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    if (m.index > laatste) uit.push(tekst.slice(laatste, m.index));
    const extern = /^https?:/.test(m[2]);
    uit.push(h('a', { href: m[2], ...(extern ? { target: '_blank', rel: 'noopener' } : {}) }, m[1]));
    laatste = m.index + m[0].length;
  }
  if (laatste < tekst.length) uit.push(tekst.slice(laatste));
  return uit;
}

// ----- Iconen (vaste, eigen SVG-paden) -----
const ICONS = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
  games: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
  daily: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  friends: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.2-5 6.5-5s5.700 1.500 6.500 5M16 5a3.500 3.500 0 0 1 0 7M18 15c2 .6 3 2.200 3.500 5"/>',
  undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>',
  pencil: '<path d="M4 20l1-5L16 4l4 4L9 19zM14 6l4 4"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.500c.7.7 1 1.500 1 2.500h6c0-1 .3-1.800 1-2.500A6 6 0 0 0 12 3z"/>',
  verify: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  backspace: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  eraser: '<path d="M4 16l9-9a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3l-6 6H8zM9 11l5 5M12 20h8"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  eye: '<path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  // spelpictogrammen
  sudoku: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  woordzoeker: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M16 16l5 5"/>',
  kruiswoord: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h8M13 15h8M9 3v6M13 9v12M9 15v6"/>',
  woordtuin: '<path d="M12 21v-8M12 13c-3 0-5-2-5-5 3 0 5 2 5 5zM12 13c3 0 5-2 5-5-3 0-5 2-5 5zM12 9c-2-1-2-4 0-6 2 2 2 5 0 6z"/>',
  puzzle: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
};

export function icon(name) {
  const span = document.createElement('span');
  span.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.puzzle}</svg>`;
  return span.firstChild;
}

// ----- Dialogen (met <dialog>: toetsenbord, focus en Escape werken vanzelf) -----
// actions: [{ label, value, primary?, autofocus? }]. Geeft de gekozen value terug.
export function choiceDialog({ title, text, body, actions, dismissValue = null, joy = false, closable = false }) {
  return new Promise((resolve) => {
    const titleId = `dlg-${Math.random().toString(36).slice(2)}`;
    const art = joy ? h('div', { class: 'dialog-art', 'aria-hidden': 'true' }) : null;
    let done = false;
    // Netjes sluiten met een korte uitgaande beweging
    const finish = (i) => {
      if (done) return;
      done = true;
      const end = () => dlg.close(i >= 0 ? String(i) : '');
      if (motionOK()) { dlg.classList.add('closing'); setTimeout(end, 180); } else end();
    };
    const dlg = h('dialog', { class: `dialog${joy ? ' dialog--joy' : ''}`, 'aria-labelledby': titleId },
      art,
      closable ? h('button', { type: 'button', class: 'dialog-close', 'aria-label': t('common.close'), onclick: () => finish(-1) }, icon('close')) : null,
      h('h2', { id: titleId }, title),
      text && h('p', {}, text),
      body && h('div', { class: 'dialog-body' }, body),
      h('div', { class: 'dialog-actions' },
        actions.map((a, i) => h('button', {
          type: 'button', class: `btn ${a.primary ? 'btn-primary' : ''}${a.danger ? ' btn-danger' : ''}`, autofocus: a.autofocus,
          onclick: () => finish(i),
        }, a.label))),
    );
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(-1); });   // Escape
    dlg.addEventListener('close', () => {
      const i = dlg.returnValue === '' ? -1 : Number(dlg.returnValue);
      dlg.remove();
      resolve(i >= 0 ? actions[i].value : dismissValue);
    });
    document.body.append(dlg);
    dlg.showModal();
    dlg.scrollTop = 0;                                   // een lang venster (bijv. de uitslag) begint bij de titel, niet bij de knoppen
    if (art) mountArt(art, 'takje-b');
  });
}

// Veilige bevestiging: de veilige keuze staat bovenaan en heeft de focus.
export async function confirmDialog({ title, text, confirmLabel, cancelLabel = t('common.noGoBack') }) {
  const answer = await choiceDialog({
    title, text,
    actions: [
      { label: cancelLabel, value: false, primary: true, autofocus: true },
      { label: confirmLabel, value: true },
    ],
    dismissValue: false,
  });
  return answer === true;
}

// ----- Meldingen voor schermlezers -----
export function announce(message) {
  const el = document.getElementById('announcer');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = message; }, 50);
}

// ----- Tekst -----
export function whenText(timestamp) {
  const day = (t) => new Date(t).setHours(0, 0, 0, 0);
  const diff = Math.round((day(Date.now()) - day(timestamp)) / 86400000);
  if (diff <= 0) return t('time.today');
  if (diff === 1) return t('time.yesterday');
  return t('time.daysAgo', { n: diff });
}

// De naam van iemand om te laten zien; een verwijderd account heeft geen naam meer (de server stuurt dan een lege naam)
export const persoonNaam = (p) => (p && p.id && p.name ? p.name : t('friends.deletedAccount'));

// ----- Mensen: een ronde letter in een zachte kleur (geen foto's) -----
export function avatar(name, id = name) {
  let n = 0;
  for (const ch of String(id)) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return h('span', { class: `avatar c${n % 6}`, 'aria-hidden': 'true' }, [...String(name).trim()][0]?.toUpperCase() || '?');
}

// ----- Kopiëren en delen -----
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;opacity:0;left:-9999px' }, text);
    document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { /* niet gelukt */ }
    ta.remove(); return ok;
  }
}

export async function shareText({ title, text, url }) {
  if (navigator.share) { try { await navigator.share({ title, text, url }); return 'gedeeld'; } catch (e) { if (e.name === 'AbortError') return 'gestopt'; } }
  return (await copyText(url ? `${text} ${url}` : text)) ? 'gekopieerd' : 'mislukt';
}

// "vandaag", "gisteren", "3 dagen geleden"
export function dayText(isoDay) {
  if (!isoDay) return '';
  const diff = Math.round((new Date(new Date().toDateString()) - new Date(`${isoDay}T00:00:00`)) / 86400000);
  if (diff <= 0) return t('time.today');
  if (diff === 1) return t('time.yesterday');
  if (diff < 14) return t('time.daysAgo', { n: diff });
  return datumTekst(new Date(`${isoDay}T00:00:00`), { day: 'numeric', month: 'long' });
}
