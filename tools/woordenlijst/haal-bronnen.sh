#!/usr/bin/env bash
# Haalt de bronbestanden voor de woordenlijst van een taal (zie bronnen.md voor wat ze zijn en onder welke licentie ze vallen).
#
#   tools/woordenlijst/haal-bronnen.sh <taal> [map]        bijv.  tools/woordenlijst/haal-bronnen.sh de /tmp/woorden
#
# Per taal komen er in <map>: <taal>.aff, <taal>.dic (Hunspell, bij pt en en ook <taal>2.aff/.dic), <taal>.license, <taal>_full.txt (ondertitelfrequenties).
# Het Nederlands gebruikt OpenTaal (wordlist.txt), het Fins Voikko (apt install voikko-fi python3-libvoikko).
set -euo pipefail
taal="${1:?geef een taalcode}"; map="${2:-.}"; mkdir -p "$map"
W=https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries
FW=https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018

# Taalcode in de bronnen
case "$taal" in
  nb) fw=no ;; *) fw="$taal" ;;
esac
get() { curl -fsSL --retry 3 -o "$2" "$1"; }

get "$FW/$fw/${fw}_full.txt" "$map/${taal}_full.txt"
case "$taal" in
  nl) get https://raw.githubusercontent.com/OpenTaal/opentaal-wordlist/master/wordlist.txt "$map/wordlist.txt" ;;
  fi) echo "Fins: gebruik Voikko (zie bronnen.md)" ;;
  *)
    d="$taal"; [ "$taal" = "en" ] && d="en"
    get "$W/$d/index.dic" "$map/$taal.dic"; get "$W/$d/index.aff" "$map/$taal.aff"; get "$W/$d/license" "$map/$taal.license" || true
    # tweede woordenboek: Britse spelling, Europees Portugees
    [ "$taal" = "en" ] && { get "$W/en-GB/index.dic" "$map/${taal}2.dic"; get "$W/en-GB/index.aff" "$map/${taal}2.aff"; get "$W/en-GB/license" "$map/${taal}2.license" || true; }
    [ "$taal" = "pt" ] && { get "$W/pt-PT/index.dic" "$map/${taal}2.dic"; get "$W/pt-PT/index.aff" "$map/${taal}2.aff"; get "$W/pt-PT/license" "$map/${taal}2.license" || true; }
    ;;
esac
echo "$taal: bronnen in $map"
