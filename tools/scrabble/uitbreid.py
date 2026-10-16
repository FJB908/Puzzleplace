#!/usr/bin/env python3
"""Alle woordvormen van een Hunspell-woordenboek (de stamwoorden met alle toegestane uitgangen en voorvoegsels), een per regel.

   python3 tools/scrabble/uitbreid.py <pad naar woordenboek zonder .dic> <uitbestand> [max. lagen] [bestanden met stamwoorden om over te slaan ...]

Hunspell zelf kan alleen controleren, niet opsommen; `unmunch` begrijpt de nieuwere vlaggen niet. Daarom lezen we het .aff-bestand met spylls (een
Hunspell in Python) en passen we de regels zelf toe: eerst één voor- of achtervoegsel, ook met een tweede laag (vervoegingsvlag van een vlag), en voor
elke combinatie van een voorvoegsel met een achtervoegsel als beide dat toestaan. Wat het woordenboek zelf verbiedt (FORBIDDENWORD, ONLYINCOMPOUND,
NEEDAFFIX) wordt niet meegenomen. Daarna controleert bouw.py elk woord nog eens met Hunspell zelf.
"""
import sys
from spylls.hunspell import Dictionary

pad, uit = sys.argv[1], sys.argv[2]
MAXDIEPTE = int(sys.argv[3]) if len(sys.argv) > 3 else 2          # hoeveel lagen vervolgvlaggen (0: alleen de eerste laag; Italiaans en Portugees plakken anders voornaamwoorden aan elk werkwoord)
# eventueel: bestanden met stamwoorden die je overslaat (bijv. eigennamen in het Duitse woordenboek), een stam per regel
BLOK = set()
for bestand in sys.argv[4:]:
    BLOK |= {x.strip() for x in open(bestand, encoding='utf-8') if x.strip() and not x.startswith('#')}
d = Dictionary.from_files(pad)
aff = d.aff
NEED, ONLY, FORB = aff.NEEDAFFIX, aff.ONLYINCOMPOUND, aff.FORBIDDENWORD

def sfx_toe(stem, a):
    if a.cond_regexp.search(stem) and stem.endswith(a.strip):
        return stem[:len(stem) - len(a.strip)] + a.add
def pfx_toe(stem, a):
    if a.cond_regexp.search(stem) and stem.startswith(a.strip):
        return a.add + stem[len(a.strip):]

def lagen(stem, flags, diepte, soort):
    """Alle (vorm, kan_nog_kruisen) die uit stem + flags ontstaan met een voor- of achtervoegsel van soort 'sfx' of 'pfx'."""
    tabel = aff.SFX if soort == 'sfx' else aff.PFX
    toe = sfx_toe if soort == 'sfx' else pfx_toe
    for f in flags:
        for a in tabel.get(f, ()):
            vorm = toe(stem, a)
            if vorm is None: continue
            if ONLY and ONLY in a.flags: continue
            if not (NEED and NEED in a.flags): yield vorm, a.crossproduct
            if a.flags and diepte < MAXDIEPTE: yield from lagen(vorm, a.flags, diepte + 1, soort)

n = 0
with open(uit, 'w', encoding='utf-8') as o:
    for w in d.dic.words:
        fl = w.flags
        if (FORB and FORB in fl) or (ONLY and ONLY in fl): continue
        stem = w.stem
        if stem in BLOK: continue
        vormen = set()
        if not (NEED and NEED in fl): vormen.add(stem)
        s = list(lagen(stem, fl, 0, 'sfx')); p = list(lagen(stem, fl, 0, 'pfx'))
        vormen.update(v for v, _ in s); vormen.update(v for v, _ in p)
        for v, kruis in s:                                    # voorvoegsel + achtervoegsel
            if not kruis: continue
            for v2, kruis2 in lagen(v, {f for f in fl if f in aff.PFX}, 1, 'pfx'):
                if kruis2: vormen.add(v2)
        for v in vormen:
            o.write(v + '\n'); n += 1
print(f'{pad}: {n} vormen', file=sys.stderr)
