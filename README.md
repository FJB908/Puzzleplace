# Puzzelplaats

Een rustig platform om puzzelspellen te spelen (sudoku, woordzoeker, kruiswoordpuzzels, ...),
ontworpen voor ouderen: grote letters, duidelijke knoppen en een zo simpel mogelijke opzet.

**Status:** het platform staat en **Sudoku** is speelbaar (3 niveaus, notities, tip, controle, ongedaan maken, puzzel van de dag). Woordzoeker en kruiswoordpuzzel volgen.

## Uitproberen

**Het snelst:** open `dist/puzzelplaats.html` door er op te dubbelklikken. Dat is één los bestand met alles erin
(gemaakt met `npm run build`), dus geen webserver nodig.

**Tijdens het ontwikkelen**, met een simpele webserver:

```bash
python3 -m http.server 8000
# open http://localhost:8000
# met voorbeeldspel om de hele flow te testen:  http://localhost:8000/?demo=1
```

(`index.html` rechtstreeks openen werkt niet: de browser blokkeert dan JavaScript-modules. Gebruik daarvoor het
losse bestand hierboven of de webserver.)

```bash
npm install        # eenmalig, alleen nodig voor de build
npm test           # test de sudoku-engine (unieke oplossing, moeilijkheid, snelheid)
npm run build      # maakt dist/puzzelplaats.html opnieuw (doe dit na elke wijziging)
```

## Wat zit erin

| Onderdeel | Waar |
|---|---|
| Schermen: Start, Spellen, Spel, Spelen, Instellingen, Hulp | `js/views/` |
| Register van spellen (hier komt elk nieuw spel bij) | `js/games/registry.js` |
| Sudoku (engine + scherm + stijl) | `js/games/sudoku/`, `css/games/sudoku.css` |
| Opslag op het apparaat (voortgang, instellingen) | `js/store.js` |
| Stijl, thema's, tekstgroottes | `css/styles.css` |
| Toekomstige functies (accounts, vrienden, Facebook) | `js/config.js` + `js/services/` |
| Installeerbaar op het beginscherm + offline | `manifest.webmanifest`, `sw.js` |

Meer uitleg: [`docs/ONTWERP.md`](docs/ONTWERP.md) (waarom het zo is opgezet) en
[`docs/SPEL-TOEVOEGEN.md`](docs/SPEL-TOEVOEGEN.md).
