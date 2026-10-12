# Een spel toevoegen

1. Maak `js/games/mijnspel.js` en exporteer `mount(container, ctx)`. Begin met een kopie van `js/games/demo.js`; daar staat uitgelegd wat `ctx` bevat.
2. Zet in `js/games/registry.js` bij het spel `status: 'ready'` en `load: () => import('./mijnspel.js')`. Heeft het spel veel ruimte nodig (zoals een groot rooster), zet dan ook `wide: true`.
3. Eigen stijl? Maak `css/games/mijnspel.css` en link die in `index.html` **onder** `css/styles.css` (anders winnen de basisknoppen). Gebruik de kleurvariabelen (`var(--primary)`, `var(--text)`, ...), dan werken donker en hoog contrast vanzelf.
4. Geef het spel een illustratie in `js/games/art.js` en een tint in `css/styles.css` (`.game--mijnspel { --tint: ...; --tint-2: ...; }`, en een donkere variant). Die komen op de kaarten en het startscherm.
5. Wil je dat het spel op de kaart een voortgangsbalk toont? Geef dan bij `ctx.save(state, { progress })` een getal van 0 tot 1 mee.
6. Schrijf een test voor de logica in `tests/` (zie de engines van de bestaande spellen).
7. Zet alle teksten van het spel (naam, samenvatting, uitleg, niveaus, meldingen) in `tools/i18n/bron/` (Engels | Nederlands, zie [`TALEN.md`](TALEN.md)) en gebruik in de code `t('sleutel')`; in de registry maak je het spel met `spel('<id>', {...})`, dat de naam, samenvatting, uitleg en niveaus uit het taalpakket haalt. Draai daarna `node tools/i18n/maak.mjs`. De andere talen volgen via het vertaalproces.
8. Heeft het spel inhoud per taal (woorden, omschrijvingen)? Laad die dan per taal (zoals `js/games/woordzoeker/themas.js`) en schrijf de bron in `tools/inhoud/<taal>/`.
9. Draai `npm run build` om `dist/puzzleplace.html` te verversen.

Dat is alles: de kaart in "Spellen", de uitlegpagina, de niveaukeuze, bewaren van voortgang, "Verder spelen", het felicitatiescherm en de puzzel van de dag werken vanzelf.

## Afspraken voor spellen

- Teken alleen in `container`; de rest van de pagina is van het platform.
- Roep `ctx.save(state)` aan na **elke** zet. Zo is "Terug" altijd veilig.
- Maak de puzzel uit `ctx.seed` en `ctx.difficulty`: zelfde seed = zelfde puzzel. Voor de puzzel van de dag is de seed de datum, dus iedereen krijgt dezelfde.
- Roep `ctx.complete(result)` aan als het spel klaar is. Met `{ title, text, joy }` kun je een eigen slotbericht meegeven (Woordtuin zegt "Gewonnen!" of "Mooi gespeeld!"); zonder zegt het platform "Goed gedaan!".
- Geef elk spel een **Ongedaan maken**-knop, zodat niets onherstelbaar is.
- Gebruik de bestaande knopstijlen (`btn`, `btn-primary`) en `rem`-eenheden; tikvlakken minimaal 3rem. Raster-vakjes mogen compacter, maar liefst niet kleiner dan 2,5rem.
- Geen tijdsdruk, geen geluid dat vanzelf start, geen flitsende animaties.
- Geen tekst in de code: alles via `t('sleutel')` (Engels is de bron). Schrijf zinnen zonder woordvolgorde die in andere talen niet werkt: één plaatshouder per gegeven (`{name}`), geen stukjes zin aan elkaar plakken, en meervouden als `sleutel_one` / `sleutel_other` met `{n}` in elke vorm.


De drie spellen in `js/games/` zijn de voorbeelden: `engine.js` bevat alleen logica (met tests in `tests/`), het andere bestand het scherm. Een spel mag een functie teruggeven uit `mount` om op te ruimen (de kruiswoordpuzzel doet dat voor zijn toetsenbord).

## Tijd, beste tijd en de puzzel van de dag (Sudoku)

- Sudoku houdt de **tijd** bij (alleen terwijl het spel in beeld is, met pauze en een knop om de tijd te verbergen) en bewaart hem in de spelstand (`state.time`).
- Bij winst roept het spel `ctx.recordWin({ time })` aan: dat legt de **beste tijd**, het gemiddelde en het aantal gewonnen/gespeelde spellen vast per niveau (`store.recordWin`) en geeft terug of het een nieuw record is. Daarna `ctx.complete({ ..., body })` met een eigen slotvenster.
- De **puzzel van de dag is altijd Sudoku** (`dailyGame()` in `registry.js`). De seed is de datum, het niveau hangt van de weekdag af (`js/shared/dagelijks.js`). Oudere dagen staan in het **archief** (`#/spel/sudoku/dagelijks`, een kalender per maand); een dag spelen is `#/spel/sudoku/speel/dagelijks/JJJJ-MM-DD`. Opgeloste dagen staan in `games.sudoku.daily`, de reeks (dagen achter elkaar) wordt daaruit berekend.
- Een ander spel met een tijd? Doe hetzelfde: `ctx.recordWin` en de statistieken verschijnen vanzelf op de pagina van het spel als je `statsKaart` in `gameDetail.js` ook voor dat spel aanzet.

## Een spel voor twee spelers

Woordtuin is ook het voorbeeld voor spelen **tegen een vriend**: de regels staan in een gewone module (`js/games/woordtuin/engine.js`) die zowel de app als de server gebruikt; de server heeft er een dun bestand voor (`server/games/woordtuin.mjs`) en het scherm (`paneel.js`) is hetzelfde voor spelen tegen de computer en tegen een vriend. Zie [`ACCOUNTS.md`](ACCOUNTS.md) voor het contract en [`NIEUW-SPEL-VOOR-TWEE.md`](NIEUW-SPEL-VOOR-TWEE.md) voor de keuzes.
