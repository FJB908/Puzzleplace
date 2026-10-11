// Stuurt een proefmail, zodat je meteen ziet of het e-mailen werkt:   npm run mailtest -- jij@voorbeeld.nl
import { laadInstellingen } from '../server/instellingen.mjs';
import { createMailer } from '../server/mail.mjs';

laadInstellingen();
const aan = process.argv[2];
if (!aan) { console.error('Gebruik: npm run mailtest -- jouw@adres.nl'); process.exit(1); }
if (!process.env.SMTP_URL) { console.error('SMTP_URL ontbreekt. Kopieer .env.voorbeeld naar .env en vul het in (de uitleg staat erin).'); process.exit(1); }
try {
  await createMailer({ url: process.env.SMTP_URL, from: process.env.MAIL_FROM || '' }).send({ to: aan, subject: 'Proefmail van Puzzleplace', text: 'Gelukt! Puzzleplace kan e-mail versturen.\n\nPuzzleplace' });
  console.log(`Gelukt: de proefmail is verstuurd naar ${aan}. Kijk ook in je map met ongewenste e-mail.`);
} catch (e) {
  console.error(`Het versturen lukte niet: ${e.message}`);
  if (/535|534|auth/i.test(e.message)) console.error('Dat betekent meestal: het adres of het app-wachtwoord klopt niet (bij Gmail: gebruik een app-wachtwoord, niet je gewone wachtwoord).');
  process.exit(1);
}
