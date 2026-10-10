# Een spel voor twee, met beurten: voorstel

**Opdracht:** een spel dat je met een vriend(in) speelt, om beurten (dus ook als jullie niet tegelijk online zijn),
in de geest van Wordfeud, maar niet hetzelfde. Het past bij Puzzelplaats: rustig, geen tijdsdruk, geen straf, voor alle leeftijden.

## Waarom niet gewoon een Wordfeud

Wordfeud draait om *letters leggen*: je krijgt zeven steentjes, bedenkt het woord met de hoogste score en hoopt op goede letters.
Dat vraagt kennis van korte rare woorden, beloont handig rekenen met puntenwaarden, en voelt voor veel mensen als examen. Wij hebben iets
dat Wordfeud niet heeft: **puzzels die al kloppen en al mooi zijn** (omschrijvingen, rasters, thema's). Een spel voor twee moet
daar op voortbouwen, dan voelt het als "Puzzelplaats, maar samen".

Eisen die we onszelf stellen:

1. Elke beurt duurt een minuut of twee. Daarna leg je de telefoon neer en komt het bericht later.
2. Niemand wordt gestraft. Een mis is gewoon een beurt zonder punt.
3. Je hoeft niets te weten dat een ander niet kan leren: kennis helpt, maar het is geen examen.
4. Winnen en verliezen mogen zacht: geen ranglijst met vreemden, alleen "jullie staan 3–2".
5. Geen "pass-spam" of wachten tot de ander opgeeft: een partij is altijd af te maken of rustig te stoppen.

## Aanbeveling: **Kruisduel** (bouw dit eerst)

Eén kruiswoordraster voor twee. Jullie lossen het samen op, om beurten, maar elk woord dat je goed invult is *van jou*. Wie
aan het eind de meeste letters heeft, wint.

### Zo gaat een partij

1. **Uitnodigen.** Kies een vriend en een niveau (Makkelijk, Gemiddeld, Moeilijk). De server maakt een raster met onze bestaande
   engine (8 tot 16 woorden).
2. **Je beurt.** Je ziet het raster met de woorden die al zijn ingevuld, in jouw kleur of die van je vriend. Tik een nog open
   omschrijving, typ je antwoord op het grote toetsenbord en druk op "Dit is mijn antwoord".
3. **Goed?** Het woord wordt van jou, de letters kleuren in en je krijgt de punten (één per letter). Een rustige bloesem-animatie, zoals nu.
   **Niet goed?** Dan schuift het antwoord niet in het raster; je krijgt een vriendelijke melding en de beurt gaat naar de ander.
4. **Vastgelopen?** Kies in plaats van raden **"Een letter verklappen"**: één letter van dat woord komt in het raster (voor
   beiden zichtbaar), en de beurt gaat naar de ander. Niemand zit dus ooit vast en je hoeft nooit te passen met niets.
5. **Einde.** Als alle woorden zijn ingevuld, ziet iedereen de uitslag ("Anna 31, Bram 27, goed gespeeld!") en kunnen jullie meteen een nieuwe starten.
   "Stoppen" kan altijd, zonder verlies voor wie dan ook.

### Wat het leuk maakt

- **Kruisingen zijn cadeautjes én risico's.** Een goed woord geeft de ander letters voor de woorden die erdoorheen lopen. Zal ik dit
  woord nu nemen, of eerst een ander dat de ander weinig helpt? Eenvoudige regels, echte keuzes.
- **Elke omschrijving is anders.** De een weet de bloem, de ander de rivier. Niemand wint altijd.
- **Het is samen.** Het raster wordt langzaam vol; na afloop hebben jullie samen één kruiswoord opgelost.
- **Niveau per partij**, dus een kleinkind en opa spelen op Makkelijk, twee puzzelaars op Moeilijk.

### Regels in één oogopslag

| | |
|---|---|
| Spelers | 2 (vrienden) |
| Zet | 1 antwoord, óf 1 letter verklappen |
| Punten | 1 per letter van een goed woord; letters die er al staan tellen niet nog eens |
| Fout antwoord | Geen punten, beurt gaat door. Geen aftrek. |
| Einde | Alle woorden ingevuld. Meeste punten wint; gelijk is gewoon gelijk. |
| Herinnering | Na 3 dagen zacht bericht in de app; na 30 dagen eindigt een partij zonder uitslag |
| Gelijktijdig lopende partijen | max. 20 (limiet zit al in de server) |

### Hoe het technisch past (weinig nieuws nodig)

- Server en vriendschappen, beurtbewaking, versies en het `matches`-systeem **bestaan al** (`docs/ACCOUNTS.md`).
- **Regels** (`server/games/kruisduel.mjs`): `create` kiest een zaad en roept `generate(seed, level)` uit
  `js/games/kruiswoord/engine.js` aan; de oplossing blijft in `secret`, het raster zonder letters gaat in `pub`. `apply` controleert het antwoord
  tegen de oplossing, verdeelt punten, verklapt letters, bepaalt wie nu aan de beurt is en wanneer het klaar is.
  Geen nieuwe engine nodig, de bestaande is deterministisch en getest.
- **Scherm** (`js/views/kruisduel.js`): hergebruikt het raster en het toetsenbord van de Kruiswoordpuzzel; het raster krijgt per
  woord een eigenaar (twee kleuren, **plus** een kenmerk dat niet van kleur afhangt: jouw letters dik, die van je vriend gewoon; voor kleurenblinden).
- **Partijenlijst** komt op *Vrienden* onder elke vriend: "Bram is aan de beurt" / "Jij bent aan de beurt". Het getal op het menu-item bestaat al.
- **Vers houden:** het scherm vraagt elke 20 s `?since=<versie>` en krijgt `unchanged`, dus bijna geen verkeer.
- **Tests:** regels met een vast zaad: punten, beurtwissel, verklappen, einde, gelijkspel, ongeldige invoer, en een
  hele partij door twee scripts tot het eind gespeeld.
- **Eerlijk spel:** de oplossing verlaat de server nooit; per beurt één poging, dus raden in bulk kost steeds een beurt.

### Wat er nog niet is en dus mee moet

- Meldingen als de app dicht is (web push). Eerst alleen in de app zelf (het getal bij Vrienden); push is een vervolgstap.
- Een korte uitleg in *Hulp* en één proefpartij tegen de computer, zodat je de regels leert zonder een vriend nodig te hebben.

## Alternatief 1: **Zoekduel** (het snelst te bouwen, geen typen)

Hetzelfde idee met een woordzoeker: één raster, één woordenlijst. Op je beurt veeg je **één** woord uit de lijst; dat is dan van jou
(punten = lengte). Wie de meeste heeft als de lijst leeg is, wint.

- Past het best bij mensen die liever vegen dan typen en bij kleine schermen.
- Keuzes: pak je meteen het lange woord dat je ziet, of wacht je op de ander? Maar de ander kan het ook zien, dus er zit rustige spanning in.
- Bouw: bijna niets nieuws (`js/games/woordzoeker/engine.js` doet alles; de server bewaart alleen wie wat vond).
- Minder diepgang dan Kruisduel; goed als eerste "kennismakingsspel" voor wie niet van kruiswoorden houdt.

## Alternatief 2: **Bloeihokjes** (zonder taal, puur strategie)

Het bekende "puntjes en hokjes" in onze stijl: een tuintje van 5×5 bloembedden. Elke beurt trek je één lijn tussen twee punten.
Maak je het vierde streepje van een bed, dan bloeit het in jouw kleur en mag je nog een keer. Wie de meeste bloemen heeft wint.

- Iedereen kent het, in één minuut uitgelegd, geen woordenschat nodig, ook voor wie Nederlands niet de eerste taal is.
- Echte strategie (hoe je de ander dwingt je een bed te gunnen), maar altijd vriendelijk van toon.
- Bouw: eigen, kleine regels (≈100 regels) en een eigen bord. Geen bestaande engine om te hergebruiken, wel het eenvoudigst te testen.

## Meer ideeën

| Spel | Idee in één zin | Taal / typen | Geluk ↔ vaardigheid | Bouwen |
|---|---|---|---|---|
| **Samen puzzelen** | Jullie lossen één Sudoku, woordzoeker of kruiswoord *samen* op, om beurten (geen winnaar) | Als het spel zelf | geen strijd | Klein: bestaande engines + beurtsysteem |
| **Geheugenduel** | Open om beurten twee kaartjes met bloemen en dieren; een paar mag je houden en je mag nog eens | Geen | Geheugen, beetje geluk | Klein |
| **Domino** | Het bekende spel met stenen, eigen stenen verborgen voor de ander | Geen | Beide | Middel (verborgen stenen zitten al in `secret`) |
| **Raadduel** | Eén verborgen woord van 5 letters; om beurten een gok, de letterkleuren zien beiden | Typen, kort | Vaardigheid | Klein (woordenlijst + engine van de zoeker) |
| **Sudokuduel** | Eén sudoku; per beurt zet je één cijfer, een goed cijfer is een punt | Geen | Vaardigheid | Klein (engine bestaat) |
| **Vier op een rij** | Laat om beurten een bloem vallen; vier op een rij wint | Geen | Vaardigheid | Klein |
| **Kleurencode** | Jullie raden elk elkaars geheime rij kleuren (Mastermind); wie het eerst raadt wint | Geen | Vaardigheid | Klein |

**Samen puzzelen** springt eruit. Het is geen nieuw spel maar een *manier van spelen* die bij alle bestaande spellen past, en het
beantwoordt aan iets wat ouderen vaak willen: dingen doen met kleinkinderen en vrienden zónder wedstrijd. Elk om beurten maximaal drie
cijfers of woorden, en een paar vaste vriendelijke berichtjes ("Mooi!", "Zullen we samen kijken?"), geen vrij typen of chatten.

**Geheugenduel en Domino** zijn de beste spellen zonder taal, bekend bij iedereen en in een halve minuut uit te leggen.
**Raadduel** is hetzelfde idee als Kruisduel in klein: elke gok helpt ook de ander.

## Wat ik zou doen

1. **Kruisduel** als eerste: sluit het best aan op wat we al hebben en op wie we bedienen (puzzelaars), en laat zien dat "samen" meer is dan een scorebord.
2. **Samen puzzelen** daarna: kost weinig en geldt meteen voor alle bestaande spellen.
3. **Geheugenduel** of **Domino** als spel zonder taal, **Zoekduel** voor wie niet van typen houdt.

Alle drie draaien op hetzelfde `matches`-systeem, dus elk volgend spel is vooral regels en een scherm.
