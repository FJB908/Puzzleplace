# Beoordeling Pools (pl)

**Bekeken:** alle 592 drieletterwoorden, de 4-letter A2-lijst (deels, zeer onzuivere delen), alle 92 grove woorden, alle samples B/C/A3, 3,0 miljoen Hunspell-vormen vs. lijst (451k), 12.938 kale Hunspell-kopwoorden (zonder flags) en een karakter-n-gram taalclassificator (pl vs. en/de/fr/it/es/pt/nl) over de hele lijst.

**Precisie (schatting, geldig Pools woord):** zipf>=4.5 ~99%; 3.5-4.5 ~99%; 2.5-3.5 ~98%; <2.5 ~97%; 3-letter ~88%; 4-letter zipf<3 ~85-90%. Rest is vooral vreemd/afkorting. Vervormingen als nie-+deelwoord of naj-+bijvoeglijk naamwoord zijn grammaticaal gegenereerd en overwegend geldig (9.020 nie-, 1.854 naj-vormen): niet blokkeren.

**Systematisch:**
1. Vreemde woorden (Engels/Latijn/Frans/Italiaans, ook Hunspell-vormen als `cadillaka`, `bluetootha`): geschat 4.000-6.000 vormen. Circa 1.840 geblokkeerd (n-gram top 2600 + handmatig). Ca. 8% van de kale kopwoorden >=6 letters is vreemd.
2. Namen en merken in kleine letters (kop heeft hoofdletter-tweeling, 3.887 koppen / 17.774 vormen): 337 zekere geblokkeerd; rest is gemengd (gewone woorden zoals `piast`, `kowal`) en achtervoegsel-naamwoorden (`-owski` etc.) zijn deels twijfelachtig.
3. Afkortingen: 14 woorden zonder klinker (alle geblokkeerd), plus ~70 korte (`wyd`, `przeł`, `ppoż`).
4. Ontbrekend: kleine geldige woorden vallen weg (`że go są ją aż oś most idea stop hit`, ~150 in toegestaan.txt). Waarschijnlijk filter op Engelse homografen/lengte; ~2.500 aangetroffen hunspell-vormen ontbreken, waarvan ~1.000 3-letter.

**Regels voor pijplijn:**
- Blok `^[^aąeęioóuy]+$` (14 hits, 100% afkortingen/klanknabootsing).
- Blok `(orum|arum|ibus|itatem|ensis)$` (~24 hits, grotendeels Latijn; `forum`, `kworum`, `minibus`, `omnibus` uitzonderen).
- Hoge verdachtheid, handmatig: `(?<![kyf])sh|th(?!lon)|wh|ght` (297 hits, ~35% vreemd), `ing(u|i|iem|ów)?$` (490, ~30% vreemd; castingi/rating zijn geldig).
- Kale kopwoorden (Hunspell zonder flags) met n-gram-score > 7: ~85% vreemd; dit is de efficiëntste filter.
- Behoud: nie-/naj-voorvoegsels, onregelmatige vormen.
