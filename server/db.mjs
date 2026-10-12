// Eenvoudige opslag in één JSON-bestand. Past bij een kleine groep mensen (honderden accounts).
// Schrijft veilig: eerst naar een tijdelijk bestand en dan hernoemen, dus een crash laat nooit een half bestand achter.

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readdirSync, unlinkSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const empty = () => ({ v: 1, users: {}, emails: {}, facebook: {}, codes: {}, sessions: {}, friendships: {}, matches: {}, devices: {} });

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


// Opslag in SQLite (één bestand, veilig bij een crash, en te back-uppen terwijl de server draait). Zelfde gebruik als Db:
// `data` is de hele toestand in het geheugen, `save()` bewaart de wijzigingen. Per verzameling (users, matches, ...) staat elk
// item als een regel (coll, id, json); alleen wat veranderd is wordt weggeschreven, in één transactie.
// Past bij duizenden accounts. Wordt het groter, dan is dit de plek om per soort een eigen tabel met zoekopdrachten te maken.
export class SqliteDb {
  constructor(file, { migrateFrom = null } = {}) {
    this.file = file;
    this.data = empty();
    this.timer = null;
    this.bewaard = new Map();                                   // "coll\0id" -> de tekst zoals die nu in het bestand staat
    mkdirSync(dirname(file), { recursive: true });
    this.sql = new DatabaseSync(file);
    this.sql.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;');
    this.sql.exec('CREATE TABLE IF NOT EXISTS docs (coll TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY (coll, id)) WITHOUT ROWID');
    this.sql.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
    for (const r of this.sql.prepare('SELECT coll, id, json FROM docs').all()) {
      (this.data[r.coll] ||= {})[r.id] = JSON.parse(r.json);
      this.bewaard.set(`${r.coll}\0${r.id}`, r.json);
    }
    const v = this.sql.prepare("SELECT v FROM meta WHERE k = 'v'").get();
    if (v) this.data.v = Number(v.v);
    // Eerste keer met een bestaand JSON-bestand ernaast: alles overnemen (het JSON-bestand blijft staan als reserve)
    if (!this.bewaard.size && migrateFrom && existsSync(migrateFrom)) {
      this.data = { ...empty(), ...new Db(migrateFrom).data };
      this.flush();
    }
  }

  save() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 200);
    this.timer.unref?.();
  }

  flush() {
    clearTimeout(this.timer); this.timer = null;
    if (!this.sql) return;
    const put = this.sql.prepare('INSERT INTO docs (coll, id, json) VALUES (?, ?, ?) ON CONFLICT (coll, id) DO UPDATE SET json = excluded.json');
    const del = this.sql.prepare('DELETE FROM docs WHERE coll = ? AND id = ?');
    const gezien = new Set();
    this.sql.exec('BEGIN');
    try {
      for (const [coll, items] of Object.entries(this.data)) {
        if (items === null || typeof items !== 'object') continue;
        for (const [id, waarde] of Object.entries(items)) {
          const sleutel = `${coll}\0${id}`, tekst = JSON.stringify(waarde);
          gezien.add(sleutel);
          if (this.bewaard.get(sleutel) !== tekst) { put.run(coll, id, tekst); this.bewaard.set(sleutel, tekst); }
        }
      }
      for (const sleutel of [...this.bewaard.keys()]) {
        if (gezien.has(sleutel)) continue;
        const [coll, id] = sleutel.split('\0');
        del.run(coll, id); this.bewaard.delete(sleutel);
      }
      this.sql.prepare("INSERT INTO meta (k, v) VALUES ('v', ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v").run(String(this.data.v ?? 1));
      this.sql.exec('COMMIT');
    } catch (e) { this.sql.exec('ROLLBACK'); throw e; }
  }

  // Een consistente kopie van de database terwijl de server draait
  backup(pad) {
    this.flush();
    mkdirSync(dirname(pad), { recursive: true });
    this.sql.exec(`VACUUM INTO '${pad.replace(/'/g, "''")}'`);
  }

  close() {
    if (!this.sql) return;
    this.flush();
    this.sql.close();
    this.sql = null;
  }
}

// Elke dag een back-up (db-JJJJ-MM-DD.sqlite) in de map, de nieuwste `bewaar` stuks blijven staan
export function dagelijkseBackup(db, map, bewaar = 7, nu = () => new Date()) {
  const naam = `db-${nu().toISOString().slice(0, 10)}.sqlite`;
  if (!existsSync(join(map, naam))) db.backup(join(map, naam));
  const oud = readdirSync(map).filter((f) => /^db-\d{4}-\d{2}-\d{2}\.sqlite$/.test(f)).sort().slice(0, -bewaar);
  for (const f of oud) unlinkSync(join(map, f));
  return naam;
}
