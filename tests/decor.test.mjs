import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const dir = new URL('../js/decor/', import.meta.url);

test('elke versiering is een geldige SVG met bloemen die kunnen opengaan', async () => {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 7, 'minstens 7 ontwerpen');
  const ids = new Set();
  for (const file of files) {
    const mod = await import(new URL(file, dir));
    assert.match(mod.default, /^<div class="art-stack"><svg class="art-bark"[^>]*viewBox="0 0 \d+ \d+"/, `${file}: twee lagen`);
    assert.match(mod.default, /<svg class="art-bloom"/, `${file}: bloemenlaag`);
    assert.match(mod.default, /aria-hidden="true"/, `${file}: alleen decoratie`);
    assert.ok((mod.default.match(/class="fl"/g) || []).length >= 8, `${file}: genoeg bloemen`);
    assert.ok(mod.ratio > 1 && mod.ratio < 4, `${file}: verhouding`);
    // ids moeten per tekening uniek zijn, anders botsen ze als er meer tekeningen tegelijk op de pagina staan
    for (const [, id] of mod.default.matchAll(/ id="([^"]+)"/g)) {
      assert.ok(!ids.has(id), `${file}: dubbele id ${id}`);
      ids.add(id);
    }
    assert.ok(!/<script|onload=|onclick=/i.test(mod.default), `${file}: geen scripts`);
  }
});

test('losse onderdelen bestaan', async () => {
  for (const f of ['blossom.svg', 'petal-a.svg', 'petal-b.svg', 'petal-c.svg']) {
    assert.match(await readFile(new URL(`../assets/${f}`, import.meta.url), 'utf8'), /^<svg /);
  }
});
