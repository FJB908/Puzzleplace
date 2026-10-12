// Pushmeldingen in de Capacitor-app ("jij bent aan de beurt"). In de browser doet dit niets.
// Het plugin @capacitor/push-notifications zit in de native app; hier wordt het via window.Capacitor aangesproken (geen bundelaar nodig).
// Zie docs/ANDROID.md voor het instellen van Firebase en de server.

import * as auth from './auth.js';
import { api } from './backend.js';
import { getTaal } from '../i18n/index.js';
import { doelVan } from '../shared/pushdoel.js';

const cap = () => (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() ? window.Capacitor : null);
const plugin = () => cap()?.Plugins?.PushNotifications || null;
let token = null, gestart = false;


async function aanmelden() {
  const P = plugin(); if (!P) return;
  let toestemming = (await P.checkPermissions()).receive;
  if (toestemming === 'prompt' || toestemming === 'prompt-with-rationale') toestemming = (await P.requestPermissions()).receive;
  if (toestemming === 'granted') await P.register();
}

async function naarServer() {
  if (!token || !auth.getUser()) return;
  await api('POST', '/api/me/devices', { token, platform: cap()?.getPlatform?.() || 'android', taal: getTaal() }).catch(() => {});
}

export async function init() {
  const P = plugin();
  if (!P || gestart) return;
  gestart = true;
  await P.addListener('registration', (r) => { token = r.value; naarServer(); });
  await P.addListener('registrationError', (e) => console.warn('Pushmeldingen: aanmelden mislukt', e));
  await P.addListener('pushNotificationActionPerformed', (a) => { location.hash = doelVan(a.notification?.data); });
  try { await P.createChannel?.({ id: 'puzzleplace', name: 'Puzzleplace', description: 'Jij bent aan de beurt, vriendverzoeken en partijen', importance: 4, visibility: 1 }); } catch { /* alleen Android kent kanalen */ }
  auth.beforeSignOut(async () => { if (token) await api('DELETE', '/api/me/devices', { token }, { quiet: true }).catch(() => {}); });
  let ingelogd = !!auth.getUser();
  auth.subscribe(({ user }) => { if (user && !ingelogd) aanmelden().catch(() => {}); ingelogd = !!user; });
  if (ingelogd) aanmelden().catch(() => {});
}
