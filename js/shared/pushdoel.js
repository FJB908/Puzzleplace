// Waar een tik op een pushmelding heen gaat (de server stuurt `naar` en `matchId` mee). Zuiver, dus te testen.
export const doelVan = (data = {}) => (data.naar === 'partij' && /^[\w-]{3,40}$/.test(data.matchId || '') ? `#/partij/${data.matchId}` : data.naar === 'vrienden' ? '#/vrienden' : '#/');
