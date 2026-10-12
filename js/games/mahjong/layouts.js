// De vormen van de borden. Elke laag is een plaatje met X voor een tegel; een tegel is 2 bij 2 eenheden groot (halve tegelmaten),
// een laag kan een verschuiving hebben (ox, oy in eenheden), zodat een tegel op twee tegels eronder kan rusten.
// Alle borden zijn hooguit 9 tegels breed: op een telefoon blijven de tegels dan groot genoeg, en lange borden schuif je omlaag.

const laag = (ox, oy, rijen) => ({ ox, oy, rijen });

export const LAYOUTS = {
  // 36 tegels: een kleine piramide, grote tegels
  makkelijk: [
    laag(0, 0, ['XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX']),
    laag(2, 2, ['XXXX', 'XXXX']),
    laag(4, 2, ['XX', 'XX']),
  ],
  // 60 tegels: een kasteel
  gemiddeld: [
    laag(0, 0, ['XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX']),
    laag(2, 2, ['XXXXXX', 'XXXXXX', 'XXXXXX']),
    laag(6, 4, ['XX']),
  ],
  // 100 tegels: een vlinder
  moeilijk: [
    laag(0, 0, ['XXX...XXX', 'XXXX.XXXX', 'XXXXXXXXX', '.XXXXXXX.', 'XXXXXXXXX', 'XXXX.XXXX', 'XXX...XXX']),
    laag(2, 2, ['XXX.XXX', 'XXXXXXX', '.XXXXX.', 'XXXXXXX', 'XXX.XXX']),
    laag(4, 4, ['XXXXX', '.XXX.', 'XXXXX']),
    laag(6, 6, ['XXX']),
  ],
  // 144 tegels: de schildpad, in een smalle vorm (de klassieke set)
  extreem: [
    laag(0, 0, ['XXXXXXXXX', '.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', 'XXXXXXXXX']),
    laag(2, 2, ['XXXXXXX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX']),
    laag(4, 4, ['XXXXX', 'XXXXX', 'XXXXX', 'XXXXX']),
    laag(6, 6, ['XXX', 'XXX', 'XXX']),
    laag(7, 7, ['XX', 'XX']),
    laag(8, 8, ['X']),
  ],
};

// De plekken van een bord: { x, y, z } in halve tegelmaten
export function plekken(niveau) {
  const lagen = LAYOUTS[niveau];
  if (!lagen) throw new Error(`Onbekend niveau: ${niveau}`);
  const uit = [];
  lagen.forEach((l, z) => l.rijen.forEach((rij, r) => [...rij].forEach((ch, c) => { if (ch === 'X') uit.push({ x: l.ox + c * 2, y: l.oy + r * 2, z }); })));
  return uit;
}
