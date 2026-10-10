# Translating Puzzleplace

Puzzleplace is a calm puzzle app (Sudoku, word search, crossword and Word Garden) for older adults: big letters, a clear layout, no
punishments, no hurry. **English is the official language of the app**; every other language must be exactly as good as the first
translation (Dutch), written the way a careful native speaker would write for a well-made app for older people.

This file is the contract for everyone who translates or reviews a language. Read it completely before you start.

## What you get and what you deliver

* The sheet with all texts: `node tools/i18n/maak.mjs --sjabloon <code> <file>` writes a template for your language: every key the language needs,
  with the English text and (in Dutch, sometimes) an explanation above it. Lines starting with `#` are comments.
* You deliver `tools/i18n/vertaling/<code>.txt`, one line per text: `key | translation` (the separator is a space, a vertical bar, a space).
  Keep the order of the template. Do not change keys, do not add keys, do not leave any out.
* Check yourself, as often as you like: `node tools/i18n/maak.mjs --controleer <code>`. It reports **errors** (missing keys, wrong placeholders,
  missing plural forms; these must be zero) and **warnings** (same as English, much longer than English, double spaces; look at every one of them).
* Touch no other files and run no git commands: other people are working in the same folder.

## Tone

* Calm, warm, plain everyday language. Short sentences. Nothing is ever the player's fault: no "error", "invalid", "wrong" in a blaming way
  (compare the English: "You cannot do anything wrong"). A mistake in a game simply costs nothing.
* Write what a native speaker would say, not what English would say word for word. Avoid calques and avoid English loanwords when a common native
  word exists. No slang, no jargon, no exclamation marks except where the English has them (and then only where it is natural in your language).
* The people reading this are often over 65 and may have poor eyesight and little technical experience. Prefer the simplest word.
* No emojis, no HTML, no new symbols. Keep `…`, `·`, `→`, `↓`, `–` where the English has them.
* Use the **full correct spelling with all diacritics** (the game boards fold accents away, the interface does not).
* Use the typographic quotation marks that are standard in your language (the English has straight quotes `"…"`) and use them consistently.
  Keep the text between quotes exactly in sync with the button or menu name it refers to.

## Form of address (register)

Choose one and keep it everywhere. These are the decisions for each language; do not mix forms. Where it is natural, avoid addressing the reader
at all (infinitive, impersonal or imperative forms such as "Choose a game").

| code | language | address the reader with |
|------|----------|--------------------------|
| de | German (Germany/Austria) | **Sie** (formal), capital S, with Sie-imperatives |
| fr | French (France) | **vous** |
| es | Spanish (Spain) | **tú** (informal), imperatives "Elige…" |
| it | Italian | **tu** (informal imperatives, "Scegli…") |
| pt | Portuguese (Portugal, European, not Brazilian) | polite third person ("Escolha…", "o seu…"), European spelling and vocabulary (ecrã, ficheiro, "iniciar sessão") |
| ca | Catalan | **tu** ("Tria…") |
| pl | Polish | **ty** (informal imperative, "Wybierz…") |
| cs | Czech | **vy** (polite, "Vyberte…") |
| sk | Slovak | **vy** (polite, "Vyberte…") |
| sl | Slovenian | **vi** (polite, "Izberite…") |
| hr | Croatian | **vi** (polite, "Odaberite…") |
| hu | Hungarian | polite **Ön** forms ("Válasszon…") |
| ro | Romanian | polite plural **dumneavoastră** forms ("Alegeți…") |
| sv | Swedish | **du** |
| da | Danish | **du** |
| nb | Norwegian (Bokmål) | **du** |
| fi | Finnish | **sinä**, as imperative singular ("Valitse…"), avoid the pronoun |
| et | Estonian | **sina**, imperative ("Vali…") |
| lv | Latvian | **jūs** (polite, "Izvēlieties…") |
| lt | Lithuanian | **jūs** (polite, "Pasirinkite…") |
| el | Greek | polite plural ("Επιλέξτε…") |
| bg | Bulgarian | **Вие** (polite, "Изберете…") |

## Names and terms (keep them the same everywhere in the file)

* **App name** (`app.name`): keep "Puzzleplace" (a brand; do not translate it, in any script).
* **Game names** (`sudoku.name`, `woordzoeker.name`, `kruiswoord.name`, `woordtuin.name`): use the established, everyday name of the genre in your
  language ("Sudoku", the usual word for *word search* and for *crossword*, and a natural, friendly name for *Word Garden*, a word game on a 6 × 6
  board where you make words and let your flowers grow). The name appears in many sentences: write it so that it can stand there on its own.
* **blossom / life** (Sudoku): the small blossoms are the player's lives. **hint** = a small help (the button is called "Hint"; use the word your
  language normally uses for a hint/tip on a game button; one word, short). **level** = difficulty level. **friend code** = the short code with which
  you add a friend. **recovery code** = the code with which you get back into your account when you have forgotten your password. **game** (against a
  friend) = one match of Word Garden with a friend. **flowers** = the points in Word Garden. **protected square** = a square that cannot be taken
  (shown with a small garden fence).
* Menu words: Home, Games, Friends, Settings are in a small bar at the bottom of the screen with four items next to each other, also on a
  320 px wide phone with extra large text: keep these four to **one short word each, at most 12 characters**, where your language allows it.
* Words from the list are folded in the games: accents are ignored on the boards ("é" is simply "e"). Where the English says so, say so in a way
  that fits your language (for instance with an example letter pair of your own language).

## Placeholders, plurals and links

* `{name}`, `{n}`, `{word}` and so on are filled in by the app. **Copy them exactly, never translate what is between the braces**, never add or
  remove one. A placeholder may appear in a different place in the sentence.
* Plural texts: the key ends in `_one`, `_other` (and in your language possibly `_zero`, `_two`, `_few`, `_many`). The template lists exactly the
  forms your language needs. Write each form completely and **use `{n}` in every form** (never a fixed digit such as "1"): in many languages the
  form called "one" is also used for 21, 31, 101 and so on, and the form called "few" for 22, 23, 24. Use the correct noun case after numbers.
  Texts with `{n}` but without plural forms (for instance "Digit {n}") are not counted words, just fill in the number.
* Links look like `[text](#/path)`. Translate only the text between the square brackets; the part behind it (`#/instellingen`, `#/vrienden`, ...)
  stays exactly as it is. The names of buttons and menus come in as placeholders (for instance `{settings}`), so the sentence always matches the screen.
* Sentences with a placeholder for a button name often put it between quotation marks: do the same in your quotation marks.

## Length and layout

* Buttons, menu items, chips and titles are short: stay close to the English length (at most about 30% longer; the checker warns when it is
  much longer). Prefer a shorter synonym over an abbreviation. Long compound words are fine when they are the usual word.
* Sentences can be longer, but keep them short in structure: one idea per sentence.

## Quality checklist (do this at the end, out loud, line by line)

1. Does each line mean exactly what the English means (nothing added, nothing left out)? Read the whole file once as if you were a user.
2. Is the form of address the same everywhere? Are quotation marks, the game names and the words for hint / friend code / recovery code the same everywhere?
3. Would a 70-year-old native speaker understand it at once, without thinking of English? Would a proofreader find a spelling, grammar or agreement error?
4. All plural forms present and each with `{n}`? Run `node tools/i18n/maak.mjs --controleer <code>`: zero errors, and every warning looked at.
5. Texts that are the same as English are only allowed when the word really is the same in your language (like "Sudoku").
