import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { laadInstellingen } from '../server/instellingen.mjs';

test('.env: regels worden gelezen, commentaar niet, en wat al gezet is wint', () => {
  const pad = join(mkdtempSync(join(tmpdir(), 'pp-env-')), '.env');
  writeFileSync(pad, '# commentaar\nSMTP_URL="smtps://a%40b.nl:geheim@smtp.b.nl:465"\nMAIL_FROM=Puzzleplace <a@b.nl>\nPORT=9999\nLEEG=\n');
  const env = { PORT: '8001' };
  assert.equal(laadInstellingen(pad, env), true);
  assert.equal(env.SMTP_URL, 'smtps://a%40b.nl:geheim@smtp.b.nl:465');
  assert.equal(env.MAIL_FROM, 'Puzzleplace <a@b.nl>');
  assert.equal(env.PORT, '8001');
  assert.equal(laadInstellingen(join(tmpdir(), 'bestaat-niet-pp'), {}), false);
});
