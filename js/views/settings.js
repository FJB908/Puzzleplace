// Instellingen: weinig keuzes, elk met een korte uitleg. Wijzigingen werken
// direct door (zie het voorbeeld), er is geen "opslaan" knop nodig.

import { h, icon, confirmDialog, announce } from '../ui.js';
import * as store from '../store.js';
import { FEATURES } from '../config.js';

function radioGroup({ legend, hint, name, options, value, onChange }) {
  return h('fieldset', {},
    h('legend', {}, legend),
    hint ? h('p', { class: 'field-hint' }, hint) : null,
    h('div', { class: 'options' },
      options.map((o) => h('label', { class: 'option' },
        h('input', { type: 'radio', name, value: o.id, checked: o.id === value, onchange: () => onChange(o.id) }),
        h('span', { class: 'option-body' }, h('strong', {}, o.label), o.hint ? h('small', {}, o.hint) : null),
      ))),
  );
}

export function settingsView(_params, app) {
  const s = store.getSettings();
  const set = (key) => (value) => { store.setSetting(key, value); app.applySettings(); announce('Instelling bewaard'); };

  const nameInput = h('input', {
    class: 'text-input', id: 'name', type: 'text', value: store.getName(), maxlength: '30',
    autocomplete: 'given-name', enterkeyhint: 'done',
    onchange: (e) => { store.setName(e.target.value); announce('Naam bewaard'); },
  });

  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('h1', { tabindex: '-1' }, 'Instellingen'),
      h('p', {}, 'Maak Puzzelplaats prettig voor jouw ogen.'),
    ),

    h('section', { class: 'card stack', 'aria-label': 'Lezen' },
      radioGroup({
        legend: 'Tekstgrootte', name: 'textSize', value: s.textSize, onChange: set('textSize'),
        options: [
          { id: 'normal', label: 'Normaal' },
          { id: 'large', label: 'Groot' },
          { id: 'xlarge', label: 'Extra groot' },
        ],
      }),
      h('p', { class: 'preview' }, 'Zo ziet de tekst eruit. Past dit bij je?'),
    ),

    h('section', { class: 'card stack', 'aria-label': 'Uiterlijk' },
      radioGroup({
        legend: 'Kleuren', hint: 'Automatisch volgt de instelling van je telefoon of computer.',
        name: 'theme', value: s.theme, onChange: set('theme'),
        options: [
          { id: 'auto', label: 'Automatisch' },
          { id: 'light', label: 'Licht' },
          { id: 'dark', label: 'Donker' },
        ],
      }),
      h('div', { class: 'options options--stack' },
        h('label', { class: 'option toggle' },
          h('input', { type: 'checkbox', checked: s.contrast === 'high', onchange: (e) => set('contrast')(e.target.checked ? 'high' : 'normal') }),
          h('span', { class: 'option-body' },
            h('span', { class: 'toggle-text' }, h('strong', {}, 'Extra duidelijk'), h('small', {}, 'Sterker contrast en dikkere randen')),
            h('span', { class: 'toggle-state' }))),
        h('label', { class: 'option toggle' },
          h('input', { type: 'checkbox', checked: !!s.calm, onchange: (e) => set('calm')(e.target.checked) }),
          h('span', { class: 'option-body' },
            h('span', { class: 'toggle-text' }, h('strong', {}, 'Rustige weergave'), h('small', {}, 'Geen bewegende onderdelen')),
            h('span', { class: 'toggle-state' }))),
      ),
    ),

    h('section', { class: 'card stack', 'aria-label': 'Over jou' },
      h('div', {},
        h('label', { class: 'label', for: 'name' }, 'Je voornaam'),
        h('p', { class: 'field-hint' }, 'Vrijblijvend. We gebruiken die alleen om je te begroeten.'),
        nameInput),
    ),

    FEATURES.accounts
      ? h('a', { class: 'card card-link', href: '#/account' },
          h('span', { class: 'tile' }, icon('user')),
          h('span', {}, h('span', { class: 'title' }, 'Account'), h('br'), h('span', { class: 'desc' }, 'Inloggen en je spellen op meer apparaten')),
          icon('chevron'))
      : null,

    h('a', { class: 'card card-link', href: '#/hulp' },
      h('span', { class: 'tile' }, icon('help')),
      h('span', {}, h('span', { class: 'title' }, 'Hulp'), h('br'), h('span', { class: 'desc' }, 'Vragen en antwoorden')),
      icon('chevron')),

    h('section', { class: 'card stack', 'aria-label': 'Opnieuw beginnen' },
      h('h2', {}, 'Alles wissen'),
      h('p', { class: 'muted' }, 'Wist je voortgang en instellingen op dit apparaat.'),
      h('button', {
        type: 'button', class: 'btn btn-danger btn-block',
        onclick: async () => {
          const ok = await confirmDialog({
            title: 'Alles wissen?',
            text: 'Je bewaarde spellen en instellingen worden gewist. Dit kan niet ongedaan worden gemaakt.',
            confirmLabel: 'Ja, alles wissen',
          });
          if (!ok) return;
          store.resetAll();
          app.applySettings();
          location.hash = '#/';
          app.refresh();
        },
      }, 'Alles wissen'),
    ),
  );
  return { title: 'Instellingen', nav: 'settings', node };
}
