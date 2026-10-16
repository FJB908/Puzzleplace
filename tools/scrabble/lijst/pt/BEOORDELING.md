# Portugees (pt): beoordeling

**Bekeken:** alle 3-letterwoorden, alle 4-letterwoorden (zipf<3: 2081; zipf>=3: 1042), steekproeven per band, de 4667 Engels-geldige woorden, clitic-vormen, -mente/-inho/-issimo, bouw.py, dekkingslijst.

**Precisie (schatting):** zipf>=3,5: ~99%. 2,5-3,5: ~97%. 1-2,5: ~95%. zipf<1: ~93% (fouten vooral Engels, namen, spookwerkwoorden). 3 letters: 86% goed (41 geblokkeerd). 4 letters zipf<3: ~30% goed (1429 geblokkeerd, vooral namen, Tupi- en Afrikaanse eigennamen, niet-bestaande vormen); 4 letters zipf>=3: ~94% (67 geblokkeerd).

**Systematisch:**
1. VERO-woordenboek bevat Engelse woorden en spookwerkwoorden (includir, tradar, naturar, machinar): ~3150 lijstwoorden zijn ook Engels; 456 zeker Engelse geblokkeerd (later, single, include, center, machine). De rest (minutes, future, quite) is een vorm van een echt werkwoord: laten staan.
2. Clitics met streepje zijn samengeplakt: 30 stuks, bv. sentirmo, tornarmo.
3. -mente (1465), -inho/-zinho (3266/516), -issimo (499): geen kettingvormen gevonden; alle vier de patronen zijn acceptabel. Geen regel nodig.
4. Namen zijn al grotendeels weg; er rest een paar tientallen (hari, malu, mali).
5. bouw.py-bug: de Engels-filter (len<=4, zipf_en-zipf_pt>=0.8) verwijdert echte woorden (note, more, some, vote, case, come, boné, hein, cadê, nerd). Ze staan in toegestaan.txt, maar zie punt 6.
6. bouw.py voegt de Woordtuin-blokkeerlijst toe en die wint van toegestaan.txt. Daar staan geldige woorden op: esporte onibus mamae papai aluguel curtir curte turne carona sacola xicara bobagem bacana grana hein cade hum opa mano afro funk nerd bilhao bilhoes garcom vovo. Pas aan: `blok -= toe`.
7. kort.txt mist geldige tweeletterwoorden: ca fa ma mo pa re ei ui ne (cá, fã, má, mó, pá, ré).

**Regels voor de pijplijn:**
- `^[a-zç]{4}$` met zipf<3: weigeren, tenzij op een witlijst (zie blokkeerlijst, 4-letters is complementair).
- `^[a-zç]{4,}(ar|er|ir)mo$` waarvan de stam een infinitief in de lijst is: weigeren.
- Engels: hunspell en_US geldig en zipf_en >= zipf_pt-0,2 en spylls-analyse is kale stam of voorvoegsel+spookwerkwoord: handmatig nakijken.
- Oude spelling (acção, actual, direcção, projecto, directamente) ontbreekt; ik heb de gangbare toegevoegd.
