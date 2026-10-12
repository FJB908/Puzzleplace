# Bronnen en licenties van de woordenlijsten

De woordenlijst van Woordtuin (`js/games/woordtuin/talen/<taal>.js`) wordt voor elke taal op dezelfde manier gemaakt als voor het Nederlands:

1. **Spellingswoordenboek** van de taal (Hunspell; Nederlands: OpenTaal; Fins: Voikko). Alleen woorden die dat woordenboek kent, in alle vormen
   (`tools/woordenlijst/extract.py`: kandidaten uit de ondertitelfrequenties, elk woord door het woordenboek gehaald). Streepjes en tekens op letters worden
   weggevouwen (`js/shared/talen.js`), woorden van 3 tot 7 letters.
2. **Frequentie in echte tekst**: de ondertitelfrequenties (OpenSubtitles, via [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords), 2018)
   en, waar die er is, [wordfreq](https://github.com/rspeer/wordfreq). De ondergrenzen zijn relatief aan de grootte van het ondertitelkorpus, zodat elke taal even
   streng is als het Nederlands (`bouw.mjs`): een woord telt mee als het minstens 1 keer per ±13 miljoen woorden voorkomt, "alledaags" (de computer speelt het,
   tips wijzen ernaar) vanaf ±1 per miljoen.
3. **Geen Engels, namen, afkortingen, grove of kwetsende woorden**: eerst automatisch (een woord dat veel gewoner is in het Engels valt af), daarna met de hand
   beoordeeld per taal (`BEOORDELEN.md`): `tools/woordtuin/<taal>/blokkeerlijst.txt`, `ruw.txt`, `rar.txt`, `toegestaan.txt`, `engels-maar-lokaal.txt`.
4. `bouw.mjs` maakt het bestand; `kalibreer.mjs` stelt per taal in hoeveel woorden de computer ziet (`schaal.js`).

Opnieuw maken (de bronbestanden staan niet in de repository, ze zijn groot):

    tools/woordenlijst/haal-bronnen.sh <taal> .woordenbron                       # woordenboek en frequenties ophalen
    python3 tools/woordenlijst/extract.py <taal> .woordenbron --uit .woordenbron/<taal>.kand.tsv      # zie het begin van extract.py voor de opties per taal
    node tools/woordenlijst/bouw.mjs <taal> .woordenbron                         # schrijft js/games/woordtuin/talen/<taal>.js
    node tools/woordenlijst/kalibreer.mjs                                        # sterkte van de computer per taal

## Woordenboeken en licenties

De licentie staat zoals de bron zelf haar noemt (SPDX-gegevens uit [wooorm/dictionaries](https://github.com/wooorm/dictionaries)); "A / B" betekent dat je kiest.
In de app staan de naam en licentie bij Help ("Waar komen de woorden vandaan?"), uit `woordenlijst` in `js/shared/talen.js`.

| Taal | Woordenboek | Licentie |
|------|-------------|----------|
| Bulgaars | bgOffice | GPL 2 / LGPL 2.1 / MPL 1.1 |
| Catalaans | Diccionari català (Softcatalà) | GPL 2 / LGPL 2.1 |
| Deens | Stavekontrolden | GPL 2 / LGPL 2.1 / MPL 1.1 |
| Duits | igerman98 | GPL 2 / GPL 3 |
| Engels | SCOWL (en-US en en-GB) | MIT en BSD |
| Ests | Eesti Hunspell | LGPL 2.1 |
| Fins | Voikko (voikko-fi) | GPL 2 of later |
| Frans | Dicollecte | MPL 2.0 |
| Grieks | Greek dictionary (Stavropoulos) | GPL 2 / LGPL 2.1 / MPL 1.1 |
| Hongaars | Magyar Ispell (Németh) | GPL 2 / LGPL 2.1 / MPL 1.1 |
| Italiaans | Italian dictionary (Pescetti) | GPL 3 |
| Kroatisch | Croatian dictionary (Lacković) | LGPL 2.1 / SISSL |
| Lets | Latviešu pareizrakstības vārdnīca (Eisaks) | LGPL 2.1 |
| Litouws | ispell-lt (Agejevas) | BSD 3-Clause |
| Nederlands | OpenTaal | BSD 3-Clause / CC BY 3.0 |
| Noors (bokmål) | spell-norwegian | GPL 2 |
| Pools | Słownik ortograficzny (Polish Native Lang Project) | GPL 3 / LGPL 3 / MPL 2.0 |
| Portugees | Brazilië (Moura) en Portugal (Universidade do Minho) samen | LGPL / MPL |
| Roemeens | Rospell | GPL 2 / LGPL 2.1 / MPL 1.1 |
| Sloveens | Slovenski slovar za črkovanje | GPL 3 / LGPL 2.1 |
| Slowaaks | Slovak dictionaries (sk-spell) | GPL 2 / LGPL 2.1 / MPL 1.1 |
| Spaans | RLA-ES | GPL 3 / LGPL 3 / MPL 1.1 |
| Tsjechisch | Czech Hunspell dictionary | GPL 2 |
| Zweeds | Svenska ordlistan (Andersson) | LGPL 3 |

De ondertitelfrequenties (OpenSubtitles) en wordfreq worden alleen gebruikt om te tellen hoe vaak woorden voorkomen; er staat geen tekst van in de app.

## Let op bij het uitbrengen

* Woorden van een taal zijn geen eigendom van iemand: losse woorden en feiten (zoals "dit woord komt zo vaak voor") zijn niet auteursrechtelijk beschermd. De woordenlijsten zijn bovendien niet een kopie van een woordenboek: de woorden komen uit de frequentielijsten van echte tekst, en het spellingswoordenboek wordt alleen gebruikt als filter ("bestaat dit woord?"). Daarna is er een eigen selectie gemaakt (3 tot 7 letters, zonder namen, Engels en grove woorden, met de hand nagekeken).
* Wat overblijft is klein: in de EU kan een grote, zorgvuldig samengestelde verzameling woorden een eigen "databankrecht" hebben (het gaat dan om het kopiëren van een wezenlijk deel van zo'n verzameling), en BSD/CC BY vragen om het noemen van de bron (dat gebeurt in Help). Een korte controle door een jurist vóór de Play Store is verstandig maar geen reden om te wachten met testen.
* Wil je extra zeker zijn: neem per taal alleen woorden die in meer dan één onafhankelijke bron staan, of laat de lijst van een taal uit een bron met een milde licentie (BSD, MIT, CC0) komen. Dat is het meest zinvol voor de talen met alleen een GPL-woordenboek (Duits en Italiaans).
