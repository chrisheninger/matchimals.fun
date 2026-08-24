// Plays thousands of random games with the real game logic and reports how
// many cards were left in the deck when each ended — the tool that tuned
// CONSTRAINED_SURFACING_DECK in src/Matchimals/game.ts.
//
//   bun scripts/simulate-endings.mjs [games-per-row]
import {
  afterDeckChange,
  calculateScore,
  getInitialState,
  isLegalMove,
} from "../src/Matchimals/game.ts";

const random = {
  Shuffle: (cards) => {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },
  Die: (sides) => 1 + Math.floor(Math.random() * sides),
};

// greedy places for the most points, the way people mostly play; random
// spreads the board out more
const play = (numPlayers, mode, greedy) => {
  const ctx = { numPlayers, currentPlayer: "0" };
  const G = getInitialState(ctx, random, mode);
  let passes = 0;
  while (G.deck.length && !G.noValidMoves) {
    const legal = [];
    for (let id = 0; id < G.cells.length; id++) {
      if (isLegalMove(G, ctx, id)) {
        legal.push(id);
      }
    }
    if (!legal.length) {
      // classic: pass
      if (++passes > 500) {
        break;
      }
      G.deck.push(G.deck.shift());
      afterDeckChange(G, ctx);
      continue;
    }
    let id = legal[Math.floor(Math.random() * legal.length)];
    if (greedy) {
      let best = -1;
      for (const cell of legal) {
        const score = calculateScore(G, ctx, cell);
        if (score > best) {
          best = score;
          id = cell;
        }
      }
    }
    G.cells[id] = G.deck[0];
    G.deck.shift();
    if (G.deck.length) {
      afterDeckChange(G, ctx);
    }
  }
  return G.deck.length;
};

const N = Number(process.argv[2]) || 3000;
for (const [players, mode, greedy] of [
  [1, "easy", false],
  [1, "easy", true],
  [2, "easy", true],
  [3, "easy", true],
  [4, "easy", true],
  [1, "classic", true],
]) {
  const left = Array.from({ length: N }, () => play(players, mode, greedy));
  const pct = (test) =>
    ((100 * left.filter(test).length) / N).toFixed(1).padStart(5) + "%";
  console.log(
    `${players}P ${mode}${greedy ? " greedy" : " random"}: clean ${pct(
      (n) => n === 0
    )} · 1-2 left ${pct((n) => n >= 1 && n <= 2)} · 3+ left ${pct(
      (n) => n >= 3
    )} · mean ${(left.reduce((a, b) => a + b, 0) / N).toFixed(2)}`
  );
}
