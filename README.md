# Puzzelplaats

Een rustig platform om puzzelspellen te spelen (sudoku, woordzoeker, kruiswoordpuzzels, ...),
ontworpen voor ouderen: grote letters, duidelijke knoppen en een zo simpel mogelijke opzet.

**Status:** het platform staat. De spellen zelf komen er daarna in (zie `docs/SPEL-TOEVOEGEN.md`).

## Uitproberen

Geen installatie of buildstap nodig, alleen een simpele webserver:

```bash
python3 -m http.server 8000
# open http://localhost:8000
# met voorbeeldspel om de hele flow te testen:  http://localhost:8000/?demo=1
```

(Openen via `file://` werkt niet, omdat de browser dan geen JavaScript-modules laadt.)

## Wat zit erin

| Onderdeel | Waar |
|---|---|
| Schermen: Start, Spellen, Spel, Spelen, Instellingen, Hulp | `js/views/` |
| Register van spellen (hier komt elk nieuw spel bij) | `js/games/registry.js` |
| Opslag op het apparaat (voortgang, instellingen) | `js/store.js` |
| Stijl, thema's, tekstgroottes | `css/styles.css` |
| Toekomstige functies (accounts, vrienden, Facebook) | `js/config.js` + `js/services/` |
| Installeerbaar op het beginscherm + offline | `manifest.webmanifest`, `sw.js` |

Meer uitleg: [`docs/ONTWERP.md`](docs/ONTWERP.md) (waarom het zo is opgezet) en
[`docs/SPEL-TOEVOEGEN.md`](docs/SPEL-TOEVOEGEN.md).
