# Ontwerp van Puzzelplaats

## De flow

```
Start ──► Spellen ──► Spel (uitleg, niveau) ──► Spelen
  │                                               │
  └── "Verder spelen" / "Puzzel van de dag" ──────┘   (één tik)
```

- **Maximaal drie tikken** van Start naar een spel; met een bewaard spel of de puzzel van de dag is het één.
- **Drie vaste menu-onderdelen** onderaan: Start, Spellen, Instellingen. Altijd op dezelfde plek, altijd met pictogram én woord. Hulp zit onder Instellingen en als link op Start.
- **Tijdens het spelen** verdwijnt het menu, zodat je niet per ongeluk wegtikt. "Terug" staat linksboven en is altijd veilig, want de voortgang wordt na elke zet bewaard. Er is dus nooit een "weet je het zeker?"-vraag bij het verlaten van een spel.
- **"Terug" gaat naar een vaste plek** (niet via de browsergeschiedenis), zodat het altijd voorspelbaar is.
- **Eerste keer:** geen aanmelden en geen rondleiding. Op Start staat één kaartje "Is de tekst goed te lezen?" met drie knoppen.
- **Verwoestende acties** (nieuw spel over een bewaard spel heen, alles wissen) vragen eerst om bevestiging. De veilige keuze staat bovenaan en heeft de focus.

## Toegankelijkheid

- Tekst begint op 20px en kan naar 24px en 28px; alles is in `rem`, dus ook de instelling van de browser telt mee. Gecontroleerd dat er geen horizontaal scrollen ontstaat op 320 en 390px breed, bij elke tekstgrootte.
- Tikvlakken minimaal 3,5rem hoog. Geen gebaren nodig (swipen, lang indrukken, slepen).
- Kleur is nooit het enige signaal: gekozen opties hebben een vinkje, het actieve menu-item een balk en vetgedrukte tekst, "aan/uit" staat in woorden.
- Thema's: licht, donker, automatisch, plus een hoog-contrastmodus. "Rustige weergave" zet alle animaties uit (en `prefers-reduced-motion` wordt gevolgd).
- Dikke, goed zichtbare focusrand voor toetsenbordgebruik; "Naar de inhoud"-link; na elke paginawissel gaat de focus naar de kop en leest een schermlezer de nieuwe pagina voor.
- Taal van de interface: gewoon Nederlands, korte zinnen, geen jargon of Engelse termen.
- Geen tijdsdruk, geen verplichte timers, geen flitsende elementen.

## Sudoku: keuzes

- **Niets wordt afgestraft.** Geen foutenteller, geen tijd, geen "game over". Fouten zie je alleen als je op *Controle* tikt (of als een cijfer botst met een ander in dezelfde rij, kolom of blokje). *Stap terug* kan zo vaak als je wilt.
- **Eerlijke moeilijkheid.** Elke puzzel heeft precies één oplossing. Makkelijk en gemiddeld zijn altijd op te lossen met alleen "dit vakje kan maar één cijfer zijn"-logica, dus nooit gokken. Moeilijk heeft minder cijfers vooraf.
- **Zelfde puzzel voor iedereen op een dag.** De puzzel van de dag komt uit de datum; elke puzzel is later opnieuw te maken uit zijn seed.
- **Duidelijk rooster.** Rij, kolom en blokje van het gekozen vakje zijn gemarkeerd, evenals alle gelijke cijfers. Vaste cijfers zijn vetgedrukt, eigen cijfers dun en gekleurd. Fouten krijgen een hoekje en een golflijn, niet alleen een kleur.
- **Grote bediening.** Cijfertoetsen van ruim 3,5rem; cijfers die al 9 keer staan worden gedimd. Potlood staat zichtbaar aan (gestreepte randen, knop ingekleurd, uitleg onder het rooster).
- **Geen tikfouten door klein scherm:** het rooster is zo breed als het scherm; op een breed scherm staat de bediening naast het rooster.
- **Toetsenbord:** pijltjes, 1-9, Backspace, N (potlood), Ctrl+Z.

## Waarom geen framework

Gewoon HTML, CSS en JavaScript-modules. Geen build, geen afhankelijkheden: makkelijk te begrijpen, snel op oude telefoons en later zo in een Android-app (Capacitor) te verpakken.

## Toekomstige functies

Alles staat klaar achter schakelaars in `js/config.js` (`FEATURES`). Staan ze uit, dan ziet de speler er niets van.

| Functie | Wat er al ligt | Wat er nog moet |
|---|---|---|
| Account / Facebook-login | `js/services/auth.js` (contract), scherm `#/account`, rij in Instellingen | Provider kiezen (bijv. Firebase Auth) en `signIn` invullen |
| Voortgang op meer apparaten | `js/store.js` heeft één duidelijke datastructuur | `js/services/sync.js` die die structuur met de server samenvoegt |
| Vrienden | `js/services/social.js` (contract), scherm `#/vrienden`, menu-item | Backend + uitnodigen via e-mail of deelknop |
| Delen van resultaten | `shareResult` in `social.js` | Deelknop op het felicitatiescherm |

Bewust niet gepland: openbare ranglijsten of chat met vreemden.

## Privacy

Nu wordt er niets verstuurd: alles blijft in `localStorage` op het apparaat. Zodra accounts bestaan, hoort er een privacyverklaring bij.
