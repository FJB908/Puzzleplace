#!/usr/bin/env python3
"""Stap A van de woordenlijst-pipeline: verzamel kandidaat-woorden voor één taal en leg per woord vast
   wat de bronnen ervan vinden. Daarna maakt bouw.mjs er de woordenlijst van.

   python3 tools/woordenlijst/extract.py <taal> <bronmap> [--uit <bestand>]

   <bronmap> bevat per taal (zie bronnen.md voor waar je ze haalt):
     <taal>.aff, <taal>.dic     Hunspell-woordenboek (de spellingscontrole van die taal)
     <taal>_full.txt            frequentielijst "woord aantal" (OpenSubtitles, hermitdave/FrequencyWords)
   Voor het Nederlands staat daar ook wordlist.txt (OpenTaal), voor het Fins zijn er de Voikko-bestanden (zie bronnen.md).

   Uitvoer (TSV): eerst een regel "#totaal <aantal woorden in de frequentielijst> <groot|klein|geen: wordfreq-lijst>", daarna per woord:
   woord(klein) aantal_klein aantal_hoofdletter zipf_taal(wordfreq) zipf_en geldig_klein geldig_hoofdletter
"""
import sys, os, re, subprocess, unicodedata, math, argparse

ap = argparse.ArgumentParser()
ap.add_argument('taal'); ap.add_argument('bron')
ap.add_argument('--uit'); ap.add_argument('--min-aantal', type=int, default=3)
ap.add_argument('--hoofdletters', action='store_true', help='zelfstandige naamwoorden krijgen een hoofdletter (Duits)')
ap.add_argument('--lijst', help='bestand met geldige woorden i.p.v. Hunspell (bijv. OpenTaal)')
ap.add_argument('--wf', default=None, help='taalcode voor wordfreq (standaard: de taal)')
ap.add_argument('--voikko', action='store_true', help='Fins: Voikko in plaats van Hunspell')
a = ap.parse_args()
taal, bron = a.taal, a.bron
uit = a.uit or f'{taal}.kandidaten.tsv'

try:
    from wordfreq import zipf_frequency, available_languages
except ImportError:
    zipf_frequency = None
wf = a.wf or taal
wf_ok = zipf_frequency is not None and (wf in available_languages('best') or wf in available_languages('small') or wf in available_languages('large'))

# Catalaans schrijft "col·legi" (l·l): de punt hoort bij het woord en verdwijnt bij het vouwen (js/shared/talen.js)
LETTER = re.compile(r"^[^\W\d_]+(?:·[^\W\d_]+)*$" if taal == 'ca' else r"^[^\W\d_]+$", re.UNICODE)

# 1. kandidaten uit de frequentielijst. We tellen apart: het woord precies in kleine letters (zo komt het in gewone tekst voor) en met een
#    hoofdletter (begin van een zin, of bij het Duits een zelfstandig naamwoord). Namen vallen zo niet onder de gewone woorden.
tel_klein, tel_hoofd = {}, {}
totaal = 0
with open(os.path.join(bron, f'{taal}_full.txt'), encoding='utf-8') as f:
    for regel in f:
        d = regel.rstrip('\n').rsplit(' ', 1)
        if len(d) != 2: continue
        w, n = d
        totaal += int(n)
        if not (2 <= len(w) <= 9) or not LETTER.match(w): continue
        k = w.lower()
        if w == k: tel_klein[k] = tel_klein.get(k, 0) + int(n)
        elif w == k.capitalize(): tel_hoofd[k] = tel_hoofd.get(k, 0) + int(n)
alle = set(tel_klein) | set(tel_hoofd)
kand = [w for w in alle if tel_klein.get(w, 0) + (tel_hoofd.get(w, 0) if a.hoofdletters else 0) >= a.min_aantal]

# 2. geldigheid: Hunspell (of een lijst, of Voikko)
def hunspell(woorden):
    """Welke van deze woorden kent het spellingswoordenboek? (Hunspell; bij en/pt een tweede woordenboek erbij, bij Fins Voikko)"""
    if not woorden: return set()
    if a.voikko:
        import libvoikko
        v = libvoikko.Voikko('fi')
        return {w for w in woorden if v.spell(w)}
    goed = set()
    for naam in (taal, taal + '2'):
        if not os.path.exists(os.path.join(bron, naam + '.dic')): continue
        r = subprocess.run(['hunspell', '-d', os.path.join(bron, naam), '-i', 'UTF-8', '-l'], input='\n'.join(woorden) + '\n', capture_output=True, text=True, encoding='utf-8')
        fout = set(r.stdout.split('\n'))
        goed |= {w for w in woorden if w not in fout}
    return goed

if a.lijst:
    geldig_lijst = set(x.strip() for x in open(a.lijst, encoding='utf-8') if x.strip())     # zoals het er staat: namen hebben een hoofdletter
    gk = {w for w in kand if w in geldig_lijst}
    gh = {w for w in kand if w not in gk and w.capitalize() in geldig_lijst} if a.hoofdletters else set()
else:
    gk = hunspell(kand)
    gh = set()
    if a.hoofdletters:
        rest = [w for w in kand if w not in gk]
        cap = hunspell([w.capitalize() for w in rest])
        gh = {w for w in rest if w.capitalize() in cap}

def ascii_(w): return ''.join(c for c in unicodedata.normalize('NFD', w) if unicodedata.category(c) != 'Mn')

with open(uit, 'w', encoding='utf-8') as o:
    n = 0
    o.write(f'#totaal\t{totaal}\t{"groot" if (zipf_frequency is not None and wf in available_languages("large")) else ("klein" if wf_ok else "geen")}\n')
    for w in kand:
        if w not in gk and w not in gh: continue
        zl = zipf_frequency(w, wf) if wf_ok else 0
        ze = zipf_frequency(ascii_(w), 'en') if zipf_frequency else 0
        o.write(f'{w}\t{tel_klein.get(w, 0)}\t{tel_hoofd.get(w, 0)}\t{zl:.2f}\t{ze:.2f}\t{int(w in gk)}\t{int(w in gh)}\n'); n += 1
# De meest voorkomende woorden die het woordenboek NIET kent: daar zitten namen en rommel tussen, maar ook echte woorden die het woordenboek mist.
# Die laat bouw.mjs aan een mens (of iemand met kennis van de taal) zien om te kiezen wat toch mee moet doen (toegestaan.txt).
ongeldig = sorted((w for w in kand if w not in gk and w not in gh), key=lambda w: -(tel_klein.get(w, 0) + tel_hoofd.get(w, 0)))[:8000]
with open(uit.replace('.tsv', '.ongeldig.tsv'), 'w', encoding='utf-8') as o:
    for w in ongeldig: o.write(f'{w}\t{tel_klein.get(w, 0)}\t{tel_hoofd.get(w, 0)}\n')
print(f'{taal}: {len(kand)} kandidaten, {n} geldig, totaal {totaal} woorden in de frequentielijst', file=sys.stderr)
