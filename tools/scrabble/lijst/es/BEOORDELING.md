# Beoordeling es.tsv (526.569 woorden)

**Bekeken:** alle 3-letterwoorden (254), alle 4-letterwoorden, random monsters per bandbreedte (zipf), RLA-ES .dic/.aff (bronnen herleid per woord), alle afleidingen met clitica, Engels-overlap, namen, afkortingen.

**Precisie na blokkeren (schatting):** zipf >=3.5: ~99,8%; 2,5-3,5: ~99,5%; 1,5-2,5: ~99%; <1,5 en zipf 0: ~97-98% (restfout: zeldzame dic-lemma's). Voor blokkeren was totaal ~92,5%.

**Systematische problemen**
1. Werkwoord + aangeplakt voornaamwoord: 39.576 woorden geblokkeerd (+119 extra uit expliciete dic-lemma's: dame, dale, vete-achtig, irse, únete, échale, hagalo, abridme...). Filter van de pipeline miste: alle onbeklemtoonde vormen, gerundia op -ndose (1.479), infinitief+clitic (mirarse, hacerlo).
2. Afkortingen/niet-woorden: 31 (3 letters) + ~60 (4+ letters: dpto, gral, pbro, ibid, abey...), ~40 namen/Engels (jane, troy, york, scooter, cricket), 15 beledigende groepsaanduidingen (mongolico, bollera...).
3. Omgekeerd: de pipeline gooide ten onrechte ~32.700 geldige woorden weg (toegestaan.txt): esdrujula 1e pers. mv. (-ábamos, -íamos, -áramos, -ásemos, -aríamos, -iéremos) en esdrujula meervouden op -os/-as/-es, plus Spaanse vormen die op Engels lijken (use, come, note, done, late, once, data, oí, usé).

**Regels voor de pipeline**
- Clitic: `(?:ándo|éndo|iéndo|yéndo|ando|iendo|yendo)(?:me|te|se|nos|os|lo|la|le|los|las|les){1,2}$` (altijd blokkeren); `[aeií]r(?:me|te|se|nos|os|lo|la|le|los|las|les){1,2}$` met stam een bestaande infinitief (uitzonderingen: parte, marte, muerte, fuerte, parla, mirlo, cantaros, carteros).
- Beter aan de bron: genereer niet met aff-flags `ÀÁÂÃ-ÚÛÜÝÞßàáâãäòóôõöøùúñ` en de regels `0 se` in klassen R/X. Gebruik niet "eindigt op os/mos/te" als clitic-test.
- Imperatief+clitic (-d+lo, -ga+lo) alleen via stam+voornaamwoord-check; blokkeer niet blind op `(me|te|se|lo|la)$` (tomate, base, vela, velo).
- Geen Engels-filter op woorden die uit een werkwoordsflag komen.
- Verwijder dic-lemma's met afkorting-vorm: `^[bcdfghjklmnpqrstvxz]{3,5}$` en 4-5 letters op `[a-z]*(dpto|avda|gral)`.
