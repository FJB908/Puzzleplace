// Maakt één los bestand: dist/puzzelplaats.html (stijl + code erin).
// Dat bestand werkt door er gewoon op te dubbelklikken, zonder webserver, en is
// handig om te mailen of op een USB-stick te zetten.
//
//   npm install
//   npm run build

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (p) => readFile(new URL(p, root), 'utf8');

let html = await read('index.html');

// Stijl: alle <link rel="stylesheet"> in de volgorde van de pagina
const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]);
const css = (await Promise.all(sheets.map(async (href) => {
  const r = await build({ entryPoints: [new URL(href, root).pathname], bundle: true, minify: true, write: false, loader: { '.css': 'css' } });
  return r.outputFiles[0].text;
}))).join('\n');

// Code: alle modules (ook de spellen) in één blok
const js = (await build({
  entryPoints: [new URL('js/app.js', root).pathname],
  bundle: true, minify: true, format: 'iife', target: 'es2020', write: false,
})).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const icon = 'data:image/svg+xml;base64,' + Buffer.from(await read('icons/icon.svg')).toString('base64');

html = html
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
  .replace(/\s*<!--[^>]*Stijl per spel[^>]*-->/, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${icon}">`)
  .replace(/\s*<link rel="stylesheet"[^>]*>/g, '')
  .replace('</head>', () => `  <style>${css}</style>\n</head>`)
  .replace(/<script type="module" src="js\/app.js"><\/script>/, () => `<script>${js}</script>`);

await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/puzzelplaats.html', root), html);
console.log(`dist/puzzelplaats.html: ${(html.length / 1024).toFixed(0)} kB`);
