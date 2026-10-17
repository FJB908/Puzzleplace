# Een Android-app maken met Capacitor (met pushmeldingen)

De app is een webapp; Capacitor verpakt dezelfde code in een echte Android-app. De server (accounts, partijen, meldingen) blijft draaien op een eigen adres, de app praat daarmee.

## 1. De server klaarzetten

1. Zet de server online (zie `docs/ONLINE.md`) met **een schijf die blijft bestaan**: de gegevens staan in `db.sqlite` in `DATA_DIR`, met elke dag een back-up in `DATA_DIR/backups` (de laatste 7). Een oud `db.json` wordt de eerste keer vanzelf overgenomen.
2. Zet op de server `ALLOW_ORIGIN=https://localhost,capacitor://localhost` (het adres waar de app in de telefoon vandaan komt; Android gebruikt `https://localhost`, iOS `capacitor://localhost`).
3. Zet in `js/config.js` `API_BASE` op het adres van je server (bijv. `https://puzzleplace.jouwdomein.nl`). Dat adres komt ook in de uitnodigingslinks.

## 2. Firebase voor de meldingen

1. Maak een project op console.firebase.google.com en voeg een Android-app toe met dezelfde `appId` als in `capacitor.config.json` (verander `nl.example.puzzleplace` naar jouw eigen id, bijv. `nl.jouwnaam.puzzleplace`). Download `google-services.json` en zet het in `android/app/`.
2. Firebase-console > Projectinstellingen > Serviceaccounts > *Nieuwe privésleutel genereren*: je krijgt een JSON-bestand. Zet de inhoud (als één regel, of als base64) op de server als `FCM_SERVICE_ACCOUNT`, of het pad als `FCM_SERVICE_ACCOUNT_FILE`. Dit bestand is geheim; zet het nooit in git.
3. Zonder `FCM_SERVICE_ACCOUNT` verstuurt de server niets: de meldingen verschijnen dan in het venster van de server. Dat is handig om te testen.

## 3. De Android-app bouwen

```
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/push-notifications
npx cap add android
npm run web          # kopieert de app naar www/
npx cap sync android
npx cap open android # opent Android Studio: bouwen en op je telefoon proberen
```

Na elke wijziging aan de app: `npm run web` en `npx cap sync android`.

## Welke meldingen er komen

De server stuurt een melding, in de taal van het apparaat, bij: *jij bent aan de beurt* (ook als de ander past), een nieuwe partij, een partij die is afgelopen of gestopt, een vriendverzoek en een geaccepteerd verzoek. Een tik op de melding opent de partij of Vrienden. De app meldt zich aan na het inloggen, en af bij uitloggen. Een account verwijderen haalt ook de apparaten weg. Meldingen waarvan Google zegt dat het apparaat niet meer bestaat, ruimt de server zelf op.

Android 13 en nieuwer vraagt de gebruiker eerst toestemming; de app doet die vraag bij het inloggen.

## Voor de Play Store

Zie ook de lijst in het gesprek en `tools/woordenlijst/bronnen.md` (licenties van de woordenlijsten): uitzoeken voordat je publiceert.

Een extra tip met een video en de eenmalige bijdrage ("Supporter") horen bij de Android-app en staan nog uit: zie `docs/STEUN.md` (wat er voor de winkel nog moet: AdMob, Play Billing, toestemmingsscherm, privacytekst).
