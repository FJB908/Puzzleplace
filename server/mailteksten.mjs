// De teksten van de e-mails, in de talen van de app. De server weet niet welke taal iemand heeft; de app stuurt die mee (`taal`).
// {code} is de code (bijv. K7P4-QM2X), {naam} de voornaam, {min} hoe lang de code werkt.

const T = {
  en: { reset: ['Your Puzzleplace code', 'Hello {naam},\n\nYour code to choose a new password is:\n\n    {code}\n\nIt works for {min} minutes. Did you not ask for this? Then you can ignore this email: your password has not changed.\n\nPuzzleplace'],
        change: ['Your Puzzleplace code', 'Hello {naam},\n\nYour code to change your password is:\n\n    {code}\n\nIt works for {min} minutes. Did you not ask for this? Then someone knows your password: you can ignore this email, but please change your password soon.\n\nPuzzleplace'] },
  nl: { reset: ['Je Puzzelplaats-code', 'Hallo {naam},\n\nJe code om een nieuw wachtwoord te kiezen is:\n\n    {code}\n\nDe code werkt {min} minuten. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren: je wachtwoord is niet veranderd.\n\nPuzzelplaats'],
        change: ['Je Puzzelplaats-code', 'Hallo {naam},\n\nJe code om je wachtwoord te veranderen is:\n\n    {code}\n\nDe code werkt {min} minuten. Heb je dit niet aangevraagd? Dan kent iemand je wachtwoord: je kunt deze e-mail negeren, maar verander je wachtwoord binnenkort.\n\nPuzzelplaats'] },
  de: { reset: ['Ihr Puzzleplace-Code', 'Guten Tag {naam},\n\nIhr Code, um ein neues Passwort zu wählen, lautet:\n\n    {code}\n\nDer Code gilt {min} Minuten. Sie haben das nicht angefordert? Dann können Sie diese E-Mail ignorieren: Ihr Passwort wurde nicht geändert.\n\nPuzzleplace'],
        change: ['Ihr Puzzleplace-Code', 'Guten Tag {naam},\n\nIhr Code, um Ihr Passwort zu ändern, lautet:\n\n    {code}\n\nDer Code gilt {min} Minuten. Sie haben das nicht angefordert? Dann kennt jemand Ihr Passwort: Sie können diese E-Mail ignorieren, sollten Ihr Passwort aber bald ändern.\n\nPuzzleplace'] },
  fr: { reset: ['Votre code Puzzleplace', 'Bonjour {naam},\n\nVoici votre code pour choisir un nouveau mot de passe :\n\n    {code}\n\nIl est valable {min} minutes. Vous n’avez rien demandé ? Alors ignorez cet e-mail : votre mot de passe n’a pas changé.\n\nPuzzleplace'],
        change: ['Votre code Puzzleplace', 'Bonjour {naam},\n\nVoici votre code pour changer votre mot de passe :\n\n    {code}\n\nIl est valable {min} minutes. Vous n’avez rien demandé ? Alors quelqu’un connaît votre mot de passe : ignorez cet e-mail, mais changez bientôt votre mot de passe.\n\nPuzzleplace'] },
  es: { reset: ['Tu código de Puzzleplace', 'Hola {naam}:\n\nTu código para elegir una contraseña nueva es:\n\n    {code}\n\nVale durante {min} minutos. ¿No lo has pedido tú? Entonces ignora este correo: tu contraseña no ha cambiado.\n\nPuzzleplace'],
        change: ['Tu código de Puzzleplace', 'Hola {naam}:\n\nTu código para cambiar la contraseña es:\n\n    {code}\n\nVale durante {min} minutos. ¿No lo has pedido tú? Entonces alguien conoce tu contraseña: ignora este correo, pero cambia pronto tu contraseña.\n\nPuzzleplace'] },
  it: { reset: ['Il tuo codice Puzzleplace', 'Ciao {naam},\n\nIl tuo codice per scegliere una nuova password è:\n\n    {code}\n\nVale per {min} minuti. Non l’hai chiesto tu? Allora ignora questa e-mail: la tua password non è cambiata.\n\nPuzzleplace'],
        change: ['Il tuo codice Puzzleplace', 'Ciao {naam},\n\nIl tuo codice per cambiare la password è:\n\n    {code}\n\nVale per {min} minuti. Non l’hai chiesto tu? Allora qualcuno conosce la tua password: ignora questa e-mail, ma cambia presto la password.\n\nPuzzleplace'] },
  pt: { reset: ['O seu código do Puzzleplace', 'Olá {naam},\n\nO seu código para escolher uma nova palavra-passe é:\n\n    {code}\n\nÉ válido durante {min} minutos. Não pediu isto? Então ignore este e-mail: a sua palavra-passe não mudou.\n\nPuzzleplace'],
        change: ['O seu código do Puzzleplace', 'Olá {naam},\n\nO seu código para mudar a palavra-passe é:\n\n    {code}\n\nÉ válido durante {min} minutos. Não pediu isto? Então alguém conhece a sua palavra-passe: ignore este e-mail, mas mude em breve a palavra-passe.\n\nPuzzleplace'] },
  pl: { reset: ['Twój kod Puzzleplace', 'Dzień dobry, {naam}!\n\nTwój kod do ustawienia nowego hasła:\n\n    {code}\n\nKod działa przez {min} minut. To nie Ty o niego prosiłeś? Zignoruj tę wiadomość: Twoje hasło się nie zmieniło.\n\nPuzzleplace'],
        change: ['Twój kod Puzzleplace', 'Dzień dobry, {naam}!\n\nTwój kod do zmiany hasła:\n\n    {code}\n\nKod działa przez {min} minut. To nie Ty o niego prosiłeś? Ktoś zna Twoje hasło: zignoruj tę wiadomość, ale wkrótce zmień hasło.\n\nPuzzleplace'] },
};

export function mailTekst(soort, taal, params) {
  const [onderwerp, tekst] = (T[taal] || T.en)[soort];
  const vul = (s) => s.replace(/\{(\w+)\}/g, (m, k) => (params[k] ?? m));
  return { subject: vul(onderwerp), text: vul(tekst) };
}
export const MAIL_TALEN = Object.keys(T);
