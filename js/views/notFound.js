import { h } from '../ui.js';

export function notFoundView() {
  return {
    title: 'Niet gevonden', nav: 'home', decor: 'spray',
    node: h('div', { class: 'view' },
      h('header', { class: 'page-header' },
        h('h1', { tabindex: '-1' }, 'Deze pagina bestaat niet'),
        h('p', {}, 'Misschien is de link verouderd. Geen zorgen, je voortgang is veilig.')),
      h('a', { class: 'btn btn-primary btn-block', href: '#/' }, 'Naar Start')),
  };
}
