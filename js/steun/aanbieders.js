// De aanbieders van video's en aankopen. De app praat alleen met deze twee kleine "stekkers"; wat erachter zit, wisselt:
//   - in de Android-app: AdMob (beloonde video) en Google Play Billing (aankoop) via Capacitor-plugins, aangesloten met zetAanbieders (zie docs/STEUN.md)
//   - bij het ontwikkelen (alleen op localhost, met ?steuntest=1): de testaanbieders onderaan, zonder echte video of betaling
//   - anders niets. Dan blijft alles verborgen en werkt de app zoals altijd.
//
// Videoaanbieder:   { voorlaad(): Promise<void>, toon(): Promise<'beloond' | 'gesloten'> }
//                   'beloond' = de video is tot het eind bekeken; 'gesloten' = de speler stopte eerder (dan geen tip).
// Aankoopaanbieder: { prijs(): Promise<string>, koop(): Promise<'gekocht' | 'gestopt'>, herstel(): Promise<boolean> }
// Gaat er iets mis, gooi dan een SteunFout met een code: 'offline' (geen internet), 'geen-aanbod' (er is nu geen video), anders 'fout'.

import { confirmDialog } from '../ui.js';

export class SteunFout extends Error {
  constructor(code, bericht = code) { super(bericht); this.name = 'SteunFout'; this.code = code; }
}

let video = null, aankoop = null;
export function zetAanbieders({ video: v, aankoop: a } = {}) {
  if (v !== undefined) video = v;
  if (a !== undefined) aankoop = a;
}
export const videoAanbieder = () => video;
export const aankoopAanbieder = () => aankoop;

// ----- Testaanbieders (alleen voor het ontwikkelen) -----
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

/** @param {{ duur?: number }} opties duur van de nepvideo in milliseconden */
export function testAanbieders({ duur = 4000 } = {}) {
  const video = {
    voorlaad: async () => {},
    toon: () => new Promise((resolve) => {
      const tel = document.createElement('b');
      const sluit = document.createElement('button');
      sluit.type = 'button'; sluit.className = 'stv-sluit'; sluit.setAttribute('aria-label', 'Sluiten'); sluit.textContent = '✕';
      const doos = document.createElement('div');
      doos.className = 'steun-testvideo'; doos.setAttribute('role', 'dialog'); doos.setAttribute('aria-modal', 'true'); doos.setAttribute('aria-label', 'Testvideo');
      const kop = document.createElement('p'); kop.className = 'stv-kop'; kop.textContent = 'TESTVIDEO';
      const tekst = document.createElement('p'); tekst.append('Hier komt later een echte video. Nog ', tel, ' seconden…');
      doos.append(sluit, kop, tekst);
      document.body.append(doos);
      const eind = Date.now() + duur;
      let klaar = false;
      const ververs = () => { tel.textContent = String(Math.max(0, Math.ceil((eind - Date.now()) / 1000))); };
      ververs();
      const timer = setInterval(() => { ververs(); if (Date.now() >= eind) { klaar = true; doos.classList.add('klaar'); tekst.textContent = 'Klaar. Sluit met het kruisje.'; clearInterval(timer); } }, 100);
      sluit.addEventListener('click', () => { clearInterval(timer); doos.remove(); resolve(klaar || Date.now() >= eind ? 'beloond' : 'gesloten'); });
      sluit.focus();
    }),
  };
  const aankoop = {
    prijs: async () => '€ 4,99',
    koop: async () => {
      await wacht(300);
      const ok = await confirmDialog({ title: 'Testaankoop', text: 'Dit is een test: er wordt niets betaald.', confirmLabel: 'Kopen (test)', cancelLabel: 'Stoppen' });
      return ok ? 'gekocht' : 'gestopt';
    },
    herstel: async () => false,
  };
  return { video, aankoop };
}
