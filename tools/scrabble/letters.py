#!/usr/bin/env python3
"""Maakt de verdeling en de waarden van de letterstenen voor een taal, uit de woordenlijst zelf (dus niet overgenomen van een bestaand spel).

   python3 tools/scrabble/letters.py <taal> <uitmap met <taal>.tsv>      schrijft JSON naar stdout

Hoe vaak een letter in de zak zit: het aandeel van de letter in de gewone woorden (kern en gangbaar, elk woord telt mee naar hoe gewoon het is), afgerond op
100 stenen, met minstens 1 steen per letter, en een aandeel klinkers tussen de grenzen die bij een leggbaar rek horen. Waarde: hoe zeldzamer de letter,
hoe meer punten (1 tot 10). Daarnaast 2 lege stenen (jokers).
"""
import sys, os, json, math
taal, uitmap = sys.argv[1], sys.argv[2]
KLINKERS = {'nl': 'aeiou', 'en': 'aeiou', 'de': 'aeiouäöü', 'fr': 'aeiou', 'es': 'aeiou', 'it': 'aeiou', 'pt': 'aeiou', 'pl': 'aeiouyąęó'}[taal]
ALFA = {
    'nl': 'abcdefghijklmnopqrstuvwxyz', 'en': 'abcdefghijklmnopqrstuvwxyz', 'de': 'abcdefghijklmnopqrstuvwxyzäöü', 'fr': 'abcdefghijklmnopqrstuvwxyz',
    'es': 'abcdefghijklmnopqrstuvwxyzñ', 'it': 'abcdefghilmnopqrstuvz', 'pt': 'abcdefghijklmnopqrstuvwxyzç', 'pl': 'abcdefghijklmnoprstuwyzząćęłńóśźż',
}[taal]
telling = {c: 0.0 for c in ALFA}
for r in open(os.path.join(uitmap, f'{taal}.tsv'), encoding='utf-8'):
    f = r.rstrip('\n').split('\t')
    w, z = f[0], float(f[1])
    if z < 2.5 or (len(f) > 5 and f[5] == 'R'): continue
    gewicht = min(z - 2.0, 3.0)                    # gewone woorden tellen zwaarder dan net-gangbare
    for c in w: telling[c] += gewicht
tot = sum(telling.values())
aandeel = {c: telling[c] / tot for c in ALFA}
N = 100
ruw = {c: max(1, aandeel[c] * N) for c in ALFA}
aantal = {c: max(1, int(ruw[c])) for c in ALFA}
# klinkers: tussen 38% en 44% van de gewone stenen
def som(): return sum(aantal.values())
def klink(): return sum(aantal[c] for c in ALFA if c in KLINKERS)
while som() < N:                                    # aanvullen met de letter waar het afronden het meest tekortdeed
    c = max(ALFA, key=lambda c: ruw[c] - aantal[c]); aantal[c] += 1
while som() > N:
    c = max((c for c in ALFA if aantal[c] > 1), key=lambda c: aantal[c] - ruw[c]); aantal[c] -= 1
for _ in range(40):
    k = klink() / N
    if k < 0.38:
        c = max((c for c in ALFA if c in KLINKERS), key=lambda c: ruw[c] - aantal[c]); d = max((c for c in ALFA if c not in KLINKERS and aantal[c] > 1), key=lambda c: aantal[c] - ruw[c]); aantal[c] += 1; aantal[d] -= 1
    elif k > 0.44:
        c = min((c for c in ALFA if c in KLINKERS and aantal[c] > 1), key=lambda c: ruw[c] - aantal[c]); d = max((c for c in ALFA if c not in KLINKERS), key=lambda c: ruw[c] - aantal[c]); aantal[c] -= 1; aantal[d] += 1
    else: break
maxaandeel = max(aandeel.values())
waarde = {c: max(1, min(10, 1 + round(1.5 * math.log2(maxaandeel / aandeel[c])))) if aandeel[c] > 0 else 10 for c in ALFA}
# letters met evenveel stenen krijgen dezelfde waarde (wel zo eerlijk)
print(json.dumps({'letters': {c: [aantal[c], waarde[c]] for c in ALFA}, 'leeg': 2, 'klinkers': klink()}, ensure_ascii=False))
