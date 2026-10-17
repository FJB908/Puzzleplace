// De vensters van de steun: de vraag om een video te kijken en de meldingen als het niet lukt.
// Een melding dat het niet lukt heeft een groot kruis en een kruisje om te sluiten: duidelijk dat er niets is gebeurd.

import { h, icon, choiceDialog } from '../ui.js';
import { t } from '../i18n/index.js';

const kruis = () => h('div', { class: 'steun-fout', role: 'img', 'aria-label': t('steun.errorMark') }, icon('crossCircle'));
const sluitKnop = () => [{ label: t('common.close'), value: true, primary: true, autofocus: true }];

/** Een melding met een groot kruis: er is niets gebeurd (geen internet, geen video, ...). */
export const foutMelding = ({ title, text }) =>
  choiceDialog({ title, text, body: kruis(), closable: true, actions: sluitKnop(), dismissValue: true });

/** @param {'video'|'koop'} wat waar het internet voor nodig was */
export const geenInternet = (wat) => foutMelding({ title: t('steun.offline.title'), text: t(wat === 'koop' ? 'steun.offline.buy' : 'steun.offline.video') });
export const geenVideo = () => foutMelding({ title: t('steun.noVideo.title'), text: t('steun.noVideo.text') });
export const mislukt = (wat) => foutMelding({ title: t('steun.failed.title'), text: t(wat === 'koop' ? 'steun.failed.buy' : 'steun.failed.video') });

/** De video is eerder gestopt dan het eind: geen tip, en dat is niemands schuld. */
export const nietAfgekeken = () =>
  choiceDialog({ title: t('steun.video.stopped.title'), text: t('steun.video.stopped.text'), closable: true, actions: sluitKnop(), dismissValue: true });

/** De vraag vóór de video. Geeft 'ja' (kijken), 'nee' of 'supporter' (naar de uitleg over steunen). */
export function videoVraag({ uitlegLink }) {
  return choiceDialog({
    title: t('steun.video.title'),
    text: t('steun.video.text'),
    closable: true,
    actions: [
      { label: [icon('video'), t('steun.video.watch')], value: 'ja', primary: true, autofocus: true },
      { label: t('steun.video.no'), value: 'nee' },
      ...(uitlegLink ? [{ label: t('steun.video.supporter'), value: 'supporter' }] : []),
    ],
    dismissValue: 'nee',
  });
}
