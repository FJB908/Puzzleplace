# Letterhof (woordenlegspel)

Letters op een bord leggen tot woorden en punten scoren met de gekleurde vakjes, tegen de virtuele speler. Het is een eigen spel in de familie van de woordenlegspellen (zoals je die kent van
Wordfeud en Scrabble): de regels van zo'n spel zijn vrij te gebruiken, de naam, de indeling van het bord, de waarden van de letters en het uiterlijk zijn hier helemaal eigen werk.

## Regels

- Bord van 15 bij 15, zeven stenen in je rek, de zak heeft 100 stenen en 2 lege stenen (een lege steen mag elke letter zijn en is niets waard).
- De eerste zet loopt over de bloem in het midden (minstens twee letters); elke volgende zet sluit aan op wat al ligt. Alle woorden die je maakt of kruist moeten in de woordenlijst staan.
- Vakjes: lichtgroen letter x2, groen letter x3, paars woord x2, rood woord x3 (het midden is woord x2). Ze tellen alleen voor stenen die je nu legt. Alle zeven stenen in één zet: +40.
- Wisselen kan zolang er minstens 7 stenen in de zak zitten. Zes beurten achter elkaar zonder punten (wisselen of passen) beëindigen het spel, net als een leeg rek bij een lege zak. Dan verliest ieder
  de waarde van zijn eigen resterende stenen, en wie uit is krijgt de stenen van de ander erbij.
- Eén tip per spel: de stenen van een goede zet worden voor je neergelegd (je kunt ze aanpassen). Er licht niets op om te laten zien wat kan.
- Niveaus (de woorden die de computer kent en hoe vaak hij de beste zet kiest): makkelijk (alleen kernwoorden, zwakke zetten), gemiddeld (gewone woorden), moeilijk (ook zeldzame, een van de beste drie),
  extreem (alles, altijd de beste zet met een klein oordeel over wat hij overhoudt). Grove woorden speelt de computer nooit en geeft hij nooit als tip.
- De taal van het spel is de taal van de app (acht talen). Een spel dat loopt blijft in zijn eigen taal.

## Waar staat wat

| Onderdeel | Waar |
|---|---|
| Regels (bord, zak, zetten toetsen en tellen, wisselen, passen, einde) | `js/games/letterhof/engine.js` |
| De woordenlijst als compacte boom, lagen kern/gangbaar/zeldzaam/grof | `js/games/letterhof/woordenboek.js`, `talen/<taal>.js` (gemaakt door `tools/scrabble/`, zie daar de README) |
| Alle zetten van een rek (Appel en Jacobson) | `js/games/letterhof/zetten.js` |
| De computer en de tip | `js/games/letterhof/computer.js` |
| Verdeling en waarden van de stenen (uit de woordenlijst berekend) | `js/games/letterhof/letters.js` |
| Het scherm: bord, rek, slepen en tikken, dialogen | `js/games/letterhof/letterhof.js`, `css/games/letterhof.css` |
| Teksten (acht talen) | `tools/i18n/bron/200-letterhof.txt` en `tools/i18n/vertaling/<taal>.txt` |
| Tests | `tests/letterhof.test.mjs` (regels en computer tegen een traag zoekprogramma), `tests/letterhof-lijsten.test.mjs` (de lijsten) |

## Uiterlijk

Rustig en minimalistisch, in de kleuren van de rest van de app (teal en roze), in licht, donker en hoog contrast (alle kleuren staan als `--lh-*` bovenaan `css/games/letterhof.css`).
Het bord is porselein met vlakke bonusvakjes: teal voor letters (licht = x2, donker = x3), roze voor woorden (licht = x2, donker = x3). Ook zonder kleur te lezen: een gewoon
getal is een letterbonus, een getal in een cirkel een woordbonus. Er is bewust geen legenda op het scherm; de uitleg staat bij "Uitleg". Stenen zijn ivoor met een fijn randje;
een steen die je net hebt gelegd heeft een roze rand, het laatste woord van de virtuele speler een teal rand. Onder het bord staat één hoofdknop (Spelen) en een rij
stille knoppen (Terugnemen, Tip, Stenen wisselen, Passen). Husselen en inzoomen zijn ronde knopjes op de rand van het rek en het bord. De stenen van het rek volgen de
breedte van het rek (ook op 320 px met de grootste tekst).

## Eigen werk, geen kopie

De indeling van de bonusvakjes (een bloemvorm met acht keer gespiegelde vakjes), de verdeling en waarden van de letters (uit de frequentie in de lijst van elke taal), de kleuren, de
stenen en de naam zijn bedacht voor dit spel. Voor het uitbrengen is het verstandig de naam "Letterhof" (en per taal de vertaling) nog eenmaal te laten controleren.
