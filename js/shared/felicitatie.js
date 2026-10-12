// "Gefeliciteerd, Anna!" als je bent ingelogd (de voornaam), anders gewoon "Gefeliciteerd!"
import { t } from '../i18n/index.js';
import * as auth from '../services/auth.js';

export function felicitatie() {
  const naam = String(auth.getUser?.()?.name || '').trim().split(/\s+/)[0];
  return naam ? t('common.congratsName', { name: naam }) : t('common.congrats');
}
