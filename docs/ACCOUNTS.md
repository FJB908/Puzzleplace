# Accounts, vrienden en spelen met beurten

Dit document legt uit hoe de server werkt, hoe je hem start en hoe je er een spel voor twee spelers aan hangt.
De app werkt ook **zonder** server: dan zie je geen account en geen Vrienden-menu en blijft alles op het apparaat.

## Starten

```bash
npm run server                # http://127.0.0.1:8000 (de app én de API)
PORT=3000 HOST=0.0.0.0 DATA_DIR=/var/lib/puzzelplaats node server/index.mjs
```

Geen pakketten nodig (alleen Node 20+). De server dient ook de app zelf, dus `http://localhost:8000` is alles.

| Variabele | Betekenis |
|---|---|
| `PORT`, `HOST` | Waar hij luistert (standaard 127.0.0.1:8000; zet `HOST=0.0.0.0` om van buiten bereikbaar te zijn) |
| `DATA_DIR` | Waar `db.json` komt (standaard `server/data/`, staat in `.gitignore`) |
| `TRUST_PROXY=1` | Zet dit aan als er een proxy voor staat (nginx, Caddy, ...) die `X-Forwarded-For` meegeeft. Anders tellen de limieten per proxy in plaats van per bezoeker. |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `PUBLIC_URL` | Alle drie instellen om "Doorgaan met Facebook" aan te zetten, zie *Inloggen met Facebook* hieronder. `PUBLIC_URL` is het adres waarop mensen de app openen (bijv. `https://puzzelplaats.nl`, zonder `/` erachter). |
| `ALLOW_ORIGIN` | Alleen nodig als de app op een ánder adres staat dan de server (bijv. `https://mijnapp.nl`). Zet dan hetzelfde adres in `API_BASE` in `js/config.js`. |

**Draai hem altijd achter HTTPS** (Caddy of nginx met een certificaat). Wachtwoorden en sleutels gaan anders onbeschermd over de lijn.

**Back-up:** kopieer `db.json` (veilig tijdens draaien: er wordt atomisch naar geschreven). **Schaal:** één bestand is prima tot enkele duizenden accounts. Daarboven vervang je `server/db.mjs` door een echte database; de rest praat alleen met `db.data` en `db.save()`.

## Hoe aanmelden werkt (en waarom)

- **Inloggen met e-mailadres + wachtwoord.** Er wordt geen e-mail verstuurd (er is geen mailserver). Het adres is alleen een unieke inlognaam en wordt aan niemand getoond.
- **Herstelcode** (`XXXX-XXXX-XXXX`) voor wie het wachtwoord vergeet. Die krijg je bij het aanmelden, op een scherm waar je hem kunt kopiëren of printen. Hij is op de server alleen als hash bekend, wordt na gebruik vervangen en alle andere apparaten worden dan uitgelogd. Onder *Account* kun je een nieuwe laten maken.
- **Wachtwoord:** minstens 8 tekens; de app kan drie woorden voorstellen ("brug-lente-kaars"), makkelijker te onthouden en langer dan wat de meeste mensen zelf bedenken.
- Wachtwoorden en herstelcodes: scrypt met eigen zout. Sleutels: 32 willekeurige bytes, alleen als sha256 opgeslagen, 90 dagen geldig vanaf laatste gebruik.
- Limieten (per adres en per e-mailadres) tegen raden: aanmelden 10/uur, inloggen 30 per 15 min (8 per e-mailadres), herstellen 10/uur, code opzoeken 30/uur.

## Vrienden

Je voegt iemand alleen toe met **zijn of haar vriendencode** (`XXXX-XXXX`, zonder I, L, O, 0 en 1 zodat niets verward wordt) of via een link (`#/vrienden/toevoegen/CODE`). Er is geen zoeken op naam, dus geen vreemden. Een verzoek moet worden geaccepteerd; sturen twee mensen elkaar tegelijk een verzoek, dan zijn ze meteen vrienden. De code is te vernieuwen. Een vriend ziet alleen je voornaam en de dag dat je laatst online was, nooit je e-mailadres of code. Maximaal 200 vrienden en 25 openstaande verzoeken.

## Voortgang op meer apparaten

`js/services/sync.js` voegt de lokale voortgang samen met die op de server (`GET/PUT /api/sync`, met `baseVersion`; bij een gelijktijdige wijziging krijgt de client de nieuwste stand terug en voegt opnieuw samen). De samenvoeglogica staat in `js/shared/merge.js` (hoogste aantal gespeeld, nieuwste puzzel van de dag, nieuwste lopende puzzel per spel) en heeft eigen tests. Instellingen (tekstgrootte enz.) horen bij het apparaat en worden niet gesynchroniseerd.

## Privacy (AVG)

Wat de server bewaart: voornaam, e-mailadres, (bij Facebook) je Facebook-id, gehashte wachtwoorden/codes, vriendschappen, voortgang, partijen. *Account verwijderen* wist alles direct (in partijen blijft alleen "verwijderd" staan, voor de tegenspeler). Er zijn geen cookies, geen advertenties en geen derden. Zet er een privacyverklaring bij voordat je live gaat.

## API in het kort

Alles onder `/api`, JSON, sleutel als `Authorization: Bearer ...`. Fouten: `{ error: { code, key, params, message } }`. `key` (en `params`) verwijzen naar een tekst in het taalpakket (`err.<key>` in `tools/i18n/bron/90-errors.txt`), zodat de app de melding in de taal van de speler toont; `message` is dezelfde tekst in het **Engels** (voor wie geen vertaling heeft of de API rechtstreeks gebruikt).

| | |
|---|---|
| `POST /signup`, `/login`, `/recover`, `/logout` | Aanmelden, inloggen, nieuw wachtwoord met herstelcode |
| `GET /auth/facebook/start`, `GET /auth/facebook/callback`, `POST /auth/facebook/claim` | Inloggen met Facebook (alleen als de server een Facebook-app kent; `GET /ping` meldt `facebook: true`) |
| `GET/PATCH/DELETE /me` | Jezelf bekijken (met `counts`: `incoming`, `yourTurn`), voornaam wijzigen, account verwijderen |
| `POST /me/password`, `/me/code`, `/me/recovery` | Wachtwoord wijzigen, nieuwe vriendencode, nieuwe herstelcode |
| `GET /users/by-code/:code` | Wie hoort bij deze code? (alleen de naam) |
| `GET /friends`, `POST /friends/request`, `POST /friends/:id/accept` / `decline`, `DELETE /friends/:id` | Vrienden |
| `GET/PUT /sync` | Voortgang |
| `POST /matches`, `GET /matches`, `GET /matches/:id?since=N`, `POST /matches/:id/move`, `POST /matches/:id/resign` | Partijen met beurten |

De logica staat los van HTTP in `server/api.mjs` (`createApi(...).handle(...)`), zodat de tests (`tests/server.test.mjs`) hem zonder netwerk kunnen aanroepen.

## Test-vrienden

Zonder echte mensen kun je Start, Vrienden en een partij toch uitproberen met `tools/testvrienden.mjs`: zeven nagebootste vrienden die via de gewone API een vriendverzoek sturen, een partij Woordtuin beginnen en **echt meespelen** (ze reageren op jouw zetten, met een eigen tempo en sterkte).

```bash
npm run server                                                         # in een ander venster
npm run testvrienden -- --code K7P4-QM2X                               # jouw vriendencode (onder Vrienden); jij accepteert de verzoeken zelf
npm run testvrienden -- --email jij@voorbeeld.nl --wachtwoord geheim   # ze zijn dan al je vriend (twee verzoeken blijven openstaan)
npm run testvrienden -- --opruimen                                     # alles weer weg
```

Opties: `--server <adres>` (standaard `http://127.0.0.1:8000`), `--eens` (alleen klaarzetten en stoppen), `--snel` (ze reageren snel). Zonder `--eens` blijft het script draaien en spelen ze mee tot je Ctrl+C drukt. Opnieuw draaien maakt geen dubbele vrienden of partijen. De test-vrienden hebben het adres `naam@test.puzzelplaats.invalid` en wachtwoord `testvriend-123`; draai dit alleen tegen je eigen test-server. Meld je binnen korte tijd heel vaak aan of in, dan zegt de server "Dit gaat te snel": even een kwartier wachten.

## Een spel voor twee spelers toevoegen

De server kent geen enkel spel: hij bewaakt alleen **wie** speelt (vrienden), **wie aan de beurt is** en **de versie** (geen dubbele zetten). De regels zijn één module per spel in `server/games/`, aangemeld in `server/games/index.mjs`. Het voorbeeld is `server/games/woordtuin.mjs`.

```js
export const spelRegels = {
  // (optioneel) maakt van de gekozen instellingen een nette versie; wat hier niet in zit, wordt weggegooid
  config(config) { return { tips: [0, 3].includes(config?.tips) ? config.tips : 0 }; },       // Woordtuin bewaart hier ook de taal van de partij (lang)
  // Nieuwe partij. players = [id, id].
  create({ players, config }) {
    return { pub: { /* wat beide spelers zien */ }, secret: { /* alleen op de server, bijv. de oplossing */ }, turn: players[0] };
  },
  // (optioneel) maak klaar wat het spel nodig heeft, bijvoorbeeld een woordenboek laden; mag async. Daarna zijn create en apply synchroon.
  async prepare({ config }) {},
  // Eén zet. Ongeldig? gooi new RuleError('sleutel', { n: 3 }): de sleutel verwijst naar err.<sleutel> in het taalpakket (zie hierboven).
  apply({ pub, secret, move, player, config }) {
    return { pub: nieuweStand, secret, turn: andereSpeler /* of null = afgelopen */, result: { winner, scores } };
  },
  // (optioneel) een korte samenvatting voor in de lijst met partijen (de lijst bevat niet de hele stand)
  summary({ pub }) { return { scores: { /* id: aantal */ } }; },
};
```

- `secret` wordt **nooit** naar clients gestuurd. Oplossingen, geheime letters en kaartstapels horen daar. (Woordtuin heeft er geen: beide spelers zien alles.)
- De beurt gaat naar de speler die `turn` aangeeft; dat mag dezelfde speler zijn (Woordtuin: kan de ander niets meer, dan slaat die over).
- De regels moeten een pure functie zijn (zelfde invoer, zelfde uitkomst); willekeur komt uit een zaad dat in `pub` of `secret` staat. Dan zijn ze eenvoudig te testen.
- Engines die in `js/games/*/engine.js` staan kunnen ook op de server worden gebruikt: het zijn gewone modules zonder scherm. Zo draait Woordtuin in de app en op de server dezelfde code, en kan niemand valsspelen met een aangepaste app.
- Client: een scherm dat `GET /matches/:id?since=<versie>` pollt (antwoordt `unchanged` als er niets is) en zetten stuurt met `POST .../move` (`{ version, move }`): zie `js/services/matches.js` en `js/views/partij.js`. Het getal bij Vrienden telt al partijen waarin je aan de beurt bent.

Zie [`NIEUW-SPEL-VOOR-TWEE.md`](NIEUW-SPEL-VOOR-TWEE.md) voor Woordtuin en de keuzes erachter.

## Inloggen met Facebook

De knop "Doorgaan met Facebook" verschijnt vanzelf zodra de server een Facebook-app kent. Zonder die instellingen ziet niemand er iets van.

**Instellen (eenmalig, door jou):**
1. Maak op <https://developers.facebook.com> een app van het type *Consumer* met het product *Facebook Login*.
2. Zet bij *Valid OAuth Redirect URIs*: `https://jouw-adres/api/auth/facebook/callback` (precies zo, met `PUBLIC_URL` ervoor). Facebook accepteert alleen HTTPS, behalve voor `localhost`.
3. Start de server met `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` en `PUBLIC_URL`. Het geheim blijft op de server en gaat nooit naar de app.
4. Zet de app op *Live* (anders kunnen alleen jijzelf en testers inloggen). Alleen `public_profile` en `email` worden gevraagd; die vallen onder standaard toegang, dus geen app-review nodig. Facebook wil verder wel een privacyverklaring-adres en een pagina voor het verwijderen van gegevens: *Account verwijderen* in de app wist alles.

**Zo werkt het:** de app maakt een willekeurige `nonce` (blijft in `sessionStorage`) en stuurt je naar `/api/auth/facebook/start?nonce=…`. De server stuurt je door naar Facebook met een eenmalige `state`. Na toestemming komt Facebook terug op `/callback`; de server controleert de `state`, haalt je voornaam en e-mailadres op en stuurt je naar `/#/account/facebook/<ticket>`. Dat ticket (60 seconden geldig, één keer te gebruiken) wissel je met je `nonce` in via `POST /claim` voor een gewone sessiesleutel. Zo staat er nooit een sleutel in een adres, en kan niemand je een ticket van een ander laten gebruiken (login-CSRF). Er worden geen cookies gebruikt.

**Wie is wie:** dezelfde Facebook-gebruiker is altijd hetzelfde account. Bestaat er al een account met het e-mailadres dat Facebook doorgeeft, dan wordt dat gekoppeld (het wachtwoord blijft werken). Geeft Facebook geen e-mailadres, dan heeft het account er geen. Een account dat via Facebook is gemaakt heeft geen wachtwoord en geen herstelcode: wachtwoord wijzigen en herstelcode verdwijnen uit *Account*, en verwijderen vraagt alleen een bevestiging. De server bewaart van Facebook alleen het gebruikers-id, je voornaam en je e-mailadres.

**Getest** met een nagebootst Facebook (`tests/server.test.mjs`): nieuw account, opnieuw inloggen, koppelen op e-mailadres, geen e-mail, verbrande en geweigerde tickets, onbekende en dubbele `state`. Met de echte Facebook-app is het nog niet geprobeerd; dat kan pas met jouw app-gegevens.

**E-mailadres als suggestie:** op het inlog-, aanmeld- en herstelscherm staat het e-mailadres dat je op dit apparaat eerder gebruikte al klaar (en het veld doet de gewone suggesties van je browser, `autocomplete`). Dat adres staat alleen op het apparaat (`js/services/emails.js`) en verdwijnt bij "alles op dit apparaat wissen" en bij account verwijderen.

Google kan op dezelfde manier: nog een `…/start` en `…/callback` die een profiel ophalen en `facebookCallback` hergebruiken.

`js/services/sync.js` voegt de lokale voortgang samen met die op de server (`GET/PUT /api/sync`, met `baseVersion`; bij een gelijktijdige wijziging krijgt de client de nieuwste stand terug en voegt opnieuw samen). De samenvoeglogica staat in `js/shared/merge.js` (hoogste aantal gespeeld, nieuwste puzzel van de dag, nieuwste lopende puzzel per spel) en heeft eigen tests. Instellingen (tekstgrootte enz.) horen bij het apparaat en worden niet gesynchroniseerd.

## Later: Google

`auth.js` is het enige stuk dat de app aanroept (`signUp`, `signIn`, ...). Een extra aanbieder (Google) is: een route op de server die een token controleert en een eigen sleutel teruggeeft (zoals Facebook, zie boven), plus een knop op het inlogscherm. De rest (vrienden, voortgang, partijen) verandert niet.
