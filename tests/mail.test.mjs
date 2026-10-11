import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { createMailer, bouwBericht } from '../server/mail.mjs';
import { mailTekst, MAIL_TALEN } from '../server/mailteksten.mjs';

// De kleine SMTP-client, tegen een nagebouwde SMTP-server: hij moet de gewone volgorde volgen (EHLO, AUTH, MAIL, RCPT, DATA) en de mail goed inpakken.
function nepServer({ auth = true } = {}) {
  const log = []; let data = '', inData = false;
  const server = net.createServer((sock) => {
    sock.write('220 test ESMTP\r\n');
    let buf = '';
    sock.on('data', (d) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const regel = buf.slice(0, i); buf = buf.slice(i + 2);
        if (inData) { if (regel === '.') { inData = false; log.push('DATAKLAAR'); sock.write('250 queued\r\n'); } else data += regel + '\n'; continue; }
        log.push(regel);
        if (/^EHLO/.test(regel)) sock.write(`250-test\r\n${auth ? '250-AUTH PLAIN\r\n' : ''}250 8BITMIME\r\n`);
        else if (/^AUTH PLAIN/.test(regel)) sock.write(Buffer.from(regel.slice(11), 'base64').toString() === '\0gebruiker\0geheim' ? '235 ok\r\n' : '535 nee\r\n');
        else if (/^MAIL FROM/.test(regel) || /^RCPT TO/.test(regel)) sock.write('250 ok\r\n');
        else if (regel === 'DATA') { inData = true; sock.write('354 go\r\n'); }
        else if (regel === 'QUIT') { sock.write('221 bye\r\n'); sock.end(); }
        else sock.write('500 ?\r\n');
      }
    });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, log, data: () => data, port: server.address().port })));
}

test('de SMTP-client verstuurt een mail met inloggen, afzender, ontvanger en een leesbare tekst (ook met accenten)', async () => {
  const s = await nepServer();
  const mailer = createMailer({ url: `smtp://gebruiker:geheim@127.0.0.1:${s.port}`, from: 'Puzzleplace <noreply@voorbeeld.nl>', log: () => {} });
  await mailer.send({ to: 'anna@voorbeeld.nl', subject: 'Je Puzzelplaats-code', text: 'Hallo Anna,\n\n.punt aan het begin\nK7P4-QM2X · café' });
  s.server.close();
  assert.ok(s.log.some((l) => /^AUTH PLAIN/.test(l)));
  assert.ok(s.log.includes('MAIL FROM:<noreply@voorbeeld.nl>')); assert.ok(s.log.includes('RCPT TO:<anna@voorbeeld.nl>'));
  const d = s.data();
  assert.match(d, /^From: Puzzleplace <noreply@voorbeeld.nl>/m); assert.match(d, /^To: anna@voorbeeld.nl/m); assert.match(d, /charset=utf-8/);
  const subject = /^Subject: (.*)$/m.exec(d)[1];
  assert.equal(subject.startsWith('=?UTF-8?B?') ? Buffer.from(subject.slice(10, -2), 'base64').toString() : subject, 'Je Puzzelplaats-code');
  const body = Buffer.from(d.split('\n\n').slice(1).join('\n\n').replace(/\n/g, ''), 'base64').toString();
  assert.match(body, /K7P4-QM2X · café/); assert.match(body, /\.punt aan het begin/);
});

test('de SMTP-client meldt een geweigerd wachtwoord', async () => {
  const s = await nepServer();
  const mailer = createMailer({ url: `smtp://gebruiker:fout@127.0.0.1:${s.port}`, log: () => {} });
  await assert.rejects(() => mailer.send({ to: 'a@b.nl', subject: 'x', text: 'y' }), /535/);
  s.server.close();
});

test('zonder SMTP_URL wordt er niets verstuurd: de mail komt in de outbox', async () => {
  const gelogd = [];
  const mailer = createMailer({ log: (t) => gelogd.push(t) });
  await mailer.send({ to: 'a@b.nl', subject: 'Onderwerp', text: 'Code K7P4-QM2X' });
  assert.equal(mailer.outbox.length, 1); assert.match(gelogd[0], /K7P4-QM2X/); assert.equal(mailer.echt, false);
});

test('de mailteksten bestaan in elke taal van de app, met de code en de geldigheid erin', () => {
  for (const taal of MAIL_TALEN) for (const soort of ['reset', 'change']) {
    const { subject, text } = mailTekst(soort, taal, { naam: 'Anna', code: 'K7P4-QM2X', min: 30 });
    assert.ok(subject.length > 5, `${taal} ${soort}`); assert.match(text, /K7P4-QM2X/); assert.match(text, /Anna/); assert.match(text, /30/);
    assert.ok(!/\{\w+\}/.test(subject + text), `${taal} ${soort}: niet ingevulde plaatshouder`);
  }
  assert.deepEqual([...MAIL_TALEN].sort(), ['de', 'en', 'es', 'fr', 'it', 'nl', 'pl', 'pt']);
  assert.match(mailTekst('reset', 'xx', { naam: 'A', code: 'C', min: 1 }).subject, /Puzzleplace/, 'onbekende taal valt terug op Engels');
});

test('bouwBericht: regels van maximaal 76 tekens', () => {
  const m = bouwBericht({ from: 'a@b.nl', to: 'c@d.nl', subject: 'x', text: 'lang '.repeat(100) });
  assert.ok(m.split('\r\n').every((l) => l.length <= 76 || /^(From|To|Subject|Date|Content)/.test(l)));
});
