// E-mail versturen, zonder extra pakketten: een kleine SMTP-client (node:net en node:tls).
//
//   SMTP_URL   smtps://gebruiker:wachtwoord@smtp.voorbeeld.nl:465   (versleuteld vanaf het begin)
//              smtp://gebruiker:wachtwoord@smtp.voorbeeld.nl:587    (STARTTLS)
//   MAIL_FROM  "Puzzleplace <noreply@voorbeeld.nl>"  (afzender; standaard het adres uit SMTP_URL)
//
// Zonder SMTP_URL (bijv. op je eigen computer) wordt er niets verstuurd: de mail komt in `outbox` en op het scherm van de server,
// zodat je alles kunt uitproberen. Zet SMTP_URL voordat je de app echt gebruikt.

import net from 'node:net';
import tls from 'node:tls';
import { hostname } from 'node:os';

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const adres = (s) => (/<([^>]+)>/.exec(s) || [null, s])[1].trim();
const kop = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);

export function bouwBericht({ from, to, subject, text }) {
  const regels = b64(text).match(/.{1,76}/g).join('\r\n');
  return [`From: ${from}`, `To: ${to}`, `Subject: ${kop(subject)}`, `Date: ${new Date().toUTCString()}`, 'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', regels, ''].join('\r\n');
}

// Een SMTP-gesprek: stuur een opdracht, wacht op het antwoord (ook als dat uit meer regels bestaat)
function gesprek(socket, ms = 15000) {
  let buf = '', wacht = null;
  const lees = (data) => {
    buf += data.toString('utf8');
    for (;;) {
      const regels = buf.split('\r\n'); if (regels.length < 2) return;
      const klaar = regels.findIndex((l) => /^\d{3} /.test(l) || /^\d{3}$/.test(l));
      if (klaar < 0) return;
      const antwoord = regels.slice(0, klaar + 1); buf = regels.slice(klaar + 1).join('\r\n');
      if (wacht) { const w = wacht; wacht = null; w.ok({ code: Number(antwoord[klaar].slice(0, 3)), regels: antwoord }); }
    }
  };
  socket.on('data', lees);
  const fout = (e) => { if (wacht) { const w = wacht; wacht = null; w.nee(e); } };
  socket.on('error', fout); socket.on('close', () => fout(new Error('verbinding verbroken')));
  const volgende = () => new Promise((ok, nee) => { wacht = { ok, nee }; setTimeout(() => fout(new Error('SMTP: geen antwoord')), ms).unref(); });
  return {
    antwoord: volgende,
    async stuur(regel, verwacht) {
      const p = volgende(); socket.write(regel + '\r\n');
      const r = await p;
      if (verwacht && !verwacht.includes(r.code)) throw new Error(`SMTP ${r.code}: ${r.regels.join(' ').slice(0, 120)}`);
      return r;
    },
    omzetten(nieuw) { socket.removeListener('data', lees); socket = nieuw; socket.on('data', lees); socket.on('error', fout); },
  };
}

export async function smtpVerstuur({ url, from, to, subject, text }) {
  const u = new URL(url);
  const veilig = u.protocol === 'smtps:', poort = Number(u.port) || (veilig ? 465 : 587), host = u.hostname;
  const afzender = from || decodeURIComponent(u.username) || `noreply@${host}`;
  let socket = await new Promise((ok, nee) => {
    const s = veilig ? tls.connect({ host, port: poort, servername: host }, () => ok(s)) : net.connect({ host, port: poort }, () => ok(s));
    s.once('error', nee);
  });
  try {
    const g = gesprek(socket);
    const hallo = await g.antwoord(); if (hallo.code !== 220) throw new Error(`SMTP ${hallo.code}`);
    let ehlo = await g.stuur(`EHLO ${hostname() || 'localhost'}`, [250]);
    if (!veilig && ehlo.regels.some((l) => /STARTTLS/i.test(l))) {
      await g.stuur('STARTTLS', [220]);
      socket = await new Promise((ok, nee) => { const s = tls.connect({ socket, servername: host }, () => ok(s)); s.once('error', nee); });
      g.omzetten(socket);
      ehlo = await g.stuur(`EHLO ${hostname() || 'localhost'}`, [250]);
    }
    if (u.username) await g.stuur(`AUTH PLAIN ${b64(`\0${decodeURIComponent(u.username)}\0${decodeURIComponent(u.password)}`)}`, [235]);
    await g.stuur(`MAIL FROM:<${adres(afzender)}>`, [250]);
    await g.stuur(`RCPT TO:<${adres(to)}>`, [250, 251]);
    await g.stuur('DATA', [354]);
    const bericht = bouwBericht({ from: afzender, to, subject, text }).replace(/^\./gm, '..');
    await g.stuur(`${bericht}\r\n.`, [250]);
    await g.stuur('QUIT').catch(() => {});
  } finally { socket.destroy(); }
}

export function createMailer({ url = '', from = '', log = console.log } = {}) {
  const outbox = [];
  return {
    outbox, echt: !!url,
    async send({ to, subject, text }) {
      if (!url) { outbox.push({ to, subject, text }); log(`\n[e-mail, niet verstuurd: SMTP_URL ontbreekt]\n  Aan: ${to}\n  Onderwerp: ${subject}\n  ${text.replace(/\n/g, '\n  ')}\n`); return; }
      await smtpVerstuur({ url, from, to, subject, text });
    },
  };
}
