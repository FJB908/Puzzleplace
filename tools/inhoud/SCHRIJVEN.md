# Writing puzzle content (word search and crossword) for a language

Puzzleplace has a word search ("Woordzoeker") and a crossword ("Kruiswoord") in every language. The content of each language is written
**in that language by a native-quality writer**; it is never a translation of the Dutch or English content (a clue has to fit the word of
*that* language). The first language, Dutch, is the standard: look at `tools/inhoud/nl/woordzoeker.txt` and `tools/inhoud/nl/kruiswoord.txt`
for the level of everyday vocabulary and the style of the clues (short, friendly, clear), and then write your language **at least as well**.

The players are often over 65. They know the vocabulary of everyday life: house, garden, kitchen, food, family, weather, travel, nature,
animals, flowers, music, hobbies, clothes, festivals, the geography of their own country. They do not know slang, brands, pop culture,
technical or scientific terms, or very recent things.

## What you deliver

Two files in your own folder `tools/inhoud/<code>/` (create it):

1. `woordzoeker.txt`, `kruiswoord.txt` (formats below), and, only if really needed, `eigennamen.txt` (see "Spelling").
2. Run the checker until it says `goed` and every warning has been looked at:

       WOORDENBRON=/home/user/woordenbron node tools/inhoud/maak.mjs --controleer <code> --spelling

   It checks the formats, the alphabet, duplicates, lengths, whether the answer is hidden in its clue, **the spelling of every word against the real
   spelling dictionary of the language**, and it test-runs the puzzle generators (40 word searches and 30 crosswords per level must succeed).
   It also (re)writes `js/games/woordzoeker/talen/<code>.js` and `js/games/kruiswoord/talen/<code>.js`; you never edit those.
3. Touch no other files and run no git commands: other people are working in the same folder.

## Word search: `woordzoeker.txt`

Exactly these 15 themes, with exactly these ids (the title after the bar is in your language, short, as it would appear after "Theme: "):

    ## bloemen | Flowers            ## tuin | In the garden        ## dieren | Animals
    ## keuken | In the kitchen      ## eten | Tasty food           ## weer | The weather
    ## reizen | Travelling          ## land | <your country>        ## familie | Family
    ## huis | In the house          ## natuur | Nature             ## muziek | Music
    ## hobby | Hobbies              ## kleding | Clothes            ## feest | Celebrations

* `land`: the country (or main region) where most speakers of the language live: its typical cities, regions, rivers, foods, landmarks, symbols and
  traditions that everyone there knows (Dutch example: Amsterdam, Texel, molen, dijk, polder). For English use "Around the world" (countries and
  continents). Proper nouns are only allowed in this theme.
* Under each heading the words, separated by spaces (or line breaks), in the **normal written form of the language with all diacritics**
  (German nouns with a capital, for example). One word each: no spaces, hyphens or apostrophes inside a word.
* **22 to 30 words per theme** (hard limits 20 and 32). Each word is 3 to 11 letters long *after folding* (see below).
  Every theme has to work on every level, so give each theme enough short and enough longer words:
  at least 10 words of 3–6 letters, at least 16 words of 5–11 letters.
* Mostly everyday nouns of the theme, in the basic form (singular, infinitive for a few verbs in hobbies). Common, correct, standard words only.
  No vulgar, insulting, frightening, political or sensitive words. Do not repeat a word within a theme, and avoid words that sit inside other words
  of the same theme (like "tea" in "teapot").
* Folding: the game ignores diacritics: "é"→"e", "ü"→"u", "ñ"→"n", "č"→"c", "ß"→"ss", "æ"→"ae", "œ"→"oe", "ø"→"o", "ł"→"l", Greek accents are
  dropped, and in Cyrillic "й" stays "й". Two words that fold to the same letters (Spanish año/ano) may not both be in a theme (the checker tells you).

## Crossword: `kruiswoord.txt`

One line per entry: `answer | clue | level`.

    huis | Hier woon je | 1          (this is only the format; write your own language)

* **At least 350 entries** (Dutch has 352), about 62% level 1, 34% level 2 and a few percent (at least 12) level 3.
  Level 1 = a word everyone knows with a clear clue; 2 = a bit less common or a bit more thinking; 3 = challenging but fair.
* The answer is one word of 3 to 12 letters after folding, written normally (with diacritics, capitals where the language wants them). No spaces,
  hyphens or apostrophes. Mix of lengths: at least 40 answers of 3–4 letters, 80 of 5–7, 30 of 8–12. Words with many vowels and common consonants
  (a, e, i, o, r, s, t, n, l) cross well; the generator needs them.
* The clue is a short, friendly description in the style of simple newspaper crosswords of that language: 8 to 70 characters (aim for 15–45), starts
  with a capital letter, **no final full stop**, and says nothing but the clue (no "see 5 across"). Vary the form (definition, description, "used for…",
  "where you…", a category: "Fruit, red or green").
* **The clue must never contain the answer or a word that contains the answer**, and it must fit **one** common word of exactly that length
  (read each clue as a solver: is there a second, equally good answer? then rewrite it).
* Only things that are true and stay true: no records, prime ministers or presidents, populations, prices, current events or living people. Geography of the
  own country, nature, food, household, family, crafts, animals, plants, sports, music instruments, holidays and general knowledge are perfect.
  Be careful with facts: if you are not 100% sure, choose another entry. No religion or politics as a point of dispute, nothing offensive, no brands.
* Mostly nouns; some verbs (infinitive), adjectives and a few well-known proper names of the country (cities, rivers, regions, landmarks) are fine.

## Spelling: the checker asks the real dictionary

`--spelling` sends every word to the Hunspell spelling dictionary of the language (Voikko for Finnish, OpenTaal for Dutch). It tries the word as you wrote it,
in lowercase and with a capital, so common words and proper nouns both pass. If a **correct** word is flagged (a well-known city, river or region the
dictionary does not know), do not bend the spelling: put it, one per line with a short reason after `#`, in `tools/inhoud/<code>/eigennamen.txt`. This file
may only contain proper nouns (and at most 8% of all words). A word the dictionary does not know that is *not* a proper noun is almost always a typo, a wrong
accent, or not a standard word: replace it.

## Language-specific notes

* de: German nouns with capitals; "ß" folds to "ss"; compounds are normal (fine up to 11 letters).
* fr, es, it, pt, ca: standard written forms with accents; pt = European Portuguese (Portugal) spelling; es = Spain; fr = France.
* pl, cs, sk, sl, hr, hu, ro, sv, da, nb, fi, et, lv, lt: all diacritics in the source; they fold to plain letters. Hungarian digraphs (cs, sz, gy, ...) count as
  two letters here; Croatian "lj", "nj", "dž" likewise.
* el, bg: write in the native script (Greek with the normal accent marks, Bulgarian in Cyrillic); they are folded for you (Greek capital letters without accents).
* nb: Norwegian Bokmål. fi: standard Finnish (base forms; no dialect). et: standard Estonian. lv: Latvian with the correct macrons/cedillas/carons.
