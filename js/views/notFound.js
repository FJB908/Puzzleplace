import { h } from '../ui.js';
import { t } from '../i18n/index.js';

export function notFoundView() {
  return {
    title: t('notFound.title'), nav: 'home', decor: 'spray',
    node: h('div', { class: 'view' },
      h('header', { class: 'page-header' },
        h('h1', { tabindex: '-1' }, t('notFound.heading')),
        h('p', {}, t('notFound.text'))),
      h('a', { class: 'btn btn-primary btn-block', href: '#/' }, t('notFound.toHome'))),
  };
}

// Even wachten tot de app weet of er een server is (alleen als je rechtstreeks op zo'n scherm binnenkomt)
export function loadingView() {
  return { title: t('loading.title'), nav: 'friends', node: h('div', { class: 'view' }, h('p', { class: 'muted', role: 'status' }, t('common.loading'))) };
}
