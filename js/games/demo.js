// Voorbeeldspel: laat zien hoe een spel met het platform praat.
// Kopieer dit bestand als startpunt voor een echt spel (docs/SPEL-TOEVOEGEN.md).
//
// Elk spelbestand exporteert `mount(container, ctx)`.
//   container  leeg element waar het spel in tekent
//   ctx.difficulty  gekozen niveau ('makkelijk' | 'gemiddeld' | 'moeilijk')
//   ctx.seed        tekst om het spel mee te genereren (zelfde seed = zelfde puzzel)
//   ctx.saved       eerder bewaarde staat, of null bij een nieuw spel
//   ctx.save(state) bewaar de staat (JSON-vriendelijk); roep dit na elke zet aan
//   ctx.complete(r) het spel is uitgespeeld; het platform toont de felicitatie
//   ctx.announce(t) meld iets aan schermlezers
// `mount` mag een functie teruggeven die opruimt wanneer het spel sluit.

import { h } from '../ui.js';

const TARGET = 5;

export function mount(container, ctx) {
  const state = ctx.saved || { count: 0 };

  const status = h('p', { class: 'muted', 'aria-live': 'polite' });
  const button = h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: tap }, 'Tik hier');

  function render() {
    status.textContent = `Je hebt ${state.count} van de ${TARGET} keer getikt.`;
  }

  function tap() {
    state.count += 1;
    ctx.save(state);
    render();
    if (state.count >= TARGET) ctx.complete({ taps: state.count });
  }

  render();
  container.append(h('div', { class: 'stack' }, status, button));
}
