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
  // spelpictogrammen
  sudoku: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  woordzoeker: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M16 16l5 5"/>',
  kruiswoord: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h8M13 15h8M9 3v6M13 9v12M9 15v6"/>',
  puzzle: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
};

export function icon(name) {
  const span = document.createElement('span');
  span.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.puzzle}</svg>`;
  return span.firstChild;
}

// ----- Dialogen (met <dialog>: toetsenbord, focus en Escape werken vanzelf) -----
// actions: [{ label, value, primary?, autofocus? }]. Geeft de gekozen value terug.
export function choiceDialog({ title, text, body, actions, dismissValue = null }) {
  return new Promise((resolve) => {
    const titleId = `dlg-${Math.random().toString(36).slice(2)}`;
    const dlg = h('dialog', { class: 'dialog', 'aria-labelledby': titleId },
      h('h2', { id: titleId }, title),
      text && h('p', {}, text),
      body && h('div', { class: 'dialog-body' }, body),
      h('div', { class: 'dialog-actions' },
        actions.map((a, i) => h('button', {
          type: 'button', class: `btn ${a.primary ? 'btn-primary' : ''}`, autofocus: a.autofocus,
          onclick: () => dlg.close(String(i)),
        }, a.label))),
    );
    dlg.addEventListener('close', () => {
      const i = dlg.returnValue === '' ? -1 : Number(dlg.returnValue);
      dlg.remove();
      resolve(i >= 0 ? actions[i].value : dismissValue);
    });
    document.body.append(dlg);
    dlg.showModal();
  });
}

// Veilige bevestiging: de veilige keuze staat bovenaan en heeft de focus.
export async function confirmDialog({ title, text, confirmLabel, cancelLabel = 'Nee, terug' }) {
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
  if (diff <= 0) return 'vandaag';
  if (diff === 1) return 'gisteren';
  return `${diff} dagen geleden`;
}
