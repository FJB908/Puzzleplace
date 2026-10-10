#!/usr/bin/env python3
"""Meet hoe gewoon elk kandidaat-woord is, in het Nederlands en in het Engels (voor tools/make-woordtuin-lijst.mjs).

    pip install wordfreq
    python3 tools/make-woordtuin-zipf.py <map met wordlist.txt>      # maakt <map>/zipf.tsv

wordfreq (MIT) mengt vele bronnen (boeken, nieuws, Wikipedia, ondertitels, web). De "zipf-waarde" is 3 bij 1 woord per miljoen.
Dat is een veel evenwichtiger maat dan alleen ondertitels, waar veel Engels tussen zit. Zo herkennen we Engelse woorden
("airport", "choice", "device") zonder gewone Nederlandse woorden te raken.
"""
import re, sys
from wordfreq import zipf_frequency

d = sys.argv[1] if len(sys.argv) > 1 else '.'
woorden = sorted({w.strip() for w in open(f'{d}/wordlist.txt', encoding='utf8') if re.fullmatch(r'[a-z]{3,7}', w.strip())})
with open(f'{d}/zipf.tsv', 'w', encoding='utf8') as f:
    for w in woorden:
        f.write(f'{w}\t{zipf_frequency(w, "nl"):.2f}\t{zipf_frequency(w, "en"):.2f}\n')
print(len(woorden), 'woorden gemeten')
