// Instellingen uit het bestand `.env` in de hoofdmap (regels als SMTP_URL=...). Wat al als omgevingsvariabele is gezet, wint.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function laadInstellingen(pad = fileURLToPath(new URL('../.env', import.meta.url)), env = process.env) {
  if (!existsSync(pad)) return false;
  for (const regel of readFileSync(pad, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(regel);
    if (!m || regel.trim().startsWith('#')) continue;
    const waarde = m[2].replace(/^(["'])(.*)\1$/, '$2');
    if (env[m[1]] === undefined && waarde !== '') env[m[1]] = waarde;
  }
  return true;
}
