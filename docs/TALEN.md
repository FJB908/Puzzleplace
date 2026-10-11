# Talen

**Engels is de officiële taal van de app** en de bron van alle teksten. Er zijn acht talen klaar: **Engels, Nederlands, Duits, Frans, Spaans, Italiaans, Portugees (Portugal) en Pools**.
Elke taal is net zo compleet als het Nederlands: de hele app, **en** de woorden en omschrijvingen van de spellen, met een woordenlijst voor Woordtuin die groot genoeg is om gewone woorden
nooit te weigeren (15.000 tot 36.000 woorden per taal). Voor nog 16 andere talen (Catalaans, Tsjechisch, Slowaaks, Sloveens, Kroatisch, Hongaars, Roemeens, Zweeds, Deens, Noors, Fins, Ests, Lets,
Litouws, Grieks, Bulgaars) staan de taalgegevens en een voorlopige woordenlijst klaar, maar ze zijn nog niet vertaald en nagekeken en worden dus niet aangeboden.

## Hoe de app de taal kiest

1. Heeft de bezoeker zijn taal gekozen (Instellingen, *Taal*), dan geldt die.
2. Anders kijkt de app naar de talen van de browser (`navigator.languages`, in volgorde van voorkeur) en neemt de eerste die er is (`nl-BE` is Nederlands, `no` en `nn` zijn Noors bokmål).
3. Geen enkele? Dan vraagt de app bij de eerste keer welke taal je wilt (een lijst met elke taal in zijn eigen naam), en onthoudt dat.

Alleen talen die **klaar** zijn (`KLAAR` in `js/shared/talen.js`) worden herkend en aangeboden. Een taal komt pas in die lijst als alles ervan er is en is nagekeken;
`tests/talen.test.mjs` controleert dat. Zo kan een taal nooit half in de app staan.

Een spel dat al begonnen is houdt zijn eigen taal (oude spellen zijn Nederlands). Een partij Woordtuin tegen een vriend heeft één taal, gekozen door wie de partij begint;
bij de partij staat die taal erbij als ze niet de taal van de app is.

## Wat er per taal is

| Onderdeel | Bestand(en) | Hoe het wordt gemaakt |
|---|---|---|
| Alle teksten van de app | `js/i18n/talen/<taal>.js` | uit `tools/i18n/vertaling/<taal>.txt` (Engels en Nederlands uit `tools/i18n/bron/*.txt`) met `node tools/i18n/maak.mjs` |
| Woordzoeker: 15 thema's met woorden | `js/games/woordzoeker/talen/<taal>.js` | uit `tools/inhoud/<taal>/woordzoeker.txt` met `node tools/inhoud/maak.mjs` |
| Kruiswoord: woorden met omschrijving | `js/games/kruiswoord/talen/<taal>.js` | uit `tools/inhoud/<taal>/kruiswoord.txt` (zelfde script) |
| Woordtuin: woordenlijst | `js/games/woordtuin/talen/<taal>.js` | `tools/woordenlijst/` (zie [`bronnen.md`](../tools/woordenlijst/bronnen.md)) |
| Taalgegevens: alfabet, klinkers, toetsenbord, vouwregels, bron van de woordenlijst | `js/shared/talen.js` | met de hand |
| Sterkte van de computer in Woordtuin | `js/games/woordtuin/schaal.js` | `node tools/woordenlijst/kalibreer.mjs` |
| Woorden in de illustraties | `js/games/art-woorden.js` | automatisch uit de puzzels (`tools/inhoud/maak.mjs`) |

## Teksten

Alles wat de speler leest staat in `tools/i18n/bron/*.txt`, een regel per tekst: `sleutel | Engels | Nederlands`; regels met `#` zijn uitleg voor vertalers. In de code staat
alleen `t('sleutel', { naam: ... })`. Een tekst met een getal heeft meervoudsvormen (`sleutel_one`, `sleutel_other`, en per taal ook `_zero`, `_two`, `_few`, `_many`; de vormen komen uit
`Intl.PluralRules`, alleen die voor hele getallen); elke vorm bevat `{n}`. Een fout van de server heeft een `key` (en `params`), zodat de app hem in de taal van de speler toont;
`message` is dezelfde tekst in het Engels.

Een nieuwe tekst toevoegen: zet de regel in de bron, draai `node tools/i18n/maak.mjs` (dat controleert dat elke taal hem heeft: dat faalt zolang er nog geen vertaling is) en
vul de vertalingen aan. De regels voor vertalers staan in [`tools/i18n/VERTALEN.md`](../tools/i18n/VERTALEN.md): toon, aanspreekvorm per taal, termen, plaatshouders, meervouden, lengte.

## Accenten en vouwen

De spellen rekenen met een eenvoudig alfabet per taal: accenten en streepjes tellen niet mee (`é` is `e`, `ü` is `u`, `ñ` is `n`, `č` is `c`, Griekse tonos vallen weg, `ß` is `ss`,
`æ` is `ae`, `œ` is `oe`, `ø` is `o`, `ł` is `l`, Catalaans `l·l` is `ll`). In het Bulgaars blijven `й` en `и` verschillende letters. Wat je typt wordt zo omgezet (`typInvoer`), dus
je hoeft de accenten niet op je toetsenbord te hebben, en elk woord dat in het woordenboek staat blijft speelbaar. De borden en de woordenlijsten tonen de letters zonder accenten.

## Puzzelinhoud

Elke taal heeft eigen puzzels, geen vertalingen van elkaar (een omschrijving past bij het woord in die taal). `tools/inhoud/SCHRIJVEN.md` legt uit hoe je ze schrijft; `tools/inhoud/maak.mjs --controleer <taal> --spelling`
controleert alles, inclusief de **spelling van elk woord tegen het echte spellingswoordenboek** van de taal, en draait de generatoren proef (elke puzzel moet lukken).

## Kwaliteit: wat er gecontroleerd is, en hoe

* Teksten: elke taal heeft alle teksten, de plaatshouders en meervoudsvormen kloppen (automatisch), is door een tweede, onafhankelijke beoordelaar nagekeken, en past op een scherm
  van 320 px breed met de grootste tekst (`layouttest`, zie hieronder).
* Puzzelinhoud: spelling per woord tegen het woordenboek (automatisch), omschrijvingen en woorden door een onafhankelijke beoordelaar nagekeken.
* Woordenlijsten: automatisch gefilterd en per taal met de hand beoordeeld (namen, Engelse woorden, afkortingen, grove en kwetsende woorden), daarna steekproeven.
* Tests: `npm test` (o.a. `tests/talen.test.mjs`, `tests/woordtuin-talen.test.mjs`, de generatoren per taal).

## Wat je moet weten (beperkingen)

* De vertalingen en puzzels zijn gemaakt en nagekeken met taalmodellen en gecontroleerd met woordenboeken en tests, **niet door moedertaalsprekers**. Laat ze door een moedertaalspreker
  nalopen voordat je de app in een land wilt uitbrengen; de keuzes voor de aanspreekvorm per taal (u/je, Sie/du, vous, ...) staan in `tools/i18n/VERTALEN.md` en zijn met één regel per taal te wijzigen.
* De woordenlijsten komen uit open woordenboeken met verschillende licenties (GPL, LGPL, MPL, BSD): zie [`bronnen.md`](../tools/woordenlijst/bronnen.md) voor de licentievraag voor je de app uitbrengt.
* Alleen de acht talen hierboven zijn klaar. Een nieuwe taal toevoegen: vertaling (`tools/i18n/VERTALEN.md`), puzzelinhoud (`tools/inhoud/SCHRIJVEN.md`), woordenlijst beoordelen (`tools/woordenlijst/BEOORDELEN.md`), `kalibreer.mjs`, en dan pas de taal in `KLAAR` zetten. Iers en Maltees (ook EU-talen) ontbreken, evenals Luxemburgs, Baskisch, Galicisch en andere regionale talen.
* Woordtuin: woorden zijn 3 tot 7 letters. Het spel stopt zodra niemand nog een gewoon woord kan maken (zeldzame woorden tellen daarvoor niet mee).
* De naam van de app is overal "Puzzleplace", behalve in het Nederlands ("Puzzelplaats").
