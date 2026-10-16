# Beoordeling Nederlandse lijst (298.498 woorden)

**Bekeken:** alle 497 woorden van 3 letters, alle 1150 vierletterwoorden met zipf<3, de 2841 zeldzame vijfletterwoorden, alle woorden van 3-5 letters met zipf>=3, de steekproeven per band, en automatische controles met wordfreq (Engels, Duits, Frans, Spaans, Italiaans) en accenttekens.

**Geschatte precisie (geldig Nederlands):** zipf>=3,5: ~99%. Zipf 2,5-3,5: ~99%. Zipf 1,5-2,5: ~98%. Zipf 1-1,5: ~97%. Zipf 0 (165k woorden): ~93-95%; de fouten zijn vooral vreemde woorden. 3-letterwoorden: ~85% (30 geblokkeerd). 4-letterwoorden zipf<3: ~92%. Zeldzame 5-letterwoorden: ~90%.

**Systematische problemen**
1. Vreemde woorden (Engels, Frans, Duits, Spaans, Italiaans, Latijn), waarschijnlijk uit een brede woordenbron. Ongeveer 1300 hiervan staan nu in de blokkeerlijst, naar schatting nog 500-1000 in de zipf-0-band.
2. Afkortingen en namen (mbo, vwo, vmbo, http, alv, naw, okt...): ~40 geblokkeerd.
3. Scheldwoorden op groepen: ~70 vormen met neger-, rotmof, kaffer, mongool, zigeuner.
4. Ontbrekend: bijvoeglijke naamwoorden bij landen en talen (nederlands, franse, belgische...), ~220 vormen in toegestaan.txt; ook critici, kamerlid, dankje, kado.
5. Inwoners met hoofdletter staan er wel in (belg, belgen, turken, grieken...). Besluit aan jou; ik heb ze laten staan.

**Suggesties voor de pipeline**
- Voor elk woord: zipf in en/de/fr/es/it (raw spelling). Blokkeer als `max(andere) >= 3.3` en `andere >= nl + 1,0`, en laat een handmatige uitzonderingenlijst toe. Er zijn daarbij veel Nederlandse leenwoorden (advocaat, adapter), dus controleer handmatig. Zie `fl.py` en `fl2.py` in de scratchpad.
- Zelfde check voor zipf 0 met drempel 2,3 en nl<=1,2.
- Blokkeer raw spelling met ü/ö/ä/ñ/î/ç buiten een whitelist (coördinatie, reünie, vacuüm, façade...).
- Regex voor scheldwoorden: `neger(?!e?n?d?e?$)` met uitzondering van negeer-vormen, `moff(en)?(hoer|meid|pijp|in)`, `^kaffers?$`, `zigeuner`.
- Blokkeer woordvorm `^(www|http)`.
