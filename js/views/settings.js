// Instellingen: weinig keuzes, elk met een korte uitleg. Wijzigingen werken
// direct door (zie het voorbeeld), er is geen "opslaan" knop nodig.

import { h, icon, confirmDialog, announce } from '../ui.js';
import * as store from '../store.js';
import { FEATURES } from '../config.js';
import * as auth from '../services/auth.js';
import * as emails from '../services/emails.js';
import { t, getTaal } from '../i18n/index.js';
import { TALEN } from '../shared/talen.js';

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
  const set = (key) => (value) => { store.setSetting(key, value); app.applySettings(); announce(t('settings.saved')); };

  const nameInput = h('input', {
    class: 'text-input', id: 'name', type: 'text', value: store.getName(), maxlength: '30',
    autocomplete: 'given-name', enterkeyhint: 'done',
    onchange: (e) => { store.setName(e.target.value); announce(t('settings.nameSaved')); },
  });

  const node = h('div', { class: 'view' },
    h('header', { class: 'page-header' },
      h('h1', { tabindex: '-1' }, t('settings.title')),
      h('p', {}, t('settings.subtitle')),
    ),

    h('section', { class: 'card stack', 'aria-label': t('settings.sectionReading') },
      radioGroup({
        legend: t('settings.textSize'), name: 'textSize', value: s.textSize, onChange: set('textSize'),
        options: ['normal', 'large', 'xlarge'].map((id) => ({ id, label: t(`size.${id}`) })),
      }),
      h('p', { class: 'preview' }, t('settings.preview')),
    ),

    h('section', { class: 'card stack', 'aria-label': t('settings.sectionLook') },
      radioGroup({
        legend: t('settings.colours'), hint: t('settings.coloursHint'),
        name: 'theme', value: s.theme, onChange: set('theme'),
        options: ['auto', 'light', 'dark'].map((id) => ({ id, label: t(`settings.theme.${id}`) })),
      }),
      h('div', { class: 'options options--stack' },
        h('label', { class: 'option toggle' },
          h('input', { type: 'checkbox', checked: s.contrast === 'high', onchange: (e) => set('contrast')(e.target.checked ? 'high' : 'normal') }),
          h('span', { class: 'option-body' },
            h('span', { class: 'toggle-text' }, h('strong', {}, t('settings.contrast')), h('small', {}, t('settings.contrastHint'))),
            h('span', { class: 'toggle-state' }))),
        h('label', { class: 'option toggle' },
          h('input', { type: 'checkbox', checked: s.decor !== false, onchange: (e) => set('decor')(e.target.checked) }),
          h('span', { class: 'option-body' },
            h('span', { class: 'toggle-text' }, h('strong', {}, t('settings.decor')), h('small', {}, t('settings.decorHint'))),
            h('span', { class: 'toggle-state' }))),
        h('label', { class: 'option toggle' },
          h('input', { type: 'checkbox', checked: !!s.calm, onchange: (e) => set('calm')(e.target.checked) }),
          h('span', { class: 'option-body' },
            h('span', { class: 'toggle-text' }, h('strong', {}, t('settings.calm')), h('small', {}, t('settings.calmHint'))),
            h('span', { class: 'toggle-state' }))),
      ),
    ),

    h('section', { class: 'card stack', 'aria-label': t('settings.sectionAbout') },
      h('div', {},
        h('label', { class: 'label', for: 'name' }, t('settings.firstName')),
        h('p', { class: 'field-hint' }, t('settings.firstNameHint')),
        nameInput),
    ),

    FEATURES.accounts
      ? h('a', { class: 'card card-link', href: '#/account' },
          h('span', { class: 'tile' }, icon('user')),
          h('span', {}, h('span', { class: 'title' }, t('settings.account')), h('br'), h('span', { class: 'desc' }, auth.getUser() ? t('settings.accountLoggedIn', { name: auth.getUser().name }) : t('settings.accountLogIn'))),
          icon('chevron'))
      : null,

    h('a', { class: 'card card-link', href: '#/taal' },
      h('span', { class: 'tile' }, icon('globe')),
      h('span', {}, h('span', { class: 'title' }, t('language.title')), h('br'), h('span', { class: 'desc', lang: TALEN[getTaal()].locale }, TALEN[getTaal()].native)),
      icon('chevron')),

    h('a', { class: 'card card-link', href: '#/hulp' },
      h('span', { class: 'tile' }, icon('help')),
      h('span', {}, h('span', { class: 'title' }, t('settings.helpTitle')), h('br'), h('span', { class: 'desc' }, t('settings.helpHint'))),
      icon('chevron')),

    h('section', { class: 'card stack', 'aria-label': t('settings.sectionReset') },
      h('h2', {}, t('settings.reset')),
      h('p', { class: 'muted' }, t('settings.resetHint')),
      h('button', {
        type: 'button', class: 'btn btn-danger btn-block',
        onclick: async () => {
          const ok = await confirmDialog({
            title: t('settings.resetConfirmTitle'),
            text: t('settings.resetConfirmText'),
            confirmLabel: t('settings.resetConfirmYes'),
          });
          if (!ok) return;
          store.resetAll();
          emails.forgetAll();
          app.applySettings();
          location.hash = '#/';
          app.refresh();
        },
      }, t('settings.reset')),
    ),
  );
  return { title: t('settings.title'), nav: 'settings', decor: 'hang-links', node };
}
