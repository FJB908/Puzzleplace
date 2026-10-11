# Online spelen met vrienden (gratis, eenvoudig)

Puzzleplace is één Node-server die de app **en** de accounts/partijen levert. Online zetten betekent dus: die server ergens laten draaien waar je vrienden bij kunnen. Er zijn geen pakketten of database nodig.

## Optie 1: gratis op Render (online voor iedereen)

1. Zet het project in een eigen GitHub-repository (dat staat er al).
2. Maak een gratis account op render.com en kies **New +** > **Blueprint**. Kies de repository: `render.yaml` regelt de rest (gratis plan, starten met `node server/index.mjs`).
3. Na een paar minuten krijg je een adres als `https://puzzleplace-xxxx.onrender.com`. Dat deel je met je vrienden; zij maken een account en voegen je toe met je vriendencode.

**Wat je moet weten van het gratis plan** (dit is hoe de gratis plannen bij dit soort diensten meestal werken; kijk op de site van Render voor de voorwaarden van nu):
* De server gaat na ongeveer een kwartier zonder bezoek slapen. De eerste keer daarna duurt het laden even (een halve minuut tot een minuut).
* De gratis server heeft **geen blijvende schijf**: accounts en partijen staan in een bestand (`server/data/db.json`) en dat kan verdwijnen als de server opnieuw start of opnieuw wordt uitgerold. Voor spelen met een paar vrienden is dat vaak te overzien, maar je kunt dan opnieuw moeten aanmelden. Wil je dat het blijft, neem dan een betaald plan met een schijf en zet `DATA_DIR` op de map van die schijf.
* E-mail (codes bij wachtwoord vergeten) werkt alleen als je `SMTP_URL` instelt (zie `docs/ACCOUNTS.md`); zonder dat kan iemand zijn wachtwoord herstellen met de herstelcode of, als hij ingelogd is, een nieuw wachtwoord kiezen.

## Optie 2: vanaf je eigen computer, gratis en met blijvende gegevens

Draai `npm run server` en geef er een tijdelijk openbaar adres aan, bijvoorbeeld met Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:8000`, gratis, geen account nodig). Je vrienden gebruiken het adres dat het programma laat zien. Je gegevens blijven op je eigen computer, maar het werkt alleen zolang je computer en het programma aan staan.

## Andere goedkope of gratis plekken

Prijzen en gratis-voorwaarden veranderen vaak: kijk op de site zelf voor de stand van nu. Waar je op moet letten is **een schijf die blijft bestaan**, want daar staan de accounts en partijen op.
* **Een kleine VPS** (bij aanbieders als Hetzner, een paar euro per maand): de meest rechttoe-rechtaan optie met blijvende gegevens. `node server/index.mjs` onder `systemd` of met de meegeleverde `Dockerfile`, met een gratis TLS-slot via Caddy of Cloudflare.
* **Fly.io, Koyeb, Railway** en vergelijkbare diensten: draaien de `Dockerfile` of `node server/index.mjs`. Kleine abonnementen of een tegoed zijn er vaak; een blijvend volume (`DATA_DIR=/data`) kost meestal een paar euro per maand of valt binnen een gratis deel.
* **Oracle Cloud "Always Free"** en soortgelijke gratis servers van grote clouds: echt gratis en met een schijf die blijft, maar het instellen is meer werk en er is meestal een betaalkaart nodig om je aan te melden.

## Zonder server: virtuele spelers

Je hebt geen server nodig om online-achtig te spelen. Op het scherm van Woordtuin staat **"Speel tegen een virtuele speler"**: Fien, Cor, Bram, Gert, Els en Hanna zijn de computer met een naam, een niveau en een eigen tempo (Cor denkt langzaam, Hanna is sterk). Ze spelen op je eigen apparaat, zonder account of internet, en zijn duidelijk als virtuele spelers aangegeven; het zijn geen echte mensen. Voor echte tegenstanders blijft de server nodig.

## Alleen de app, zonder vrienden

De spellen tegen de computer werken ook op een gewone statische website (bijvoorbeeld GitHub Pages) met het bestand `dist/puzzleplace.html` of de map zelf. Spelen tegen een vriend en accounts hebben altijd de server nodig.
