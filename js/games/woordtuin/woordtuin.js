// Woordtuin tegen de computer: het scherm dat het platform laadt (zie registry.js).
// Spelen tegen een vriend gaat via js/views/partij.js; het paneel met bord en knoppen is voor beide hetzelfde.
//
// De computer speelt als speler 2 en begint nooit: jij mag altijd eerst. Hoe sterk hij is, zit in het niveau
// (hoeveel woorden hij ziet, hoe slordig hij kiest en of hij vooruitkijkt, zie NIVEAUS in engine.js).

import { maakPaneel } from './paneel.js';
import { newGame, applyMove, botMove, geefDoor, tip, result, counts, makeRng, taalVan } from './engine.js';
import { laadWoordenboek } from './woordenboek.js';
import { burst, rain, motionOK } from '../../effects.js';
import { t } from '../../i18n/index.js';

const ME = 1, PC = 2;
const geldig = (s) => s && s.game && Array.isArray(s.game.owner) && s.game.owner.length === s.game.size * s.game.size && typeof s.game.letters === 'string';

export async function mount(container, ctx) {
  // Het woordenboek van de taal van dit spel (een bewaard spel houdt zijn eigen taal)
  await laadWoordenboek(geldig(ctx.saved) ? taalVan(ctx.saved.game) : ctx.taal);
  const state = geldig(ctx.saved) ? { stack: [], ...ctx.saved } : { game: newGame(ctx.seed, { first: ME, lang: ctx.taal }), stack: [] };
  let dood = false, klaar = false;
  const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
  const niveau = ctx.difficulty;

  const paneel = maakPaneel({
    me: ME,
    names: { [ME]: t('woordtuin.you'), [PC]: t('woordtuin.computer') },
    tegenComputer: true,
    onZet: async (path) => {
      state.stack = [...state.stack.slice(-4), state.game];                  // om "Zet terug" mogelijk te maken
      state.game = applyMove(state.game, ME, path);
      bewaar(); toon(true);
      await verder();
    },
    onTip: async () => tip(state.game, ME, makeRng(`tip|${ctx.seed}|${state.game.played.length}`)),
    kanTerug: () => state.stack.length > 0,
    onTerug: async () => {
      if (!state.stack.length) throw new Error(t('woordtuin.nothingToUndo'));
      state.game = state.stack.pop();
      bewaar(); toon(false);
    },
  });
  container.classList.add('stage--bare');
  container.append(paneel.el);

  function bewaar() {
    const c = counts(state.game);
    ctx.save(state, { progress: 1 - c[0] / state.game.owner.length });
  }
  function toon(animeer) {
    paneel.setState(state.game, { animeer });
  }

  // De computer is aan de beurt (en blijft het als jij niets meer kunt)
  async function verder() {
    while (!dood && !state.game.over && state.game.turn === PC) {
      paneel.setBericht(t('woordtuin.pcThinking'));
      await wacht(motionOK() ? 1100 : 400);
      if (dood) return;
      const zet = botMove(state.game, PC, niveau, makeRng(`pc|${ctx.seed}|${state.game.played.length}`));
      state.game = zet ? applyMove(state.game, PC, zet.path) : geefDoor(state.game, PC);
      bewaar(); toon(true);
    }
    if (!dood && state.game.over) await einde();
  }

  async function einde() {
    if (klaar) return;
    klaar = true;
    const r = result(state.game);
    const wij = r.scores[ME], zij = r.scores[PC];
    const gewonnen = r.winner === ME, gelijk = r.winner === 0;
    if (gewonnen && motionOK()) {
      const [x, y] = [innerWidth / 2, innerHeight / 2];
      burst({ x, y, count: 26, power: 420, cone: [-170, -10], size: [14, 26], life: [1500, 2300] });
      rain({ count: 40 });
    }
    ctx.complete({
      delay: gewonnen && motionOK() ? 1200 : 0,
      title: t(gewonnen ? 'woordtuin.pc.won' : gelijk ? 'woordtuin.pc.draw' : 'woordtuin.pc.lost'),
      text: gewonnen ? t('woordtuin.pc.score', { mine: wij, theirs: zij }) : gelijk ? t('woordtuin.pc.drawText', { n: wij }) : t('woordtuin.pc.lostText', { mine: wij, theirs: zij }),
      joy: gewonnen || gelijk,
    });
  }

  toon(false);
  if (!ctx.saved) bewaar();
  if (state.game.over) einde(); else verder();
  return () => { dood = true; };
}
