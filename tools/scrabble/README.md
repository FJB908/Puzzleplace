# De woordenlijsten van Letterhof

Letterhof (het woordenlegspel) heeft per taal een eigen, **ruime** lijst van woorden van 2 tot 15 letters (`js/games/letterhof/talen/<taal>.js`), voor de acht talen die je in
Instellingen kunt kiezen: nl, en, de, fr, es, it, pt, pl. Dit is een andere lijst dan die van Woordtuin (3 tot 7 letters, streng): in een woordenlegspel mag een gewoon
woord nooit geweigerd worden.

## Hoe de lijst ontstaat

    tools/scrabble/uitbreid.py   alle woordvormen uit een Hunspell-woordenboek (stam + uitgangen), met spylls
    tools/scrabble/bouw.py       de lijst van een taal: kandidaten, geldigheid, filters, handlijsten  ->  <uitmap>/<taal>.tsv
    tools/scrabble/pak.py        <taal>.tsv -> js/games/letterhof/talen/<taal>.js (compact, voor de app)
    tools/scrabble/letters.py    de verdeling en waarden van de stenen uit de lijst zelf; maak-letters.py schrijft js/games/letterhof/letters.js

Bronnen halen: zie `tools/woordenlijst/haal-bronnen.sh` (Hunspell-woordenboeken van wooorm/dictionaries, ondertitelfrequenties van hermitdave/FrequencyWords, OpenTaal voor het
Nederlands) en voor het Engels de ENABLE-lijst (publiek domein, `dolph/dictionary`). wordfreq (pip) geeft de frequentie ("zipf") van een woord.

Een woord komt in de lijst als:

1. het woordenboek van de taal het kent, in kleine letters (zo vallen eigennamen weg), **en**
2. het in echte tekst voorkomt (ondertitels of wordfreq) — behalve bij **Nederlands** (de OpenTaal-lijst is zelf gekeurd), **Engels** (ENABLE), en bij **Frans, Spaans en Duits**,
   waar ook zeldzame vormen uit het woordenboek meedoen die nergens voorkomen ("léchouillassions"), zoals in de officiële lijsten. Voor **Pools, Italiaans en Portugees** geldt
   alleen het eerste én tweede: het woordenboek maakt daar miljoenen vormen (Pools 3 miljoen, Italiaans en Portugees met aangeplakte voornaamwoorden en verkleinwoorden) en alleen de
   vormen die echt voorkomen komen mee (Pools ruim 450.000). Een geldige maar nooit voorkomende Poolse vorm wordt dus geweigerd; dat is een bewuste keuze (grootte en geheugen).
3. Het alfabet is per taal anders: Duits heeft ä ö ü en ß wordt ss, Pools heeft ą ć ę ł ń ó ś ź ż als eigen steen (q v x ontbreken), Spaans ñ, Portugees ç; Italiaans heeft 21 letters;
   overige tekens vallen weg ("é" is "e").
4. Tweeletterwoorden komen alleen uit `lijst/<taal>/kort.txt` (met de hand: woordenboeken kennen ook afkortingen), drieletterwoorden moeten gewoon zijn (zipf ≥ 3), woorden van
   4 en minder letters die in het Engels veel gewoner zijn vallen af (behalve met accent), Engelse woorden van 4 en 5 letters uit het woordenboek moeten gewoon zijn.

Handwerk per taal in `tools/scrabble/lijst/<taal>/`:

- `blokkeerlijst.txt` woorden die eruit moeten (afkortingen, namen, vreemde woorden, nietbestaande vormen, kwetsende woorden voor groepen), in de vorm van de stenen
- `toegestaan.txt` geldige woorden die het woordenboek of de filters misten (wint van de blokkeerlijst, ook van die van Woordtuin)
- `kort.txt` de tweeletterwoorden
- `ruw.txt` (en die van Woordtuin) grove woorden: ze tellen mee als je ze speelt, maar de computer speelt ze nooit en geeft er geen tip voor
- `stam-blokkeerlijst-*.txt` (Duits) eigennamen in het woordenboek (bij `uitbreid.py` als stamwoorden die je overslaat)
- `BEOORDELING.md` het rapport van de beoordelaar

## Hoe goed is het?

Elke lijst is door een beoordelaar met kennis van de taal nagelopen (alle woorden van 2 tot 4 letters, steekproeven in elke frequentieband, systematische problemen opgespoord en met
lijsten en regels opgelost). De geschatte precisie staat in `BEOORDELING.md` per taal: ruim 99% voor gewone woorden, 93 tot 98% voor de zeldzame vormen. **Perfect is het niet** en dat kan
bij lijsten van 170.000 tot 450.000 woorden ook niet; de beoordelaars noemen zelf wat er nog kan zitten (vooral kleine-letter namen en leenwoorden in de zeldzame band). De computer
speelt alleen woorden uit de gewone lagen (zipf ≥ 2,5 of 3,5, zie `js/games/letterhof/computer.js`), dus de rommel in de zeldzame band raakt alleen wat jij zelf speelt.
Een woord toevoegen of weigeren: zet het op `toegestaan.txt` of `blokkeerlijst.txt` en draai bouw.py en pak.py opnieuw.

## Licenties

Zelfde bronnen en licenties als `tools/woordenlijst/bronnen.md` (Hunspell-woordenboeken GPL/LGPL/MPL; OpenTaal BSD of CC BY; ENABLE publiek domein). In de lijsten staan alleen woorden;
zie dat bestand voor het advies om de licenties voor het uitbrengen na te lopen.
