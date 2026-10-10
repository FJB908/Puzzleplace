# Puzzelplaats

Een rustig platform om puzzelspellen te spelen (sudoku, woordzoeker, kruiswoordpuzzels, ...),
ontworpen voor ouderen: grote letters, duidelijke knoppen en een zo simpel mogelijke opzet.

**Status:** het platform staat met drie spellen, elk in vier niveaus (tot en met Extreem): **Sudoku** (levens, meteen zien als iets fout is, notities, tip), **Woordzoeker** (thema's, tikken of slepen, markeerstift) en **Kruiswoordpuzzel** (vrije puzzel met omschrijvingen en een groot toetsenbord). Elk spel heeft een puzzel van de dag.

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
npm test           # test de engines van alle spellen en de versiering
npm run build      # maakt dist/puzzelplaats.html opnieuw (doe dit na elke wijziging)
node tools/make-blossoms.mjs   # tekent de bloesemtakken opnieuw (seeds staan bovenin het bestand)
PREVIEW=/tmp/tak node tools/make-blossoms.mjs boog   # 6 varianten van één ontwerp om uit te kiezen
```

## Wat zit erin

| Onderdeel | Waar |
|---|---|
| Schermen: Start, Spellen, Spel, Spelen, Instellingen, Hulp | `js/views/` |
| Register van spellen (hier komt elk nieuw spel bij) | `js/games/registry.js` |
| Sudoku (engine + scherm + stijl) | `js/games/sudoku/`, `css/games/sudoku.css` |
| Woordzoeker (woordenlijsten, engine, scherm, stijl) | `js/games/woordzoeker/`, `css/games/woordzoeker.css` |
| Kruiswoordpuzzel (350 woorden met omschrijving, engine, scherm, stijl) | `js/games/kruiswoord/`, `css/games/kruiswoord.css` |
| Illustraties per spel (voor kaarten en startschermen) | `js/games/art.js` |
| Opslag op het apparaat (voortgang, instellingen) | `js/store.js` |
| Stijl, thema's, tekstgroottes | `css/styles.css` |
| Kersenbloesem-versiering (7 ontwerpen, gegenereerd) | `js/decor/`, `assets/`, `tools/make-blossoms.mjs` |
| Effecten (vallende blaadjes, rimpel, bloesemexplosie) | `js/effects.js` |
| Toekomstige functies (accounts, vrienden, Facebook) | `js/config.js` + `js/services/` |
| Installeerbaar op het beginscherm + offline | `manifest.webmanifest`, `sw.js` |

Meer uitleg: [`docs/ONTWERP.md`](docs/ONTWERP.md) (waarom het zo is opgezet) en
[`docs/SPEL-TOEVOEGEN.md`](docs/SPEL-TOEVOEGEN.md).
