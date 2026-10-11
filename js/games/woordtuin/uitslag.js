// Het uitslagscherm van Woordtuin: wie won, hoeveel bloemen ieder heeft, het tuintje aan het eind en alle woorden.
// Wordt gebruikt tegen de computer (woordtuin.js) en tegen een vriend (views/partij.js); alleen de spelers verschillen.

import { h, avatar } from '../../ui.js';
import { t } from '../../i18n/index.js';
import { counts, result } from './engine.js';

// spelers: { 1: { naam, id }, 2: { naam, id } }; ik: welke speler jij bent (1 of 2)
export function uitslagKaart(state, spelers, ik) {
  const c = counts(state), r = result(state);
  const woorden = { 1: [], 2: [] };
  (state.played || []).forEach((w, i) => { const wie = state.by?.[i]; if (wie === 1 || wie === 2) woorden[wie].push(w); });
  const langste = (p) => woorden[p].reduce((a, w) => (w.length > a.length ? w : a), '');
  const totaal = state.owner.length;
  const kant = (p) => {
    const wint = r.winner === p, l = langste(p);
    return h('div', { class: `ut-kant ${p === ik ? 'mijn' : 'hun'}${wint ? ' wint' : ''}` },
      wint && h('span', { class: 'ut-kroon' }, t('uitslag.winner')),
      avatar(spelers[p].naam, spelers[p].id),
      h('span', { class: 'ut-naam' }, spelers[p].naam),
      h('b', { class: 'ut-tal', 'aria-label': `${t('uitslag.flowers')}: ${c[p]}` }, h('span', { 'aria-hidden': 'true' }, p === ik ? '✿ ' : '❧ '), String(c[p])),
      h('small', {}, t('uitslag.flowers')),
      state.by?.length ? h('small', { class: 'ut-meer' }, t('uitslag.words', { n: woorden[p].length })) : null,
      l ? h('small', { class: 'ut-meer' }, t('uitslag.longest', { word: l.toUpperCase() })) : null);
  };
  const deel = (p) => c[p] / totaal * 100;
  const tuin = h('div', { class: 'ut-tuin', role: 'img', 'aria-label': t('woordtuin.standAria', { me: spelers[ik].naam, mine: c[ik], them: spelers[3 - ik].naam, theirs: c[3 - ik], open: c[0] }) },
    state.owner.map((o, i) => h('span', { class: `ut-vak${o ? (o === ik ? ' mijn' : ' hun') : ''}` }, h('span', {}, state.letters[i]))));
  return h('div', { class: 'uitslag' },
    h('div', { class: 'ut-spelers' }, kant(ik), kant(3 - ik)),
    h('div', { class: 'ut-balk', 'aria-hidden': 'true' },
      h('span', { class: 'mijn', style: `width:${deel(ik)}%` }), h('span', { class: 'hun', style: `width:${deel(3 - ik)}%` })),
    h('h3', { class: 'ut-kop' }, t('uitslag.garden')),
    tuin,
    state.played?.length ? h('h3', { class: 'ut-kop' }, t('uitslag.allWords')) : null,
    state.played?.length ? h('ul', { class: 'ut-woorden' }, state.played.map((w, i) => h('li', { class: state.by?.[i] === ik ? 'mijn' : state.by?.[i] ? 'hun' : '' }, w))) : null);
}
