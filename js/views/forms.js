// Formulieren: grote velden met een label erboven, een uitleg eronder en vriendelijke foutmeldingen.
// Elke knop laat zien dat hij bezig is, zodat niemand twee keer tikt.

import { h, icon } from '../ui.js';

const WORDS = ['rozen', 'molen', 'zomer', 'tulpen', 'fiets', 'regen', 'maan', 'sterren', 'koffie', 'taart', 'bloesem', 'tuin', 'vlinder', 'appel', 'boot', 'strand', 'brood', 'kaars', 'lente', 'zonnig', 'klaver', 'brug', 'wolken', 'honing'];
export function suggestPassword() {
  const pick = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return WORDS[a[0] % WORDS.length]; };
  return `${pick()}-${pick()}-${pick()}`;
}

// suggestions: een lijstje waaruit het veld kan voorstellen (bijv. je eerder gebruikte e-mailadres)
export function field({ label, name, type = 'text', autocomplete, hint, value = '', inputmode, maxlength, required = true, enterkeyhint, autofocus = false, suggestions = [] }) {
  const id = `f-${name}`;
  const err = h('p', { class: 'field-error', id: `${id}-err`, role: 'alert', hidden: true });
  const input = h('input', {
    class: 'text-input', id, name, type, value, autocomplete, list: suggestions.length ? `${id}-opties` : null, inputmode, maxlength, required, enterkeyhint, autofocus,
    autocapitalize: type === 'text' && name === 'naam' ? 'words' : 'off', spellcheck: 'false',
    'aria-describedby': [hint ? `${id}-hint` : '', `${id}-err`].filter(Boolean).join(' '),
  });
  const el = h('div', { class: 'field' }, h('label', { class: 'label', for: id }, label), hint ? h('p', { class: 'field-hint', id: `${id}-hint` }, hint) : null, input,
    suggestions.length ? h('datalist', { id: `${id}-opties` }, suggestions.map((s) => h('option', { value: s }))) : null, err);
  return {
    name, el, input,
    error(msg) { err.textContent = msg; err.hidden = !msg; input.setAttribute('aria-invalid', String(!!msg)); },
  };
}

// Wachtwoordveld: met "Toon" (zodat je kunt controleren wat je typt) en optioneel "Bedenk een wachtwoord"
export function passwordField({ label = 'Wachtwoord', name = 'wachtwoord', autocomplete = 'current-password', hint, suggest = false }) {
  const f = field({ label, name, type: 'password', autocomplete, hint });
  const toggle = h('button', { type: 'button', class: 'btn pw-toggle', 'aria-pressed': 'false', onclick: () => {
    const show = f.input.type === 'password';
    f.input.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.lastChild.textContent = show ? 'Verberg' : 'Toon';
  } }, icon('eye'), h('span', {}, 'Toon'));
  const wrap = h('div', { class: 'pw-wrap' }, f.input, toggle);
  f.el.insertBefore(wrap, f.el.querySelector('.field-error'));
  if (suggest) {
    f.el.insertBefore(h('button', { type: 'button', class: 'btn btn-quiet pw-suggest', onclick: () => {
      f.input.value = suggestPassword(); f.input.type = 'text'; toggle.setAttribute('aria-pressed', 'true'); toggle.lastChild.textContent = 'Verberg';
      f.error(''); f.input.focus();
    } }, icon('bulb'), 'Bedenk een wachtwoord voor mij'), f.el.querySelector('.field-error'));
  }
  return f;
}

// Een formulier met een knop. onSubmit(waarden) mag een ApiFail gooien: de melding komt bij het juiste veld te staan.
export function form({ fields, submitLabel, busyLabel = 'Even wachten…', onSubmit, extra = null }) {
  const message = h('p', { class: 'form-error', role: 'alert', hidden: true });
  const button = h('button', { type: 'submit', class: 'btn btn-primary btn-block' }, submitLabel);
  const el = h('form', { class: 'form stack', novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      fields.forEach((f) => f.error(''));
      message.hidden = true;
      const values = Object.fromEntries(fields.map((f) => [f.name, f.input.value]));
      const empty = fields.find((f) => !f.input.value.trim());
      if (empty) { empty.error('Dit veld is nog leeg.'); empty.input.focus(); return; }
      button.disabled = true; button.textContent = busyLabel;
      try { await onSubmit(values); }
      catch (err) {
        const target = fields.find((f) => f.name === err.code);
        if (target) { target.error(err.message); target.input.focus(); }
        else { message.textContent = err.message || 'Er ging iets mis. Probeer het nog eens.'; message.hidden = false; }
      } finally { button.disabled = false; button.textContent = submitLabel; }
    } },
  fields.map((f) => f.el), message, button, extra);
  return el;
}
