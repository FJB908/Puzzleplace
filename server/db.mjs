// Eenvoudige opslag in één JSON-bestand. Past bij een kleine groep mensen (honderden accounts).
// Schrijft veilig: eerst naar een tijdelijk bestand en dan hernoemen, dus een crash laat nooit een half bestand achter.

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const empty = () => ({ v: 1, users: {}, emails: {}, codes: {}, sessions: {}, friendships: {}, matches: {} });

export class Db {
  constructor(file = null) {
    this.file = file;
    this.data = empty();
    this.timer = null;
    if (file && existsSync(file)) {
      try { this.data = { ...empty(), ...JSON.parse(readFileSync(file, 'utf8')) }; }
      catch (err) { throw new Error(`Database ${file} is niet te lezen: ${err.message}`); }
    }
  }

  // Bewaar zo snel mogelijk (gebundeld, zodat veel wijzigingen achter elkaar één schrijfactie zijn)
  save() {
    if (!this.file || this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 200);
    this.timer.unref?.();
  }

  flush() {
    if (!this.file) return;
    clearTimeout(this.timer); this.timer = null;
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data), { mode: 0o600 });
    renameSync(tmp, this.file);
  }
}
