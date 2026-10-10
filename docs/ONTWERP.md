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

- Tekst begint op 20px en kan naar 24px en 28px; alles is in `rem`, dus ook de instelling van de browser telt mee. Gecontroleerd dat er geen horizontaal scrollen ontstaat op 320, 390 en 768px breed, bij elke tekstgrootte.
- Tikvlakken minimaal 3,5rem hoog. Geen gebaren nodig (swipen, lang indrukken, slepen).
- Kleur is nooit het enige signaal: gekozen opties hebben een vinkje, het actieve menu-item een balk en vetgedrukte tekst, "aan/uit" staat in woorden.
- Thema's: licht, donker, automatisch, plus een hoog-contrastmodus. "Rustige weergave" zet alle animaties uit (en `prefers-reduced-motion` wordt gevolgd).
- Dikke, goed zichtbare focusrand voor toetsenbordgebruik; "Naar de inhoud"-link; na elke paginawissel gaat de focus naar de kop en leest een schermlezer de nieuwe pagina voor.
- Taal van de interface: gewoon Nederlands, korte zinnen, geen jargon of Engelse termen.
- Geen tijdsdruk, geen verplichte timers, geen flitsende elementen.

## Uiterlijk

- **Minimalistisch:** knoppen hebben meestal geen kader. Alleen de hoofdactie op een scherm (bijv. "Spel starten") is een gevulde knop; al het andere is tekst met een pictogram. Keuzelijsten zijn rijen met dunne lijnen en een rondje met vinkje rechts. Alleen in "Extra duidelijk" komen de kaders terug.
- **Kersenbloesem, realistisch en per pagina anders.** Zeven getekende ontwerpen: een brede tak vanuit rechtsboven (Spellen en Spel), vanuit linksboven (Instellingen), een volle bloeiende boog (Start), een luchtige spray (Hulp) en drie takjes (hoofdkaart en winscherm). Elke tak heeft schors met textuur en korstmos, jonge bruine en groene blaadjes, knoppen, half geopende en open bloemen met meeldraden, en diepte (bloemen achteraan zijn kleiner en lichter). Alles staat in een eigen strook boven de kop, nooit achter tekst, en aan de onderkant en de zijkant wordt niets afgekapt: de generator laat takken en bloemen ruim binnen de tekening en kort twijgen in als ze er buiten zouden vallen. Alleen waar een tak van buiten het beeld komt (boven en aan één zijkant) wordt hij natuurlijk afgesneden. De tekeningen worden gegenereerd door `tools/make-blossoms.mjs` met een vaste seed (andere seed = ander ontwerp). Elke tak bestaat uit twee lagen: de schors met textuurfilter (wordt één keer getekend) en de bloemen (die bewegen), zodat het filter niet bij elke animatiestap opnieuw wordt berekend. Op apparaten met weinig geheugen of processorkernen gaan het wiegen en de vallende blaadjes vanzelf uit.
- **Beweging en effecten** (allemaal uit bij "Rustige weergave" en als het besturingssysteem minder beweging vraagt):
  - Bij elke pagina gaan de bloemen één voor één open, daarna wiegt de tak heel zachtjes. Bij een andere pagina wisselt de tak met een korte overgang.
  - De onderdelen van een pagina schuiven na elkaar in; pagina's lopen zacht in elkaar over (View Transitions waar de browser dat kan).
  - Heel subtiele, kleine en langzame vallende blaadjes op de achtergrond (zeven stuks, alleen CSS-beweging, bewust zo licht dat ze de tekst nooit storen).
  - Gevulde knoppen krijgen een zachte rimpel; rijen, tegels, keuzerondjes en het menu reageren met een kleine beweging; de bloesem boven het gekozen menu-onderdeel gaat open.
  - Dialogen zweven erin en uit; het winscherm heeft een bloeiend takje.
  - Sudoku: een goed cijfer "plopt" in het vakje, een fout cijfer schudt, een voltooide rij, kolom of blokje laat een golf van licht lopen met opspattende blaadjes, een verloren leven (bloesem) valt uiteen in blaadjes, en bij winnen licht het rooster op en regent het blaadjes.
- **Kleuren:** gebroken wit, donkerblauwgroen voor acties, roze/roos als accent. Licht, donker en hoog contrast.

## Start, Spellen en spelstart

- **Start:** de datum en een begroeting, daarna één hoofdkaart. Heb je een spel bezig, dan toont die kaart het plaatje van dat spel, het niveau, hoe lang geleden, een voortgangsbalk met een meerijdende bloesem en "Verder spelen". Anders: "Kies een spel". Daaronder de puzzel van de dag op een afscheurkalender, en alle spellen als tegels met een eigen illustratie. De hoofdactie staat op een gewone telefoon zonder scrollen in beeld.
- **Spellen:** elk spel is een grote kaart met een getekende illustratie op een eigen tint, een korte uitleg en jouw stand ("Bezig · 44%", "3 keer opgelost"). De kaart reageert op aanraken met een kleine beweging.
- **Spelstart:** boven in een groot plaatje, dan de niveaukeuze, dan "Zo werkt het", en onderaan altijd zichtbaar de knop "Spel starten" of "Verder spelen". Het niveau kies je met kaarten met **bloesems**: meer bloesems is moeilijker. De gekozen kaart krijgt een roze rand en een vinkje (dus niet alleen kleur). Heb je een spel bezig, dan staat het niveau vast; "Nieuw spel" laat je opnieuw kiezen.
- **Zwevend menu** onderaan met een bloesem boven de gekozen pagina; het menu verdwijnt tijdens het spelen.
- **Compacte spelkop:** Terug en Uitleg op één regel, de naam en het niveau op de regel daaronder. Zo blijft er zoveel mogelijk ruimte voor het spel.

## Woordzoeker: keuzes

- **Thema per puzzel** (bloemen, in de tuin, het weer, ...): de woorden hebben een rode draad en zijn prettiger om te zoeken. 15 thema's met ruim 20 woorden elk.
- **Vier niveaus:** 8x8 met 6 woorden en alleen rechtdoor en naar beneden, tot 13x13 met 15 woorden in alle acht de richtingen (ook achterstevoren en schuin omhoog).
- **Kiezen zonder gevoelige bewegingen:** tik op de eerste en dan op de laatste letter. De tweede tik hoeft niet precies te zijn; de dichtstbijzijnde rechte lijn wordt gekozen. Met een muis kan je ook slepen. Met het toetsenbord: pijltjes en Enter.
- **Geen straf.** Een misser geeft een zachte melding en kost niets. Wel een duidelijke beloning bij elk gevonden woord: een markeerstift in een van zes zachte kleuren die zich tekent, een golf van licht over de letters, opspattende blaadjes, het woord wordt doorgestreept met een gekleurd bolletje, en een bloesem rijdt mee op de voortgangsbalk. Is het laatste woord gevonden, dan lichten rooster en blaadjes op.
- **Een woord telt als het op de lijn staat**, niet alleen op de plek waar de puzzel het neerzette; komt een woord toevallig twee keer voor, dan zijn beide goed. Woorden die in elkaar zitten (zoals KOE en KOEK) komen nooit samen in één puzzel.
- **Tip:** tik op een woord in de lijst (of op "Tip") en het eerste vakje van dat woord gaat pulseren.

## Kruiswoordpuzzel: keuzes

- **Vrije puzzel**: woorden kruisen elkaar zonder zwarte vakken, de vorm is dus meteen te zien. De generator bouwt het rooster uit 350 woorden met omschrijving en probeert tot 40 keer; er geldt dat woorden elkaar alleen mogen kruisen (nooit naast elkaar liggen), zodat elke reeks letters in het rooster precies een woord is. Dat wordt voor elke puzzel gecontroleerd en in de tests.
- **Vier niveaus:** 8 woorden met alleen bekende woorden, tot 22 woorden dicht op elkaar in 13x13.
- **Omschrijving en toetsenbord altijd in beeld:** bovenaan het rooster blijft de omschrijving staan (met pijlen naar de vorige en volgende), onderaan een groot toetsenbord. Je kunt ook met je eigen toetsenbord typen. Tik nog eens op een vakje om te wisselen tussen horizontaal en verticaal.
- **Meteen feedback per woord, geen straf:** is een woord vol en goed, dan licht het op, krijg je een beloning en spring je door naar het volgende woord. Is het fout, dan schudt het even met een vriendelijke melding. Er is geen "controle"-knop nodig.
- **Tip** onthult één letter, **Woord** het hele woord. Onthulde letters worden roze en staan vast.
- **IJ komt niet voor** in de woorden (die zou twee vakjes beslaan).

## Sudoku: keuzes

- **Fout zie je meteen.** Zodra je een verkeerd cijfer invult, kleurt het vakje rood (met een rood hoekje en een golflijntje, dus niet alleen kleur), schudt het rooster even en gaat er een leven af. Er is geen "Controle"-knop.
- **Levens zijn bloesems:** Makkelijk 5, Gemiddeld 4, Moeilijk en Extreem 3. Een lege bloesem is een verloren leven. Zijn ze op, dan kies je: opnieuw proberen met dezelfde puzzel, of een andere puzzel.
- **Wat kost geen leven:** notities (potlood), wissen, een tip, en een fout cijfer weghalen. "Stap terug" geeft een verloren leven *niet* terug.
- **Vier niveaus.** Elke puzzel heeft precies één oplossing. Makkelijk en gemiddeld zijn op te lossen met alleen "dit vakje kan maar één cijfer zijn"-logica. Moeilijk heeft 26 tot 28 cijfers vooraf. Extreem heeft 22 tot 24 cijfers en is nooit met alleen die logica op te lossen.
- **Zelfde puzzel voor iedereen op een dag.** De puzzel van de dag komt uit de datum; elke puzzel is opnieuw te maken uit zijn seed.
- **Duidelijk rooster.** Rij, kolom en blokje van het gekozen vakje zijn gemarkeerd, evenals alle gelijke cijfers. Vaste cijfers zijn vetgedrukt, eigen cijfers dun en gekleurd.
- **Grote bediening zonder kaders:** cijfertoetsen van ruim 3,5rem hoog; cijfers die al 9 keer goed staan worden gedimd. Potlood staat zichtbaar aan (roze cijfers, knop ingekleurd, uitleg onder het rooster).
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
