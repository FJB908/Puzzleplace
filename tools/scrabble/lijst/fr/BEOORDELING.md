# fr review (Dicollecte, 399k words)

**Reviewed:** all 362 three-letter words, all 4-letter words (A2 plus the 998 with zipf>=3), the B/C/E samples, the Dicollecte lemma groups that never inflect (flags none, `||--`, `L'D'Q'`, `U.`, `A.`, `I.`), plus slur, brand, abbreviation and English-vs-French scans.

**Precision (estimated; blocked share in brackets):**
- zipf>=4: ~99.9% (6 blocked)
- 3-4: ~99.7% (57)
- 2-3: ~99.8% (74)
- <2: ~99.8% (82)
- zipf 0 (285k, mostly rare Hunspell conjugations): ~99.85% (414). These are grammatical and correct, so keep them.
- 3-letter words: ~93% (25 bad). 4-letter rare words: ~94%.

**Systematic problems**
1. **Recall bug (bouw.py), ~345 valid French words missing.** The rule `zipf_en(f)-z>=0.8` for len<=4 and the 3-letter `z<3` rule drop thé, sûre, mâle, haïr, fées, usé, four, fine, but, lot, laid, euh, heu, hum, oups, miam and every rare form like ôta, gâta, bêla. All are in `toegestaan.txt`. Better fix: skip the English filter when the Hunspell form has an accent, or when the lemma is not flagged `A.`.
2. **SI-prefix flag `U.`, 67 junk tokens** (kcal, mmol, ycal, dvad, akat ...). Regex: `^[yzepthkdcmnfa]{1,2}(cal|mol|rad|kat|var|vad|sr|lm|lx)$`, keeping cal, mol, rad, var, dal, dam, crad, avar. Spelled-out units with exotic prefixes add 276 more: `^(yotta|zetta|exa|peta|zepto|yocto|atto|femto)(ampere|becquerel|...)s?$`.
3. **Non-inflecting dictionary entries**, ~190: abbreviations (avr, janv, http, kbit, cotan), Latin phrase fragments (vitro, situ, sui, hoc), English (cheap, british).
4. **Slurs, 135 forms** (negresse, bicot, gouine, youpin, mongolien, negrifier and others), all inflections. Stem regexes are in the script logic of `blokkeerlijst.txt`.
5. **-chs/-shs English plurals** (matchs, flashs, 70) are accepted by the ODS, so I kept them. Words like speechs, scottishs and globishs are unlikely but harmless.
6. **Not blocked (judgement call):** about 600 English-dominant noun lemmas flagged `S.` (backdoor, malware, cheeseburger, framework). Optional filter: `S.` flag, no accent, and wordfreq en-fr>=1.5.

**Files:** `blokkeerlijst.txt` has 633 words and `toegestaan.txt` has 345 words, in raw spelling with accents.

**Note:** `dekking-fr.txt` has false alarms. The œ words (cœur, sœur, œil) are present as "coeur" etc., because the coverage script does not fold œ to oe.
