// De spelregels voor spelen met beurten, per spel. Elk spel levert:
//
//   config(config)            (optioneel) maakt van de gekozen instellingen een nette versie
//   create({ players, config }) -> { pub, secret, turn }
//   apply({ pub, secret, move, player, config }) -> { pub, secret, turn | null, result }
//   summary({ pub })          (optioneel) een korte samenvatting voor in de lijst met partijen
//
// Zie docs/ACCOUNTS.md voor de uitleg.

import { woordtuinRules } from './woordtuin.mjs';

export const GAMES = { woordtuin: woordtuinRules };
