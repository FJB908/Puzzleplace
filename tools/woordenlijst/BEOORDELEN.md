# Reviewing the word list of a language (Word Garden)

Word Garden accepts a word when it is in the word list of the language of the game. The list is built automatically
(`tools/woordenlijst/extract.py`, `bouw.mjs`): words of the spelling dictionary of the language that also occur in real text (film subtitles), folded
to plain letters (accents removed, "ß" = "ss", ...), 3 to 7 letters. That is a good start but not clean: spelling dictionaries and subtitles also contain
names, English words, abbreviations, noises, and some coarse words. **You are the human who cleans it**, with the knowledge of a native speaker. Dutch was
cleaned this way: look at `tools/woordtuin/nl/` (`blokkeerlijst.txt`, `ruw.txt`, `toegestaan.txt`, `engels-maar-lokaal.txt`) to see the standard.

The players are often over 65. They must never meet a word that is a name, an English word, a nonsense word, an abbreviation or something offensive in
the list of everyday words, and they should never be refused an ordinary word of their language.

## How the list is used

* **Accepted words** = every word in the list (the player may play any of them).
* **Everyday words** (marked `+` in the generated file) = the words the *computer* plays and the words the *hints* point at. This set must be spotless:
  ordinary, familiar, harmless words of the language, in any form (plurals, verb forms, inflections count).

## The lists you produce

Words are always written in their **folded form**: lowercase, no accents, exactly as on the left of `=` in the sheets (`fur=für` means you write `fur`).

1. **`blok` (blocklist)**: words that must NOT be accepted at all, even though they are in the dictionary or in subtitles:
   * proper names: first names, surnames, places, countries, brands, characters (`jack`, `mary`, `boston`, `canada`)
     (keep ordinary words that merely are also a name, like Dutch "roos" or "bloem", and keep a word when its ordinary meaning is the one people use);
   * words from other languages that are not part of this language (English `lady`, `killer`, `party` in a language whose dictionary and speakers do not
     use them as their own words; but keep loanwords that are fully integrated and in the standard dictionary such as `taxi`, `hotel`, `radio`, `computer`);
   * abbreviations, acronyms and letter names (`fbi`, `gps`, `ecg`), noises and laughs without a fixed spelling (`haha`, `mmm`, `brr`, `wow`);
   * **words that insult groups of people** (racial, ethnic, religious, sexual-orientation or disability slurs): these are blocked completely;
   * non-words: typos, broken forms, rubbish that sneaked in (`naoogde`, `vimmen`).
2. **`ruw` (coarse)**: real words of the language that are coarse, vulgar or sexual. They stay valid when a *player* plays them, but the computer never plays them
   and no hint points at them. Put here: strong profanity, vulgar words for genitals, sex and excrement, sexual terms, insults aimed at a person (not a group),
   crude words for bodily functions. Ask yourself: would a 70-year-old be uncomfortable if the computer played this word? Then it belongs here. Clinical or
   medical neutral words (anatomy, illnesses) are fine and stay everyday.
3. **`rar` (not everyday)**: valid words that the computer should not play and hints should not point at because ordinary people do not know them (archaic, dialect,
   technical, very rare), but a player who knows them may use them. Only for words in the *everyday* sheet that do not belong there.
4. **`toe` (allow)**: ordinary words that the dictionary lacks and that should count (from sheet D: frequent in subtitles but not in the dictionary). Only real
   standard words, in correct spelling (inflected forms of a standard word included). Names, interjections without fixed spelling and foreign words do not belong here.
5. **`eng` (English but local)**: words from sheet C (rejected automatically because they are much more frequent in English) that **are ordinary words of this language**
   (German "gift", "rate", "bad", "hose"; Dutch "bad", "bij"). Everything that is really English stays rejected.

When unsure between `blok` and keeping: keep ordinary dictionary words (a missed name is a small flaw, a wrongly refused ordinary word is a frustration),
but for the **everyday** sheet be strict (a name or an English word the computer plays is a visible error).

## The sheets

You get one or two files in `/home/user/woordbeoordeling/`, each starting with a header that says what the lists are:

* **A, everyday words**, most frequent first, 14 per line. Every word here is currently played by the computer. Read every word.
* **B, other accepted words** (a part of them, the most frequent first). Read every word as well.
* **C, rejected as English** (`word=Source(zipf-local/zipf-english)`): rescue the ordinary words of this language with `eng`.
* **D, frequent but unknown to the dictionary**: pick the real standard words with `toe` (very few; most are names and noises).

Write your result to the output file named in your assignment, with exactly these sections (words separated by spaces, any number of lines):

    ## blok
    ...
    ## ruw
    ...
    ## rar
    ...
    ## toe
    ...
    ## eng
    ...

Use `# ` lines for remarks. Then answer in at most eight lines: the number of words per section and the doubts you could not resolve (with the words).
Do not edit other files and do not run git commands.

## Quality

* Read the sheet line by line, in order; do not skim. Short words (3–4 letters) are the riskiest: many are names, interjections or English.
* Think about **every inflected form**: if `lady` is English then so are `ladies`; if a name is blocked, block its forms too.
* Use your knowledge of the language; if a word is flagged by your doubt and cannot be resolved, prefer: `blok` for names and English in the everyday sheet, keep otherwise.
* Never put a word in two sections.
