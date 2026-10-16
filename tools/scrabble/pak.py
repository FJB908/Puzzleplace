#!/usr/bin/env python3
"""Pakt de lijst van bouw.py in voor de app:   python3 tools/scrabble/pak.py <taal> <uitmap met <taal>.tsv> <doelmap>

Schrijft <doelmap>/<taal>.js met één tekst `WOORDEN`: de woorden op alfabet, elk als  [aantal letters gelijk aan het vorige woord (0-9a-f)] [laag] [rest]
gescheiden door een nieuwe regel. Laag: 2 = kern (gewoon, zipf >= 3.5), 1 = gangbaar (>= 2.5), 0 = zeldzaam, r = grof (geldig, maar de computer speelt het nooit
en geeft er geen tip voor). Zo blijft het bestand klein (bij gzip ongeveer een derde van de woordenlijst zelf)."""
import sys, os
taal, uitmap, doel = sys.argv[1], sys.argv[2], sys.argv[3]
rows = []
for r in open(os.path.join(uitmap, f'{taal}.tsv'), encoding='utf-8'):
    f = r.rstrip('\n').split('\t')
    rows.append((f[0], float(f[1]), f[5] if len(f) > 5 else ''))
rows.sort(key=lambda x: x[0])
HEX = '0123456789abcdef'
regels, vorig = [], ''
tel = {'2': 0, '1': 0, '0': 0, 'r': 0}
for w, z, ruw in rows:
    laag = 'r' if ruw == 'R' else '2' if z >= 3.5 else '1' if z >= 2.5 else '0'
    tel[laag] += 1
    p = 0
    while p < len(vorig) and p < len(w) and p < 15 and vorig[p] == w[p]: p += 1
    regels.append(HEX[p] + laag + w[p:]); vorig = w
os.makedirs(doel, exist_ok=True)
tekst = '\n'.join(regels)
assert '`' not in tekst and '\\' not in tekst and '$' not in tekst
with open(os.path.join(doel, f'{taal}.js'), 'w', encoding='utf-8') as o:
    o.write(f'// Woordenlijst van het woordenlegspel ({taal}): {len(rows)} woorden. Gemaakt door tools/scrabble/bouw.py en pak.py; niet met de hand aanpassen.\n')
    o.write('// Elke regel: [letters gelijk aan het vorige woord, 0-f][laag: 2 kern, 1 gangbaar, 0 zeldzaam, r grof][rest van het woord]\n')
    o.write('export const WOORDEN = `' + tekst + '`;\n')
print(f'{taal}: {len(rows)} woorden, lagen {tel}, {len(tekst) // 1024} kB', file=sys.stderr)
