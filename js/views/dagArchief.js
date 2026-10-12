// Het archief van de puzzel van de dag (altijd Sudoku): een kalender per maand. Opgeloste dagen hebben een bloesem, vandaag een ring,
// een dag die je bent begonnen een stipje. Tik op een dag om die puzzel te spelen; maanden terug kan tot het begin van het archief.

import { h, icon } from '../ui.js';
import { t, datumTekst } from '../i18n/index.js';
import * as store from '../store.js';
import { gameArt } from '../games/art.js';
import { BEGIN, dagMoeilijkheid, maandRooster, reeks, langsteReeks, speelbaar, tijdTekst } from '../shared/dagelijks.js';

const ID = 'sudoku';
const naarDatum = (dag) => { const [j, m, d] = dag.split('-').map(Number); return new Date(j, m - 1, d, 12); };

export function dagArchiefView() {
  const today = store.todayKey();
  const nu = naarDatum(today);
  const eerste = naarDatum(BEGIN);
  let jaar = nu.getFullYear(), maand = nu.getMonth();

  const gedaan = () => store.getDaily(ID);
  const bezig = (dag) => store.getSlot(ID, store.dailySlot(dag))?.state != null;

  // ----- Kop met cijfers -----
  const art = h('div', { class: 'art-box', 'aria-hidden': 'true' }); art.innerHTML = gameArt(ID);
  const cijfers = h('div', { class: 'dag-cijfers' });
  const kop = h('header', { class: `detail-hero game--${ID}` },
    h('a', { class: 'btn btn-quiet back', href: '#/' }, icon('back'), t('common.back')),
    h('div', { class: 'dh-panel' }, art),
    h('div', { class: 'dh-text' }, h('h1', { tabindex: '-1' }, t('daily.archiveTitle')), h('p', {}, t('daily.archiveText'))));

  const knopVandaag = h('a', { class: 'btn btn-primary btn-block', href: `#/spel/${ID}/speel/dagelijks` });

  // ----- Kalender -----
  const maandTitel = h('h2', { class: 'dag-maand', 'aria-live': 'polite' });
  const voortgang = h('p', { class: 'muted dag-voortgang' });
  const vorige = h('button', { type: 'button', class: 'btn btn-quiet dag-nav', 'aria-label': t('daily.prevMonth'), onclick: () => ga(-1) }, icon('back'));
  const volgende = h('button', { type: 'button', class: 'btn btn-quiet dag-nav', 'aria-label': t('daily.nextMonth'), onclick: () => ga(1) }, icon('chevron'));
  const raster = h('div', { class: 'dag-raster', role: 'grid' });
  const weekdagen = h('div', { class: 'dag-week', 'aria-hidden': 'true' },
    Array.from({ length: 7 }, (_, k) => h('span', {}, datumTekst(new Date(2024, 0, 1 + k, 12), { weekday: 'short' }).replace('.', ''))));

  function ga(n) {
    const d = new Date(jaar, maand + n, 1, 12);
    if (d < new Date(eerste.getFullYear(), eerste.getMonth(), 1, 12) || d > new Date(nu.getFullYear(), nu.getMonth(), 1, 12)) return;
    jaar = d.getFullYear(); maand = d.getMonth(); teken();
  }

  function dagKnop(dag) {
    const datum = naarDatum(dag), nummer = datum.getDate();
    const lang = datumTekst(datum, { day: 'numeric', month: 'long' });
    const rec = gedaan()[dag];
    const kan = speelbaar(dag, today), isVandaag = dag === today, isBezig = !rec && kan && bezig(dag);
    const staat = rec ? 'done' : isBezig ? 'busy' : kan ? 'open' : 'closed';
    const label = rec ? t('daily.day.done', { date: lang, time: rec.time != null ? tijdTekst(rec.time) : '–' })
      : isBezig ? t('daily.day.busy', { date: lang }) : kan ? t(isVandaag ? 'daily.day.today' : 'daily.day.open', { date: lang }) : t('daily.day.closed', { date: lang });
    const kleur = dagMoeilijkheid(dag);
    const inhoud = [h('span', { class: 'dag-nr' }, String(nummer)), rec ? h('span', { class: 'dag-bloem', 'aria-hidden': 'true' }) : null, isBezig ? h('span', { class: 'dag-stip', 'aria-hidden': 'true' }) : null];
    const attrs = { class: `dag dag--${staat}${isVandaag ? ' is-today' : ''}`, 'data-niveau': kleur, role: 'gridcell', 'aria-label': label };
    if (!kan) return h('span', { ...attrs, 'aria-disabled': 'true' }, inhoud);
    return h('a', { ...attrs, href: `#/spel/${ID}/speel/dagelijks${isVandaag ? '' : `/${dag}`}` }, inhoud);
  }

  function teken() {
    const rec = gedaan();
    const keys = Object.keys(rec);
    const n = reeks(rec, today), langste = langsteReeks(rec);
    cijfers.replaceChildren(
      cijfer('flame', String(n), t('daily.stat.streak')),
      cijfer('trophy', String(langste), t('daily.stat.longest')),
      cijfer('check', String(keys.length), t('daily.stat.solved')));

    const slot = store.getSlot(ID, store.dailySlot(today));
    const klaar = !!rec[today];
    knopVandaag.replaceChildren(icon('play'), t(klaar ? 'daily.playAgain' : slot?.state != null ? 'daily.continue' : 'daily.play'));
    knopVandaag.classList.toggle('btn-primary', !klaar);

    maandTitel.textContent = datumTekst(new Date(jaar, maand, 1, 12), { month: 'long', year: 'numeric' });
    const weken = maandRooster(jaar, maand);
    const dagen = weken.flat().filter(Boolean);
    const speelbareDagen = dagen.filter((d) => speelbaar(d, today));
    const opgelost = dagen.filter((d) => rec[d]).length;
    voortgang.textContent = t('daily.monthProgress', { done: opgelost, total: speelbareDagen.length });
    raster.replaceChildren(...weken.map((week) => h('div', { class: 'dag-rij', role: 'row' }, week.map((d) => (d ? dagKnop(d) : h('span', { class: 'dag dag--leeg', 'aria-hidden': 'true' }))))));
    const eerstMaand = jaar === eerste.getFullYear() && maand === eerste.getMonth(), laatstMaand = jaar === nu.getFullYear() && maand === nu.getMonth();
    vorige.disabled = eerstMaand; volgende.disabled = laatstMaand;
  }
  const cijfer = (naam, waarde, label) => h('div', { class: 'dag-cijfer' }, icon(naam), h('strong', {}, waarde), h('small', {}, label));

  const legenda = h('ul', { class: 'dag-legenda', 'aria-hidden': 'true' },
    h('li', {}, h('i', { class: 'lg lg-done' }), t('daily.legend.done')),
    h('li', {}, h('i', { class: 'lg lg-today' }), t('daily.legend.today')),
    h('li', {}, h('i', { class: 'lg lg-busy' }), t('daily.legend.busy')));

  teken();
  const node = h('div', { class: 'view' }, kop, cijfers, knopVandaag,
    h('section', { class: 'card dag-kalender', 'aria-labelledby': 'dag-maand-titel' },
      h('div', { class: 'dag-kop' }, vorige, (maandTitel.id = 'dag-maand-titel', maandTitel), volgende),
      voortgang, weekdagen, raster, legenda,
      h('p', { class: 'muted dag-uitleg' }, t('daily.levelNote'))));
  return { title: t('daily.archiveTitle'), nav: 'games', decor: 'hang-rechts', node };
}
