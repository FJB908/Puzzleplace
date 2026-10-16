#!/usr/bin/env python3
"""Woordenlijst voor het woordenlegspel (Scrabble-achtig): één taal, alle geldige woorden van 2 tot 15 letters.

   python3 tools/scrabble/bouw.py <taal> <bronmap> <uitmap>

Anders dan de lijst van Woordtuin (3 tot 7 letters, streng) is deze lijst ruim: een gewoon woord moet nooit geweigerd worden. De lijst kent twee lagen:
  * geldig    alles wat in het spellingswoordenboek van de taal staat en in echte tekst voorkomt (zie hieronder)
  * alledaags (zipf >= ALLEDAAGS) de woorden die de computer speelt en waar tips naar wijzen

Bronnen per taal (zie bronnen.md): een Hunspell-spellingswoordenboek (nl: de OpenTaal-lijst, en: ENABLE en SCOWL), de frequenties uit ondertitels
(OpenSubtitles, hermitdave/FrequencyWords) en wordfreq. Een woord is geldig als het woordenboek het kent (in kleine letters, dus geen eigennamen) én het
in echte tekst voorkomt (zo vallen vormen weg die een woordenboek wel kan maken maar niemand zegt). Het alfabet is per taal anders: Duits heeft ä ö ü,
Pools heeft negen letters met een teken, Spaans ñ, Portugees ç; de rest van de tekens valt weg ("é" is "e").

Uitvoer in <uitmap>: <taal>.tsv met per woord: woord, zipf, aantal, bron, voorbeeld uit de tekst; en <taal>.afgekeurd.tsv met de woorden die vlak onder de streep vielen.
"""
import sys, os, re, subprocess, unicodedata, collections

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

taal, bron, uit = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(uit, exist_ok=True)
from wordfreq import zipf_frequency, iter_wordlist

AZ = 'abcdefghijklmnopqrstuvwxyz'
CFG = {
    'nl': dict(letters=AZ, behoud='', vervang={'ĳ': 'ij'}),
    'en': dict(letters=AZ, behoud='', vervang={'æ': 'ae', 'œ': 'oe'}),
    'de': dict(letters=AZ + 'äöü', behoud='äöü', vervang={'ß': 'ss'}, hoofd=True),
    'fr': dict(letters=AZ, behoud='', vervang={'œ': 'oe', 'æ': 'ae'}),
    'es': dict(letters=AZ + 'ñ', behoud='ñ', vervang={}),
    'it': dict(letters='abcdefghilmnopqrstuvz', behoud='', vervang={}),
    'pt': dict(letters=AZ + 'ç', behoud='ç', vervang={'œ': 'oe'}),
    'pl': dict(letters='abcdefghijklmnoprstuwyzząćęłńóśźż', behoud='ąćęłńóśźż', vervang={}),
}[taal]
LETTERS = set(CFG['letters'])
ALLEDAAGS = 3.0
VOKAAL = set('aeiouyäöüáàâéèêëíìîïóòôúùûąęó')                                             # ongeveer 1 keer per miljoen woorden

def vouw(w):
    """Het woord zoals het op de stenen komt: kleine letters, tekens weg behalve de letters die in dit alfabet een eigen steen zijn."""
    w = w.lower()
    for a, b in CFG['vervang'].items(): w = w.replace(a, b)
    u = []
    for c in w:
        if c in CFG['behoud']: u.append(c); continue
        d = unicodedata.normalize('NFD', c)
        u.append(''.join(x for x in d if unicodedata.category(x) != 'Mn'))
    return ''.join(u)

LET = re.compile(r'^[^\W\d_]+$', re.UNICODE)
ES_GERUNDIO = re.compile(r'(ándo|éndo|iéndo|yéndo|ando|iendo|yendo)(me|te|se|nos|os|lo|la|le|los|las|les){1,2}$')

def lees(pad):
    """Een lijst met woorden uit een tekstbestand (een of meer per regel, # begint een toelichting)."""
    if not os.path.exists(pad): return set()
    return {t.lower() for r in open(pad, encoding='utf-8') if not r.lstrip().startswith('#') for t in r.split()}
blok = lees(os.path.join(REPO, 'tools/scrabble/lijst', taal, 'blokkeerlijst.txt')) | lees(os.path.join(REPO, 'tools/woordtuin', taal, 'blokkeerlijst.txt'))
toe = lees(os.path.join(REPO, 'tools/scrabble/lijst', taal, 'toegestaan.txt'))
kort = lees(os.path.join(REPO, 'tools/scrabble/lijst', taal, 'kort.txt'))      # de tweeletterwoorden: een lijst met de hand (woordenboeken kennen ook afkortingen)
# wat voor dit spel is goedgekeurd (toegestaan.txt) wint van de blokkeerlijst van Woordtuin (die is strenger: daar mogen ook leenwoorden en bijna-namen niet in)
blok -= toe | kort | {vouw(x) for x in toe | kort}
ruw = lees(os.path.join(REPO, 'tools/scrabble/lijst', taal, 'ruw.txt')) | lees(os.path.join(REPO, 'tools/woordtuin', taal, 'ruw.txt'))

# 1. kandidaten uit echte tekst: ondertitels (met hoofdletters apart geteld) en de woordenlijst van wordfreq
klein, hoofd, hoog = collections.Counter(), collections.Counter(), collections.Counter()
for regel in open(os.path.join(bron, f'{taal}_full.txt'), encoding='utf-8'):
    d = regel.rstrip('\n').rsplit(' ', 1)
    if len(d) != 2 or not LET.match(d[0]): continue
    w, n = d[0], int(d[1]); k = w.lower()
    if w == k: klein[k] += n
    elif w == k.capitalize(): hoofd[k] += n
    elif w == k.upper() and len(w) >= 2: hoog[k] += n
wfw = {}
for w in iter_wordlist(taal, 'large'):
    if LET.match(w): wfw[w.lower()] = 1
kand = set(klein) | set(hoofd) | set(wfw)

# 2. de woorden die de bron zelf geeft (nl: OpenTaal, en: ENABLE): die hoeven niet in de tekst voor te komen
eigen = set()
if taal == 'nl':
    for x in open(os.path.join(bron, 'nl_wordlist.txt'), encoding='utf-8'):
        x = x.strip()
        if x and x == x.lower() and LET.match(x): eigen.add(x)
if taal == 'en':
    for x in open(os.path.join(bron, 'en_enable1.txt'), encoding='utf-8'):
        x = x.strip()
        if LET.match(x): eigen.add(x)
kand |= eigen | toe | kort

# 1b. alle vormen die het woordenboek zelf kan maken (stamwoord + uitgangen, zie uitbreid.py). Zeldzame maar geldige vormen ("léchouillassions") horen in een
#     woordenspel thuis, ook als ze in de tekst niet voorkomen. Frans, Spaans en Duits nemen we ze allemaal; Pools (3 miljoen vormen), Italiaans en
#     Portugees (voornaamwoorden aan elk werkwoord, verkleinwoorden van verkleinwoorden) alleen als ze in echte tekst voorkomen.
VORM_ALLES = taal in ('fr', 'es', 'de')
vorm_klein, vorm_hoofd = set(), set()
vp = os.path.join(bron, f'{taal}.vormen.txt')
if os.path.exists(vp):
    for x in open(vp, encoding='utf-8'):
        x = x.strip()
        if not (2 <= len(x) <= 18) or not LET.match(x): continue
        if x == x.lower(): vorm_klein.add(x)
        elif x == x.capitalize() and CFG.get('hoofd'): vorm_hoofd.add(x.lower())
    kand |= vorm_klein | vorm_hoofd

def hunspell(woorden, naam):
    pad = os.path.join(bron, naam)
    if not os.path.exists(pad + '.dic'): return set()
    ws = sorted(woorden); goed = set()
    for i in range(0, len(ws), 150000):
        stuk = ws[i:i + 150000]
        r = subprocess.run(['hunspell', '-d', pad, '-i', 'UTF-8', '-l'], input='\n'.join(stuk) + '\n', capture_output=True, text=True, encoding='utf-8')
        fout = set(r.stdout.split('\n'))
        goed |= {w for w in stuk if w not in fout}
    return goed

geldig = {}                                                  # woord (zoals in de tekst) -> bron
if taal == 'nl':
    for w in eigen: geldig[w] = 'lijst'
    for w in toe | kort: geldig[w] = 'toegestaan'
else:
    for naam in ([taal, taal + '2'] if os.path.exists(os.path.join(bron, taal + '2.dic')) else [taal]):
        for w in hunspell(kand, naam): geldig.setdefault(w, 'woordenboek')
    for w in eigen: geldig[w] = 'lijst'
    for w in toe | kort: geldig[w] = 'toegestaan'
    if CFG.get('hoofd'):                                     # Duits: zelfstandige naamwoorden staan met hoofdletter in het woordenboek
        rest = [w for w in kand if w not in geldig and (hoofd.get(w, 0) >= 3 or w in vorm_hoofd)]
        cap = hunspell({w.capitalize() for w in rest}, taal)
        for w in rest:
            if w.capitalize() in cap and ((hoofd.get(w, 0) >= 3 and hoofd.get(w, 0) >= klein.get(w, 0)) or w in vorm_hoofd): geldig[w] = 'zelfst.nw.'

# 3. in echte tekst voorgekomen? (alleen voor de woorden uit een woordenboek: een lijst als OpenTaal of ENABLE is zelf al zorgvuldig gekeurd)
def zipf(w):
    return zipf_frequency(w, taal) if len(w) < 40 else 0
# Patronen die geen woorden zijn, per taal (met de uitzonderingen die wel woorden zijn)
BLOK_RE = {
    'pl': [(re.compile(r'^[^aąeęioóuy]+$'), set()), (re.compile(r'(orum|arum|ibus|itatem|ensis)$'), {'forum', 'kworum', 'minibus', 'omnibus'})],
    'es': [(re.compile(r'(ando|iendo|yendo)(me|te|se|nos|os|lo|la|le|los|las|les){1,2}$'), set())],
}
rij = {}
KORT = {vouw(x) for x in kort}
afgekeurd = []
for w, b in geldig.items():
    f = vouw(w)
    if not (2 <= len(f) <= 15) or any(c not in LETTERS for c in f): continue
    if w in blok or f in blok: continue
    if any(r.search(f) and f not in uitz for r, uitz in BLOK_RE.get(taal, ())): continue                    # patronen die de beoordelaars vonden (zie BEOORDELING.md)
    if len(f) == 2 and f not in KORT: continue
    if taal == 'nl' and (b != 'toegestaan') and (any(c in w for c in 'äöñ') or w.startswith(('http', 'www'))): continue     # geen Nederlandse letters: een vreemd woord of een internetadres
    if len(f) == 3 and b != 'toegestaan' and (not any(c in VOKAAL for c in f)): continue     # geen klinker: een afkorting
    if len(f) <= 3 and taal == 'en' and b not in ('lijst', 'toegestaan'): continue                                  # korte Engelse woorden: alleen die van ENABLE
    n = klein.get(w, 0) + (hoofd.get(w, 0) if b == 'zelfst.nw.' else 0)
    if b != 'toegestaan' and len(f) <= 5 and hoog.get(w, 0) >= 30 and hoog.get(w, 0) > 3 * max(n, 1):     # staat vooral in hoofdletters: een afkorting
        afgekeurd.append((f, w + ' (afkorting)', n, 0)); continue
    z = zipf(w) if b != 'zelfst.nw.' else zipf(w.capitalize())
    if b != 'toegestaan' and len(f) == 3 and taal != 'en' and z < 3.0: continue            # korte woorden moeten gewoon zijn (anders vooral afkortingen en namen)
    if b != 'toegestaan' and len(f) <= 4 and taal != 'en' and w.isascii() and zipf_frequency(f, 'en') - z >= 0.8: continue    # veel gewoner in het Engels: een Engels woord in de tekst (met accent, bijv. "thé", is het nooit Engels)
    if taal == 'en' and b == 'woordenboek' and len(f) <= 5 and z < 3.0: continue                  # Engelse woorden van 4 en 5 letters uit het woordenboek (niet ENABLE): vooral afkortingen en namen
    gezien = n >= 2 or z >= 1.0
    if not gezien and VORM_ALLES and ((w in vorm_klein) or (b == 'zelfst.nw.' and w in vorm_hoofd)):
        gezien = True                                                      # een vorm uit het woordenboek die nergens voorkomt: toch toelaten
    if taal == 'es' and ES_GERUNDIO.search(w): continue                    # gerundium met aangeplakte voornaamwoorden ("abalanzándose"): geen woord in het Scrabble
    if b in ('woordenboek', 'zelfst.nw.') and not gezien:
        afgekeurd.append((f, w, n, z)); continue
    old = rij.get(f)
    if old is None or z > old[0] or (z == old[0] and n > old[1]): rij[f] = (z, n, b, w)

with open(os.path.join(uit, f'{taal}.tsv'), 'w', encoding='utf-8') as o:
    for f in sorted(rij):
        z, n, b, w = rij[f]
        o.write(f'{f}\t{z:.2f}\t{n}\t{b}\t{w}\t{"R" if (w in ruw or f in ruw) else ""}\n')
with open(os.path.join(uit, f'{taal}.afgekeurd.tsv'), 'w', encoding='utf-8') as o:
    for f, w, n, z in sorted(afgekeurd): o.write(f'{f}\t{w}\t{n}\t{z:.2f}\n')
print(f'{taal}: {len(kand)} kandidaten, {len(geldig)} geldig, {len(rij)} woorden op de stenen, {len(afgekeurd)} afgekeurd', file=sys.stderr)
