import test from 'node:test';
import assert from 'node:assert/strict';
import { doelVan } from '../js/shared/pushdoel.js';

test('een tik op een melding gaat naar de goede plek, en onzin gaat naar Start', () => {
  assert.equal(doelVan({ naar: 'partij', matchId: 'ytd7RWayaAMq' }), '#/partij/ytd7RWayaAMq');
  assert.equal(doelVan({ naar: 'vrienden' }), '#/vrienden');
  assert.equal(doelVan({ naar: 'partij' }), '#/');
  assert.equal(doelVan({ naar: 'partij', matchId: '../../x" onerror=' }), '#/', 'een vreemde id wordt nooit in een adres gezet');
  assert.equal(doelVan(), '#/');
});
