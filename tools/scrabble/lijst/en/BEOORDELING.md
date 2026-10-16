# English word list review

**Reviewed**
- All 2,622 'woordenboek' entries of 4-15 letters, by eye.
- All 3-letter entries, plus slur and abbreviation scans of the whole list.
- The 2,319 frequent words (zipf >= 3.3) that are not in the list.
- ENABLE compared against the list.

**Result**
- 257 words blocked: 172 woordenboek, 85 lijst.
- About 260 words added.

**Estimated precision**
- Source 'lijst' (ENABLE): ~99.9% in every band. Only the slurs below and `emf` are wrong.
- Source 'woordenboek':
  - 4-5 letters: ~75% (about 70 of 296 blocked).
  - 6-7 letters: ~94%.
  - 8-15 letters: ~99%.

**Systematic problems**
1. Abbreviations with the full stop stripped, almost all 4-5 letters (~70): `abbr`, `govt`, `tbsp`, `blvd`, `contd`.
2. Roman numerals (32): `lvii`, `xxxviii`, `xcvi`.
3. Slurs that ENABLE keeps (~60): `kike`, `wop`, `niggers`, `jew`, `jews`. The pipeline had dropped `nigger` and `faggot` but kept their plurals and variants.
4. Jargon, trademarks and character names: `crayola`, `smurf`, `waldo`, `regex`, `segfault`.
5. Length cap:
   - ENABLE words over 15 letters are lost on purpose.
   - The name filter also dropped valid words: `aha`, `wow`, `ouch`, `oops`, `eta`, `ems`, `cwm`, `ting`.
6. Coverage is good. Missing modern words were mostly compounds: `ebook`, `roadmap`, `wifi`, `vlog`, `upvote`, `livestream`.
7. Left alone: lowercase name-like ENABLE entries (`alan`, `jane`, `nancy`). They are valid Scrabble words.

**Pipeline suggestions**
- Drop woordenboek words matching `^[ivxlcdm]{3,}$`.
- Drop woordenboek words of 4-5 letters unless zipf >= 3.0 (subtitle count alone is not enough) or the word is in ENABLE.
- Drop woordenboek words matching `^(?![aeiouy]*$)[^aeiouy]{4,}$`.
- Add a slur list. Always block `^(kike|spic|wop|wog|yid|gook|coon|dago|sambo)s?$`.
- Do not drop ENABLE words with a name filter. Use a short explicit stoplist instead.
- Re-add interjections: `aha`, `blah`, `hmm`, `huh`, `ooh`, `oops`, `ouch`, `shh`, `tsk`, `ugh`, `whoa`, `whoops`, `wow`, `yikes`, `jeez`.
