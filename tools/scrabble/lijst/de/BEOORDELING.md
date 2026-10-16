# Duits (de): beoordeling

**Bekeken:** alle 3- en 4-letterwoorden, A3, bandsteekproeven, 400 lange naamwoorden, 300 zipf-0-vormen. Plus een Hunspell-controle van alle 3-/4-lettercombinaties en de 150.000 frequentste wordfreq-woorden.

**Precisie (schatting, grammaticaal geldig):** zipf>=3.5 ca. 98% (fouten: Engels, namen); 2.5-3.5 ca. 96%; 1-2.5 ca. 96%; zipf 0 (123k werkwoord/adjectiefvormen, 13k zelfst.nw.) ca. 93%.

**Systematische problemen**
1. **Samenstellingen ontbreken (grootste gat).** De ondertitelbron is geheel in kleine letters, dus `hoofd` is altijd 0. Zelfst.nw. komen alleen binnen via de stam- en vormenlijst, niet via Hunspell-samenstelling: wochenende, mitglied, zeitpunkt, krankenhaus ontbreken. 25.5k woorden missen (zipf>=2); 22k staan in toegestaan.txt. Fix: capitalize(w) in Hunspell goed en zipf(w)>=2 telt als zelfst.nw., ook zonder hoofdletter-telling.
2. **Genitief-s van substantiveerde infinitieven: 2050 woorden** (`ns` in blokkeerlijst). Regel: stamregel in de.dic met hoofdletter, eindigend op n, vlaggen bevatten zowel `S` als `J` (2106 stammen), dan is `lower(stam)+"s"` ongeldig. Uitzondering: unternehmens vertrauens polens vergnügens versprechens nutzens regens ladens reifens fleckens schreibens treibens vergebens. Ook geblokkeerd: ca. 45 `S`-zonder-`J` gevallen (zitterns, tankens, nickens).
3. **Kale overtreffende trap zonder uitgang: 1638** (unscheinbarst, wahrhaftigst). Regel: w eindigt op st, w+{e,en,em,er,es} staan alle in de lijst, de basis (w minus st/est) staat in de lijst, zipf=0, en w[:-2]+"t" is geen woord (anders werkwoord, bv. mässigst).
4. **Overtreffende trap van relationele adjectieven** (technischstem, organischsten, -logisch/-istisch/-metrisch...), ongezien: 56. Niet geblokkeerd, maar twijfelachtig: overtreffende trap van tegenwoordig deelwoord (-ndstem, ca. 415 ongezien).
5. **Engels: ca. 250**, ook in zipf>=2.5 (additional, military, television, title). Hunspell keurt ze goed via samenstelling of homograaf. Fix: filter zipf_en>=zipf_de+0.8 voor alle lengtes (nu alleen <=4).
6. **3/4 letters:** de regel "zipf<3 / Engelse frequentie hoger" verwijdert echte woorden (see, set, all, her, not, hit, huf, held, fund, lift: in toegestaan.txt). Geblokkeerd: 23 drieletter- en 119 viervormen (namen, afkortingen, Latijn).
