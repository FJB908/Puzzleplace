#!/usr/bin/env python3
"""Schrijft js/games/letterhof/letters.js: de verdeling en waarden van de stenen voor alle talen (zie letters.py).
   python3 tools/scrabble/maak-letters.py <uitmap met <taal>.tsv>"""
import sys, json, subprocess, os
uitmap = sys.argv[1]
hier = os.path.dirname(os.path.abspath(__file__))
data = {}
for t in ['nl', 'en', 'de', 'fr', 'es', 'it', 'pt', 'pl']:
    r = subprocess.run([sys.executable, os.path.join(hier, 'letters.py'), t, uitmap], capture_output=True, text=True, check=True)
    data[t] = json.loads(r.stdout)
doel = os.path.join(hier, '..', '..', 'js', 'games', 'letterhof', 'letters.js')
with open(doel, 'w', encoding='utf-8') as o:
    o.write('// De stenen van elke taal: per letter [aantal, waarde] en het aantal lege stenen. Gemaakt door tools/scrabble/letters.py uit de woordenlijst zelf\n')
    o.write('// (hoe vaak een letter voorkomt in gewone woorden); niet met de hand aanpassen.\n')
    o.write('export const LETTERS = {\n')
    for t, d in data.items():
        regels = ', '.join(f"{json.dumps(c, ensure_ascii=False)}: [{a}, {w}]" for c, (a, w) in d['letters'].items())
        o.write(f"  {t}: {{ leeg: {d['leeg']}, letters: {{ {regels} }} }},\n")
    o.write('};\n')
    for t, d in data.items():
        tot = sum(a for a, w in d['letters'].values())
        print(t, 'stenen', tot, '+', d['leeg'], 'klinkers', d['klinkers'], file=sys.stderr)
