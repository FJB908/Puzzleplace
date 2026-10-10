# Prototypes van spelregels

Simulaties waarmee we nagaan of de regels van een spel voor twee **diepgang** hebben, voordat er een scherm voor wordt gebouwd.
De uitkomsten staan in [`docs/NIEUW-SPEL-VOOR-TWEE.md`](../../docs/NIEUW-SPEL-VOOR-TWEE.md). Dit zijn geen onderdelen van de app.

```bash
# Woordtuin: heeft een Nederlandse woordenlijst nodig (OpenTaal, BSD / CC BY 3.0):
curl -O https://raw.githubusercontent.com/OpenTaal/opentaal-wordlist/master/wordlist.txt
WORDLIST=wordlist.txt node tools/proto/woordtuin-run.mjs 6 300 7 99 99 1     # bord, partijen, max. woordlengte, -, -, nieuw vakje verplicht

# Kruisduel (de eerste variant, met een rek letters): geen woordenlijst nodig
node tools/proto/kruisduel-run.mjs
```

Wat gemeten wordt: zetten per speler, wie beginnend wint, hoe vaak de leider wisselt, en vooral: **wint een slimmere speler?**
(vooruitkijken tegen gretig, en een speler die meer woorden ziet tegen een die er minder ziet).
