# Een spel toevoegen

1. Maak `js/games/mijnspel.js` en exporteer `mount(container, ctx)`. Begin met een kopie van `js/games/demo.js`; daar staat uitgelegd wat `ctx` bevat.
2. Zet in `js/games/registry.js` bij het spel `status: 'ready'` en `load: () => import('./mijnspel.js')`. Heeft het spel veel ruimte nodig (zoals een groot rooster), zet dan ook `wide: true`.
3. Eigen stijl? Maak `css/games/mijnspel.css` en link die in `index.html` **onder** `css/styles.css` (anders winnen de basisknoppen). Gebruik de kleurvariabelen (`var(--primary)`, `var(--text)`, ...), dan werken donker en hoog contrast vanzelf.
4. Geef het spel een illustratie in `js/games/art.js` en een tint in `css/styles.css` (`.game--mijnspel { --tint: ...; --tint-2: ...; }`, en een donkere variant). Die komen op de kaarten en het startscherm.
5. Wil je dat het spel op de kaart een voortgangsbalk toont? Geef dan bij `ctx.save(state, { progress })` een getal van 0 tot 1 mee.
6. Schrijf een test voor de logica in `tests/` (zie de engines van de bestaande spellen).
7. Draai `npm run build` om `dist/puzzelplaats.html` te verversen.

Dat is alles: de kaart in "Spellen", de uitlegpagina, de niveaukeuze, bewaren van voortgang, "Verder spelen", het felicitatiescherm en de puzzel van de dag werken vanzelf.

## Afspraken voor spellen

- Teken alleen in `container`; de rest van de pagina is van het platform.
- Roep `ctx.save(state)` aan na **elke** zet. Zo is "Terug" altijd veilig.
- Maak de puzzel uit `ctx.seed` en `ctx.difficulty`: zelfde seed = zelfde puzzel. Voor de puzzel van de dag is de seed de datum, dus iedereen krijgt dezelfde.
- Roep `ctx.complete(result)` aan als het spel klaar is. Met `{ title, text, joy }` kun je een eigen slotbericht meegeven (Woordtuin zegt "Gewonnen!" of "Mooi gespeeld!"); zonder zegt het platform "Goed gedaan!".
- Geef elk spel een **Ongedaan maken**-knop, zodat niets onherstelbaar is.
- Gebruik de bestaande knopstijlen (`btn`, `btn-primary`) en `rem`-eenheden; tikvlakken minimaal 3rem. Raster-vakjes mogen compacter, maar liefst niet kleiner dan 2,5rem.
- Geen tijdsdruk, geen geluid dat vanzelf start, geen flitsende animaties.
- Tekst in gewoon Nederlands.


De drie spellen in `js/games/` zijn de voorbeelden: `engine.js` bevat alleen logica (met tests in `tests/`), het andere bestand het scherm. Een spel mag een functie teruggeven uit `mount` om op te ruimen (de kruiswoordpuzzel doet dat voor zijn toetsenbord).

## Een spel voor twee spelers

Woordtuin is ook het voorbeeld voor spelen **tegen een vriend**: de regels staan in een gewone module (`js/games/woordtuin/engine.js`) die zowel de app als de server gebruikt; de server heeft er een dun bestand voor (`server/games/woordtuin.mjs`) en het scherm (`paneel.js`) is hetzelfde voor spelen tegen de computer en tegen een vriend. Zie [`ACCOUNTS.md`](ACCOUNTS.md) voor het contract en [`NIEUW-SPEL-VOOR-TWEE.md`](NIEUW-SPEL-VOOR-TWEE.md) voor de keuzes.
