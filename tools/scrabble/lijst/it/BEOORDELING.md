# Beoordeling Italiaans (it.tsv, 194.230 woorden)

**Bekeken:** alle 3-letterwoorden, alle 4-letterwoorden, alle woorden op een medeklinker (2.090), het Engels-achtige deel (~1.240), de 600 meest niet-Italiaans ogende stammen, steekproeven per band, en de Hunspell-regels (.aff) om te zien welke vormen via aangeplakte voornaamwoorden ontstaan.

**Resultaat:** blokkeerlijst 7.246 woorden (3,7%), toegestaan 33 woorden. Geen woorden met apostrof samengesmolten (apostrofvormen vielen al af; geen "dell/nell/all" gevonden).

**Geschatte precisie (voor blokkeren):** zipf>=4,5 ~98%; 3,5-4,5 ~96% (Engels, namen); 2,5-3,5 ~94%; 1,5-2,5 ~92%; <1,5 ~88% (aangeplakte voornaamwoorden, afgekapte infinitieven, namen). 2-letterlijst klopt; 'od' is grensgeval maar geldig.

**Systematische problemen**
1. Aangeplakte voornaamwoorden: ~35.360 vormen (18% van de lijst) zijn alleen via enclitica te vormen (17.400 infinitief+clitic, 4.750 gerundium+clitic, 7.200 gebiedende wijs+clitic, 6.000 dubbele clitics). Regex dubbel (geblokkeerd, zipf<3,0): `^[a-z]{3,}(glie|me|te|ce|ve|se)(lo|la|li|le|ne)$` = 6.091 treffers, waarvan 134 echte woorden (miscela, cautela, clientela, ragnatela, lamentela, curatela, pergamene, miocene, cherosene, carotene, epiteli, quarantene): sluit achtervoegsel `(tela|tele|cene|ene)` uit, of gebruik de blokkeerlijst. Idiomatische vormen met zipf>=3 (andarsene, farcela, dimmelo, vattene) bleven staan. Enkel (niet geblokkeerd, keuze aan jou): `(ar|er|ir|r)(mi|ti|ci|vi|si|lo|la|li|le|ne|gli)$` en `ndo(mi|ti|ci|vi|si|lo|la|li|le|ne|gli)$`; NIET op -ale/-ali/-ile werken: generale, locale, centrale, capitale zijn echte woorden.
2. Afgekapte infinitieven (andar, abbagliar...): 944, waarvan 857 met zipf<2,5 geblokkeerd. Regel: stam op -are/-ere/-ire/-rre zonder slot-e, zipf<2,5.
3. Engels/vreemd/namen/Latijn/merken: ~320 geblokkeerd (business, college, http, tupac, rerum...); het Hunspell-woordenboek bevat veel kleine-letter namen en Engelse woorden. Er zitten er zeker nog honderden in de lage banden. Tip: plain-entry-stammen zonder vlaggen met Engelse zipf > Italiaanse.
4. Romeinse cijfers: 20 (vii, viii, civ, div, ccii...). Regex `^m{0,4}(cm|cd|d?c{0,3})(l?)(iv|v?i{0,3})$`, lengte>=3 en alleen letters ivlcdm.
5. Afkortingen: ecc, etc, ing, rag, han, hoc.

**Ontbrekend:** dekking is goed; lange -mente/-zione woorden vallen af door de limiet van 15 letters.
