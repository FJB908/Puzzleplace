# Een spel toevoegen

1. Maak `js/games/mijnspel.js` en exporteer `mount(container, ctx)`. Begin met een kopie van `js/games/demo.js`; daar staat uitgelegd wat `ctx` bevat.
2. Zet in `js/games/registry.js` bij het spel `status: 'ready'` en `load: () => import('./mijnspel.js')`.

Dat is alles: de kaart in "Spellen", de uitlegpagina, de niveaukeuze, bewaren van voortgang, "Verder spelen", het felicitatiescherm en de puzzel van de dag werken vanzelf.

## Afspraken voor spellen

- Teken alleen in `container`; de rest van de pagina is van het platform.
- Roep `ctx.save(state)` aan na **elke** zet. Zo is "Terug" altijd veilig.
- Maak de puzzel uit `ctx.seed` en `ctx.difficulty`: zelfde seed = zelfde puzzel. Voor de puzzel van de dag is de seed de datum, dus iedereen krijgt dezelfde.
- Roep `ctx.complete(result)` aan als het spel klaar is.
- Geef elk spel een **Ongedaan maken**-knop, zodat niets onherstelbaar is.
- Gebruik de bestaande knopstijlen (`btn`, `btn-primary`) en `rem`-eenheden; tikvlakken minimaal 3rem. Raster-vakjes mogen compacter, maar liefst niet kleiner dan 2,5rem.
- Geen tijdsdruk, geen geluid dat vanzelf start, geen flitsende animaties.
- Tekst in gewoon Nederlands.
