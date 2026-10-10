// Woorden en omschrijvingen voor de kruiswoordpuzzel.
// Per regel:  ANTWOORD | omschrijving | niveau   (1 = bekend, 2 = iets minder bekend, 3 = uitdagend)
//
// Afspraken, zodat de puzzel eerlijk blijft:
//   - alleen hoofdletters A-Z, en geen "IJ" (die zou twee vakjes beslaan);
//   - de omschrijving noemt het antwoord zelf niet;
//   - de omschrijving past maar bij één gewoon woord.

const RAW = `
AMSTERDAM | Hoofdstad van Nederland | 1
ROTTERDAM | Nederlandse havenstad met de Erasmusbrug | 1
UTRECHT | Stad met de Domtoren | 1
GRONINGEN | Noordelijke stad met de Martinitoren | 2
TEXEL | Het grootste Nederlandse Waddeneiland | 2
SCHIPHOL | Grote luchthaven bij Amsterdam | 1
EFTELING | Sprookjespretpark in Kaatsheuvel | 2
WADDENZEE | Ondiepe zee tussen het vasteland en de eilanden | 2
DELTAWERKEN | Bouwwerken die Zeeland beschermen tegen de zee | 3
LIMBURG | Zuidelijkste provincie van Nederland | 2
ZEELAND | Provincie met veel water en de Oosterschelde | 2
FRIESLAND | Provincie van de Elfstedentocht | 2
DRENTHE | Provincie met hunebedden | 2
BRABANT | Provincie met Den Bosch als hoofdstad | 2
VELUWE | Groot natuurgebied in Gelderland | 3
MAAS | Rivier die door Limburg en Brabant stroomt | 2
POLDER | Drooggelegd stuk land | 1
MOLEN | Maalt graan met de kracht van de wind | 1
KLOMPEN | Houten schoenen | 1
TULP | Nederlandse bloem die uit een bol groeit | 1
FIETS | Tweewieler zonder motor | 1
KAAS | Gouda en Edam zijn er beroemd om | 1
ROME | Hoofdstad van Italië | 1
MADRID | Hoofdstad van Spanje | 1
BERN | Hoofdstad van Zwitserland | 3
HELSINKI | Hoofdstad van Finland | 3
BOEDAPEST | Hoofdstad van Hongarije | 3
WENEN | Hoofdstad van Oostenrijk | 2
LISSABON | Hoofdstad van Portugal | 2
BRUSSEL | Hoofdstad van België | 1
LONDEN | Hoofdstad van het Verenigd Koninkrijk | 1
ATHENE | Hoofdstad van Griekenland | 2
OSLO | Hoofdstad van Noorwegen | 2
DUBLIN | Hoofdstad van Ierland | 2
PRAAG | Hoofdstad van Tsjechië | 2
WARSCHAU | Hoofdstad van Polen | 2
STOCKHOLM | Hoofdstad van Zweden | 2
AMAZONE | Waterrijkste rivier ter wereld | 3
EVEREST | Hoogste berg ter wereld | 2
SAHARA | Grootste hete woestijn ter wereld | 2
ALPEN | Gebergte met de Mont Blanc | 2
EZEL | Grijs dier dat IA roept | 1
KOE | Dier dat melk geeft en loeit | 1
PAARD | Dier waarop je kunt rijden | 1
SCHAAP | Dier dat wol geeft | 1
GEIT | Klimmend dier dat melk geeft en mekkert | 1
VARKEN | Roze boerderijdier met een krulstaartje | 1
KIP | Boerderijdier dat eieren legt | 1
HAAS | Snel langoor | 1
EGEL | Stekelig dier dat een winterslaap houdt | 1
EEKHOORN | Rood klimdier dat noten verzamelt | 2
OOIEVAAR | Zwart-witte vogel met een lange rode snavel | 2
ZWAAN | Witte watervogel met een lange hals | 1
UIL | Nachtvogel die oehoe roept | 1
MEREL | Zwarte zangvogel met een oranje snavel | 2
MUS | Kleine bruine vogel in de tuin | 1
VLINDER | Insect met kleurrijke vleugels | 1
LIBELLE | Insect met lange doorzichtige vleugels bij het water | 2
MIER | Klein hardwerkend insect | 1
SPIN | Maakt een web | 1
SLAK | Draagt zijn huisje op zijn rug | 1
KIKKER | Groene springer bij de vijver | 1
WALVIS | Grootste zoogdier ter wereld | 1
ZEEHOND | Dier met snorharen dat op de zandbank ligt | 2
OLIFANT | Groot dier met een slurf | 1
GIRAF | Dier met de langste nek | 1
LEEUW | Koning der dieren | 1
PINGUIN | Vogel die niet kan vliegen en op de Zuidpool leeft | 2
KAMEEL | Dier met bulten in de woestijn | 2
KROKODIL | Reptiel met een enorme bek en een sterke staart | 2
BEVER | Knaagdier dat dammen bouwt | 2
DAS | Zwart-wit holendier | 2
VOS | Sluw roodbruin roofdier | 1
EIK | Sterke boom die in het najaar nootjes met een dopje laat vallen | 1
BEUK | Boom met gladde grijze stam | 2
LINDE | Boom met hartvormige bladeren | 3
BERK | Boom met een witte bast | 2
DEN | Naaldboom | 1
ROOS | Bloem met doorns | 1
LELIE | Witte bloem, symbool van onschuld | 2
MADELIEF | Wit bloempje met een geel hartje in het gras | 2
KLAVER | Plantje met drie blaadjes, vier brengt geluk | 2
PADDESTOEL | Rood met witte stippen als het een vliegenzwam is | 2
MOS | Zachte groene laag op stenen | 2
GRAS | Groen op het veld | 1
BLAD | Zit aan een tak en valt in de herfst | 1
BROOD | Dit haal je bij de bakker | 1
BOTER | Gele smeersel dat van room komt | 1
APPEL | Rond fruit dat rood of groen kan zijn | 1
PEER | Fruit met een dikke onderkant | 2
BANAAN | Gele kromme vrucht | 1
SINAASAPPEL | Oranje citrusvrucht | 2
AARDBEI | Rode zomervrucht met pitjes aan de buitenkant | 1
KERS | Rood steenvruchtje aan een steeltje | 1
DRUIF | Groeit aan een tros en wordt wijn | 2
WORTEL | Oranje groente waar konijnen dol op zijn | 1
SPRUITJE | Kleine groene kool | 2
ERWT | Kleine groene bol in een peul | 2
SOEP | Dit eet je met een lepel uit een kom | 1
PASTA | Spaghetti en macaroni | 1
HONING | Zoete stroop gemaakt door bijen | 1
JAM | Zoet fruitbeleg | 1
TAART | Dit hoort bij een verjaardag | 1
KOEK | Zoete lekkernij bij de thee | 1
STROOPWAFEL | Twee dunne wafels met stroop ertussen | 2
PANNENKOEK | Platte lekkernij uit de koekenpan | 1
STAMPPOT | Aardappelen gemengd met groente | 2
HAGELSLAG | Chocoladestrooisels op brood | 2
POFFERTJES | Kleine pannenkoekjes met poedersuiker | 2
THEE | Warme drank van gedroogde bladeren | 1
KOFFIE | Warme drank van gebrande bonen | 1
MELK | Witte drank van de koe | 1
BIER | Gebrouwen drank met een schuimkraag | 1
AARDAPPEL | Knol die je kookt, bakt of frituurt | 1
DEUR | Door deze open je naar binnen | 1
RAAM | Hierdoor kijk je naar buiten | 1
DAK | Zit bovenop het huis | 1
TRAP | Hiermee ga je naar boven | 1
VLOER | Hier loop je op in huis | 1
STOEL | Meubel om op te zitten | 1
TAFEL | Meubel waaraan je eet | 1
BED | Hierin slaap je | 1
KAST | Hierin hang je je kleren | 1
LAMP | Geeft licht | 1
SPIEGEL | Hierin zie je jezelf | 1
DEKEN | Warm laken over je heen in bed | 1
KLOK | Wijst de tijd aan | 1
VAAS | Hierin zet je bloemen | 1
KELDER | Ruimte onder het huis | 2
ZOLDER | Ruimte onder het dak | 2
SCHOORSTEEN | Hier gaat de rook door het dak | 2
KEUKEN | Hier wordt gekookt | 1
OVEN | Hierin bak je een taart | 1
PAN | Hierin bak je een ei | 1
LEPEL | Hiermee eet je soep | 1
VORK | Prikt het eten aan de tanden | 1
MES | Snijdt het brood | 1
BORD | Hierop ligt je eten | 1
BEKER | Drinkgerei zonder oor | 2
KOELKAST | Houdt het eten koud | 2
THEEPOT | Hieruit schenk je thee | 2
BEZEM | Hiermee veeg je de vloer | 2
EMMER | Hierin zit het water om te dweilen | 2
STOFZUIGER | Zuigt het vuil van de vloer | 2
NAALD | Hiermee naai je met draad | 2
SCHAAR | Hiermee knip je papier | 1
JAS | Draag je buiten als het koud is | 1
BROEK | Kledingstuk met twee pijpen | 1
ROK | Kledingstuk zonder pijpen om je middel | 1
JURK | Lang kledingstuk voor dames | 1
SJAAL | Warm om je nek | 1
MUTS | Warm voor je hoofd | 1
HANDSCHOEN | Warm voor je hand | 1
SOK | Draag je in je schoen | 1
SCHOEN | Draag je aan je voet | 1
LAARS | Hoge schoen tegen de regen | 2
TRUI | Gebreid warm bovenstuk | 1
HOED | Hoofddeksel met een rand | 1
RIEM | Houdt je broek omhoog | 2
PYJAMA | Kleding voor in bed | 2
PANTOFFEL | Zachte schoen voor in huis | 2
ZON | Schijnt overdag | 1
REGEN | Valt uit de wolken | 1
WIND | Waait door de bomen | 1
STORM | Zeer harde wind | 1
MIST | Dik wit vocht boven het land | 1
SNEEUW | Witte vlokken in de winter | 1
HAGEL | Harde korrels die uit de lucht vallen | 2
BLIKSEM | Felle flits bij onweer | 2
DONDER | Het geluid dat op de bliksem volgt | 2
REGENBOOG | Gekleurde boog na een bui | 1
LENTE | Seizoen waarin alles gaat bloeien | 1
ZOMER | Het warmste seizoen | 1
HERFST | Seizoen waarin de bladeren vallen | 1
WINTER | Het koudste seizoen | 1
JANUARI | Eerste maand van het jaar | 1
APRIL | Maand na maart | 2
DECEMBER | Laatste maand van het jaar | 1
MAANDAG | Eerste werkdag van de week | 1
ZONDAG | Rustdag van de week | 1
UUR | Zestig minuten | 1
MINUUT | Zestig seconden | 1
EEUW | Honderd jaar | 2
PIANO | Instrument met zwarte en witte toetsen | 1
GITAAR | Snaarinstrument dat je met je vingers bespeelt | 1
VIOOL | Klein snaarinstrument met een strijkstok | 2
FLUIT | Blaasinstrument van hout of metaal | 1
TROMPET | Koperen blaasinstrument | 2
DRUM | Hierop sla je met stokken | 1
HARP | Hierop spelen engelen in tekeningen | 2
ORGEL | Groot instrument in de kerk | 2
LIED | Dit zing je | 1
KOOR | Groep zangers | 2
NOOT | Een toon op papier | 2
ORKEST | Grote groep musici | 2
DIRIGENT | Leidt het orkest | 2
REMBRANDT | Schilder van de Nachtwacht | 2
VERMEER | Schilder van het Meisje met de parel | 3
NACHTWACHT | Beroemd schilderij van Rembrandt | 3
MUSEUM | Hier kijk je naar kunst of oude voorwerpen | 1
THEATER | Hier zie je een voorstelling op het toneel | 1
FILM | Dit zie je in de bioscoop | 1
BOEK | Heeft bladzijden en een kaft | 1
BRIEF | Dit stuur je met een postzegel | 1
POSTZEGEL | Plak je op een envelop | 2
KRANT | Dagelijks nieuws op papier | 1
HART | Pompt het bloed rond | 1
HOOFD | Hierop draag je een hoed | 1
NEUS | Hiermee ruik je | 1
OOR | Hiermee luister je | 1
OOG | Hiermee zie je | 1
MOND | Hiermee eet en praat je | 1
HAND | Heeft vijf vingers | 1
VOET | Hierop sta je | 1
KNIE | Gewricht in je been | 1
ELLEBOOG | Gewricht in je arm | 2
RUG | Achterkant van je lichaam | 1
TAND | Zit in je mond en kan bijten | 1
HAAR | Groeit op je hoofd | 1
HUID | Bedekt je hele lichaam | 2
DOKTER | Zorgt voor zieke mensen | 1
ZIEKENHUIS | Hier word je opgenomen als je erg ziek bent | 2
APOTHEEK | Hier haal je medicijnen | 2
BRIL | Helpt je beter zien | 1
PIL | Medicijn om door te slikken | 1
TREIN | Rijdt over rails | 1
BUS | Openbaar vervoer op de weg | 1
TRAM | Rijdt over rails door de stad | 1
AUTO | Vierwieler met een motor | 1
BOOT | Vaart over het water | 1
VLIEGTUIG | Vliegt door de lucht | 1
STATION | Hier stap je op de trein | 1
HAVEN | Hier leggen schepen aan | 2
BRUG | Gaat over een rivier | 1
TUNNEL | Weg onder een berg of onder het water | 2
KOFFER | Hierin pak je je kleren voor een reis | 1
PASPOORT | Reisdocument met een foto | 2
HOTEL | Hier slaap je op vakantie | 1
STRAND | Zand langs de zee | 1
TENT | Slaapplek van doek | 1
KAART | Hierop zoek je de weg | 1
KOMPAS | Wijst naar het noorden | 2
SLEUTEL | Hiermee open je een slot | 1
SLOT | Hiermee sluit je een deur af | 1
KLEUR | Rood, geel of blauw | 1
GELD | Hiermee betaal je | 1
MUNT | Rond stukje geld | 2
PORTEMONNEE | Hierin zit je geld | 3
VRIEND | Iemand met wie je het goed kunt vinden | 1
BUREN | Zij wonen naast je | 1
FAMILIE | Je ouders, kinderen en ooms bij elkaar | 2
OMA | Moeder van je moeder | 1
OPA | Vader van je vader | 1
OOM | Broer van je vader | 1
TANTE | Zus van je moeder | 1
KLEINKIND | Kind van je zoon of dochter | 2
VERJAARDAG | Dag waarop je een jaar ouder wordt | 1
CADEAU | Dit krijg je ingepakt | 1
FEEST | Gezellig samenzijn met muziek | 1
KERST | Feest met een boom en kaarsjes in december | 1
SINTERKLAAS | Brengt cadeautjes op vijf december | 1
PASEN | Feest met eieren in het voorjaar | 1
NIEUWJAAR | Feest op een januari | 2
KONINGSDAG | Oranjefeest op zevenentwintig april | 2
OLIEBOLLEN | Eten we op oudejaarsavond | 2
WANDELEN | Een flinke tocht te voet | 1
ZWEMMEN | Je beweegt door het water | 1
BREIEN | Met twee naalden en wol bezig zijn | 2
LEZEN | Een boek doorwerken | 1
KOKEN | Een maaltijd klaarmaken | 1
SCHAKEN | Bordspel met koning en dame | 2
BRIDGE | Kaartspel voor vier spelers | 3
PUZZEL | Hiermee houd je je hoofd bezig | 1
SUDOKU | Cijferpuzzel met negen bij negen vakjes | 1
KRUISWOORD | Puzzel met omschrijvingen die je zelf invult | 2
MAAN | Draait om de aarde | 1
STER | Fonkelt in de nacht | 1
AARDE | Onze planeet | 1
MARS | De rode planeet | 2
JUPITER | De grootste planeet | 2
SATURNUS | Planeet met ringen | 2
KOMEET | Hemellichaam met een lange staart | 3
WATER | Dit drink je als je dorst hebt | 1
VUUR | Brandt en geeft warmte | 1
LUCHT | Dit adem je in | 1
GOUD | Geel en kostbaar metaal | 1
ZILVER | Wit edelmetaal | 1
GLAS | Hier worden ramen van gemaakt | 1
HOUT | Komt van bomen | 1
STEEN | Hiermee bouw je een huis | 1
ZAND | Hier bouw je kastelen van | 1
KLEI | Vette grond waar je aardewerk van maakt | 2
PAPIER | Hierop schrijf je | 1
POTLOOD | Je kunt het uitgummen | 1
PEN | Schrijft met inkt | 1
GUM | Haalt potloodstreepjes weg | 1
LINIAAL | Hiermee trek je rechte lijnen | 2
REKENMACHINE | Telt voor je op en trekt af | 3
BAKKER | Hij maakt het brood | 1
SLAGER | Hij verkoopt vlees | 1
SCHILDER | Hij verft muren | 2
TIMMERMAN | Hij werkt met hout | 2
KAPPER | Hij knipt je haar | 1
BOER | Hij verzorgt koeien en akkers | 1
VISSER | Hij vangt vis op zee | 2
LERAAR | Hij geeft les op school | 1
BRANDWEER | Zij blussen branden | 1
POLITIE | Zij houden de orde op straat | 1
VOETBAL | Sport met een bal en twee doelen | 1
TENNIS | Sport met een racket en een net | 1
GOLF | Sport met een kleine bal en gaatjes in het gras | 2
ZEILEN | Met de wind over het water | 2
SCHAATSEN | Glijden over het ijs | 1
SKIEN | Van een besneeuwde berg afglijden | 2
DANSEN | Op muziek bewegen | 1
ZANG | Muziek met je stem | 2
VISSEN | Met een hengel bij het water zitten | 1
KAMPEREN | Slapen in een tent | 2
TUIN | Hier groeien bloemen en planten bij het huis | 1
SCHOP | Hiermee graaf je een gat | 1
HARK | Hiermee veeg je bladeren bijeen | 2
GIETER | Hiermee geef je planten water | 2
KAS | Glazen huis voor planten | 2
BOS | Veel bomen bij elkaar | 1
DUIN | Zandheuvel bij de zee | 2
MEER | Groot water midden in het land | 1
BEEK | Klein stromend water | 2
HEIDE | Paarse vlakte in de nazomer | 2
WEIDE | Grasland voor koeien | 2
AKKER | Bewerkt stuk land | 2
HEUVEL | Kleine verhoging in het landschap | 1
NACHT | Als het donker is | 1
DAG | Als het licht is | 1
OCHTEND | Begin van de dag | 1
MIDDAG | Tussen ochtend en avond | 1
AVOND | Einde van de dag | 1
KAARS | Brandt met een vlammetje van was | 1
BALLON | Opblaasbaar feestartikel | 1
SLINGER | Versiering die je ophangt | 2
VUURWERK | Knallen en lichtjes aan de hemel | 2
SNEEUWMAN | Wordt gemaakt van witte bollen | 2
MUZIEK | Klanken die je kunt fluiten of zingen | 1
TELEFOON | Hiermee kun je bellen | 1
RADIO | Hiermee luister je naar muziek en nieuws | 1
TELEVISIE | Hierop kijk je programma's | 1
COMPUTER | Elektronisch apparaat met een scherm en toetsenbord | 1
BRUID | Zij trouwt | 2
KONING | Staatshoofd van een koninkrijk | 1
KASTEEL | Grote burcht met torens | 1
RIDDER | Man in een harnas | 2
DRAAK | Vuurspuwend fabeldier | 2
SPROOKJE | Verhaal met een heks en een prins | 2
`;

const lines = RAW.trim().split('\n').map((l) => l.trim()).filter(Boolean);

export const ENTRIES = lines.map((l) => {
  const [answer, clue, level] = l.split('|').map((x) => x.trim());
  return { answer, clue, level: Number(level) };
});
