// Illustraties per spel: kleine, getekende plaatjes voor op de kaarten en de startschermen.
// Ze gebruiken alleen kleurvariabelen uit de stijl (klassen .ga-*), dus ze passen zich vanzelf aan
// licht, donker en hoog contrast aan.

const wrap = (inner, size = 11) => `<svg class="game-art" viewBox="0 0 160 120" style="font-size:${size}px" aria-hidden="true" focusable="false">${inner}</svg>`;

// Sudoku: een rooster met cijfers, één eigen cijfer en een gekozen vakje
function sudoku() {
  const rows = ['53..7....', '6..195...', '.98....6.', '8...6...3', '4..8.3..1', '7...2...6', '.6....28.', '...419..5', '....8..79'];
  const user = new Map([['0,2', '4'], ['1,1', '2'], ['2,0', '1']]);
  const S = 12;
  let lines = '', nums = '';
  for (let i = 1; i < 9; i++) if (i % 3) lines += `M${i * S} 2V106M2 ${i * S}H106`;
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const u = user.get(`${r},${c}`);
    if (ch === '.' && !u) return;
    nums += `<text class="${u ? 'ga-u' : 'ga-g'}" x="${c * S + S / 2}" y="${r * S + S / 2 + 3}" text-anchor="middle">${u || ch}</text>`;
  }));
  return wrap(`<g transform="translate(26 6)">
    <rect class="ga-board" width="108" height="108" rx="9"/>
    <rect class="ga-sel" x="${3 * S + 1}" y="${4 * S + 1}" width="${S - 2}" height="${S - 2}" rx="2"/>
    <path class="ga-thin" d="${lines}"/><path class="ga-thick" d="M36 2V106M72 2V106M2 36H106M2 72H106"/>
    <rect class="ga-frame" width="108" height="108" rx="9"/>${nums}</g>`, 8);
}

// Woordzoeker: letters met twee markeerstiften
function woordzoeker() {
  const rows = ['TULPEN', 'ZBLOEM', 'KROOSA', 'NMADEL', 'IEBHOK', 'RVTRAS'];
  const S = 18;
  let letters = '';
  rows.forEach((row, r) => [...row].forEach((ch, c) => { letters += `<text class="ga-g" x="${c * S + S / 2}" y="${r * S + S / 2 + 4}" text-anchor="middle">${ch}</text>`; }));
  const pill = (r, c1, c2, cls) => `<line class="ga-pill ${cls}" x1="${c1 * S + S / 2}" y1="${r * S + S / 2}" x2="${c2 * S + S / 2}" y2="${r * S + S / 2}"/>`;
  return wrap(`<g transform="translate(26 6)">
    <rect class="ga-board" width="108" height="108" rx="9"/>
    ${pill(0, 0, 5, 'p1')}${pill(1, 1, 5, 'p0')}
    <path class="ga-pill ga-diag" d="M${1 * S + S / 2} ${2 * S + S / 2}L${4 * S + S / 2} ${5 * S + S / 2}"/>
    <rect class="ga-frame" width="108" height="108" rx="9"/>${letters}</g>`);
}

// Kruiswoord: kruisende woorden
function kruiswoord() {
  const S = 18;
  const cells = [
    [0, 2, 'R', 1], [1, 2, 'O'], [2, 2, 'O'], [3, 2, 'S'],
    [2, 0, 'B', 2], [2, 1, 'L'], [2, 3, 'E'], [2, 4, 'M', 3],
    [3, 4, 'A'], [4, 4, 'A'], [5, 4, 'N'],
  ];
  const sel = '2,3';
  let out = '';
  for (const [r, c, ch, n] of cells) {
    const empty = (r === 3 && c === 2) || (r === 4 && c === 4);
    out += `<rect class="ga-cw${r + ',' + c === sel ? ' ga-sel' : ''}" x="${c * S + 1}" y="${r * S + 1}" width="${S - 2}" height="${S - 2}" rx="3"/>`;
    if (n) out += `<text class="ga-n" font-size="5.5" x="${c * S + 3}" y="${r * S + 7.5}">${n}</text>`;
    if (!empty) out += `<text class="${r + ',' + c === sel ? 'ga-on' : 'ga-g'}" x="${c * S + S / 2}" y="${r * S + S / 2 + 5}" text-anchor="middle">${ch}</text>`;
  }
  return wrap(`<g transform="translate(26 6)">${out}</g>`);
}

// Woordtuin: een bordje met roze en blauwgroene vakjes en een woord dat net gekozen wordt
function woordtuin() {
  const rows = ['ROZEN', 'TUINA', 'BLOEM', 'KERST', 'ZONDE'];
  const own = ['mmmm.', 'tttt.', 'm.mmm', '..ttt', '.....'];
  const pick = new Set(['2,0', '2,1', '2,2', '2,3', '2,4']);
  const S = 21;
  let out = '';
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const k = pick.has(`${r},${c}`) ? ' ga-sel' : own[r][c] === 'm' ? ' ga-mine' : own[r][c] === 't' ? ' ga-theirs' : '';
    out += `<rect class="ga-tile${k}" x="${c * S + 1.5}" y="${r * S + 1.5}" width="${S - 3}" height="${S - 3}" rx="5"/>`;
    out += `<text class="${k.includes('sel') ? 'ga-on' : 'ga-g'}" x="${c * S + S / 2}" y="${r * S + S / 2 + 4.5}" text-anchor="middle" font-weight="800">${ch}</text>`;
  }));
  return wrap(`<g transform="translate(27 7)">${out}</g>`, 10);
}

const ART = { sudoku, woordzoeker, kruiswoord, woordtuin };

export function gameArt(id) {
  const make = ART[id];
  return make ? make() : wrap('<g transform="translate(26 6)"><rect class="ga-board" width="108" height="108" rx="9"/></g>');
}
