// Woordtuin voor twee spelers: de serverkant. De regels zelf staan in js/games/woordtuin/engine.js
// (dezelfde code als in de app), dit bestand vertaalt alleen tussen spelers (id's) en plaatsen (1 en 2).
//
// pub bevat de hele toestand van het spel; er is niets geheims, want beide spelers zien het hele bord.
// Elke partij heeft zijn eigen taal (config.lang, ook in pub.lang): het woordenboek van die taal wordt geladen als het nodig is.

import { randomBytes, randomInt } from 'node:crypto';
import { RuleError } from '../api.mjs';
import { newGame, applyMove, passTurn, result, counts, MoveError, taalVan } from '../../js/games/woordtuin/engine.js';
import { laadWoordenboek } from '../../js/games/woordtuin/woordenboek.js';
import { isKlaar } from '../../js/shared/talen.js';

const slotOf = (pub, player) => pub.players.indexOf(player) + 1;

export const woordtuinRules = {
  // Instellingen die een speler mag kiezen: het aantal tips per speler (0 = serieuze partij, 3 = vriendelijke partij) en de taal van de partij
  // (een partij zonder taal is van voor de meertaligheid en dus Nederlands)
  config(config) {
    const lang = config?.lang ?? 'nl';
    if (!isKlaar(lang)) throw new RuleError('lang.unknown');
    return { tips: [0, 3].includes(config?.tips) ? config.tips : 0, lang };
  },

  // Het woordenboek moet geladen zijn voordat de regels draaien (create en apply zelf zijn synchroon)
  async prepare({ config }) {
    await laadWoordenboek(config?.lang ?? 'nl');
  },

  create({ players, config }) {
    const first = randomInt(1, 3);                                         // wie begint, bepaalt het lot
    const state = newGame(randomBytes(8).toString('hex'), { first, lang: config.lang });
    return { pub: { ...state, players: [...players] }, secret: null, turn: players[first - 1] };
  },

  apply({ pub, move, player }) {
    const slot = slotOf(pub, player);
    if (!slot) throw new RuleError('notPlaying');
    const path = move?.path;
    let next;
    try { next = move?.pass === true ? passTurn(pub, slot) : applyMove(pub, slot, path); }
    catch (e) { if (e instanceof MoveError) throw new RuleError(e.key, e.params); throw e; }
    const out = { pub: { ...next, players: pub.players }, secret: null, turn: next.over ? null : pub.players[next.turn - 1] };
    if (next.over) {
      const r = result(next);
      out.result = { winner: r.winner ? pub.players[r.winner - 1] : null, scores: { [pub.players[0]]: r.scores[1], [pub.players[1]]: r.scores[2] }, open: r.open, tiebreak: r.tiebreak };
    }
    return out;
  },

  // Een korte samenvatting voor in de lijst met partijen (de lijst bevat niet het hele bord)
  summary({ pub }) {
    const c = counts(pub);
    return { scores: { [pub.players[0]]: c[1], [pub.players[1]]: c[2] }, open: c[0], last: pub.last ? { player: pub.players[pub.last.player - 1], word: pub.last.word, pass: !!pub.last.pass } : null, lang: taalVan(pub) };
  },
};
