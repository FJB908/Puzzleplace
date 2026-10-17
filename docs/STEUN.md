# Steun: extra tip met een video en de eenmalige bijdrage

Puzzleplace blijft gratis. Wie wil helpen, kan dat op twee manieren, allebei vrijblijvend:

* **Een video kijken** voor een extra tip. Elk spel met één tip per spel (Sudoku, Mahjong, Patience, Letterhof) geeft één gratis tip. Daarna toont
  de tipknop "Nog een tip" met een opvallend label "Video". Een tik vraagt eerst of je een korte video wilt zien (met "Nee, bedankt" even groot als "Video
  bekijken"); pas een tot het eind bekeken video levert een tip op.
* **Supporter worden**: één keer betalen (geen abonnement). Dan zijn de tips onbeperkt en komt het videoaanbod nooit meer.

De naam is bewust *Supporter* en niet "Vriend": de app heeft al Vrienden (andere spelers).

## Wat zonder internet gebeurt

Geen internet = geen beloning. De speler krijgt een melding met een groot kruis en een sluitkruisje ("Geen internetverbinding", het spel blijft bewaard).
Hetzelfde geldt als er geen video beschikbaar is, de video eerder wordt gestopt of er iets misgaat: nooit een tip zonder afgekeken video. Een video die
niet tot het eind is bekeken is niemands schuld; de tekst zegt dat ("je kunt het altijd opnieuw proberen").

## Rustig beginnen en zelden vragen

* De eerste 7 dagen na het eerste gebruik is er helemaal geen aanbod (`STEUN.rustigeDagen` in `js/config.js`).
* Op Start verschijnt na minstens 7 uitgespeelde spellen een kaartje "Bevalt Puzzelplaats?" met "Hoe werkt dat?" en "Nu niet". Na "Nu niet" wacht het 30 dagen en
  na twee keer komt het niet meer terug (alleen nog via Instellingen → Steun). De regels staan in `js/steun/regels.js` en zijn getest (`tests/steun.test.mjs`).
* De uitlegpagina `#/steun` ("Hoe verdient deze app geld?") vertelt eerlijk wat gratis is en wat video en bijdrage doen.

## Hoe het in de code zit

| Onderdeel | Waar |
|---|---|
| Schakelaars `STEUN.video`, `STEUN.bijdrage` (staan **uit**) | `js/config.js` |
| Regels (rustige dagen, tipstand, kaartje), zonder scherm | `js/steun/regels.js` |
| Vensters (vraag, geen internet, mislukt) | `js/steun/dialogen.js` |
| API voor de spellen: `tipToestemming`, `tipGebruikt`, `tipKnopStand`, `wordSupporter`, `herstelAankoop` | `js/steun/index.js` |
| Aanbieders (stekkers) en testaanbieders | `js/steun/aanbieders.js` |
| Uitlegpagina, link in Instellingen, kaartje op Start | `js/views/steun.js`, `settings.js`, `home.js` |
| Opmaak (label op de tipknop, kruis, testvideo) | `css/steun.css` |
| Teksten (8 talen) | `tools/i18n/bron/210-steun.txt` en `tools/i18n/vertaling/*.txt` |

Een spel gebruikt het zo (zie `js/games/sudoku/sudoku.js`):

```js
if (!(await tipToestemming(state))) return;   // vraagt zo nodig om een video; false = geen tip
...zoek de tip; is er geen, stop dan: er is niets opgegaan...
tipGebruikt(state);                           // legt vast dat de tip echt is gegeven
tipKnopStand(tipKnop, state, spelIsKlaar);    // bij elke verversing van het scherm
```

`state.tip` is de gratis tip, `state.tipTegoed` een met een video verdiende tip die nog niet is gegeven (bijvoorbeeld omdat er toen geen tip te geven was:
de video gaat dan niet verloren). Woordzoeker, Kruiswoord en Woordtuin tegen de computer hebben al onbeperkt tips en doen niet mee. Bij een partij tegen een vriend (Woordtuin) heeft elk 3 gratis tips;
daarna werkt het hetzelfde: "Nog een tip" met een video (`js/games/woordtuin/paneel.js`, via `extraTip`). Een met een video verdiende tip blijft staan tot hij gebruikt is.

## Uitproberen (testmodus)

Alleen op `localhost`: open `http://localhost:8000/?steuntest=1`. Er komen een nepvideo (4 seconden; `?steuntest=snel` is een halve seconde) en een nepaankoop,
en geen rustige eerste week (`?steuntest=week` houdt die wel). Offline testen kan met de browser (Netwerk → Offline). Op een echt adres doet `?steuntest` niets.

## Wat er nog moet gebeuren voor de echte app

De schakelaars blijven uit tot dit klaar is. De app praat alleen met twee kleine aanbieders (`zetAanbieders` in `js/steun/aanbieders.js`):

1. **Accounts**: Google Play-ontwikkelaarsaccount (identiteit geverifieerd), AdMob-account met uitbetalingsgegevens, en in de Play Console een eenmalig product
   "Supporter van Puzzleplace".
2. **Aanbieders in de Android-app** (Capacitor-plugins): een videoaanbieder (AdMob beloonde video: `voorlaad` laadt hem vooraf, `toon` geeft `'beloond'` pas na het eind;
   zonder netwerk een `SteunFout('offline')`) en een aankoopaanbieder (Play Billing: `prijs`, `koop`, `herstel`). Registreer ze bij het opstarten en zet daarna
   `STEUN.video` en `STEUN.bijdrage` aan. Testen met de testadvertenties van Google, nooit met echte.
3. **Advertentie-instellingen**: in AdMob de gevoelige categorieën blokkeren (gokken, dating, afvallen, leningen, gezondheidsclaims, crypto) en de maximale
   inhoudsclassificatie op "algemeen" zetten.
4. **Toestemming**: in de EU is een toestemmingsscherm (Google UMP) verplicht voordat advertenties worden geladen. Wie weigert, krijgt niet-gepersonaliseerde
   advertenties of geen aanbod.
5. **Privacy**: de privacytekst en het Play Data safety-formulier aanpassen (advertentie-ID). Er staat nu nergens "geen tracking" in de app; houd dat zo.
6. **Aankoop terughalen**: bij het opstarten de Play-aankoop controleren (`herstel`), zodat een nieuw toestel of een nieuwe installatie Supporter blijft.
   De status staat lokaal in `steun.supporter` (`js/store.js`); die gaat niet mee met synchroniseren en blijft bij "Alles wissen" bewaard.
