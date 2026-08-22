import type { Ctx, Game } from "boardgame.io";
import type { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { cells as emptyCells, center, columns } from "../constants/board";
import { deck } from "../constants/cards";
import type { Card } from "../constants/cards";
import { animals } from "../constants/animals";
import * as snapshots from "./snapshots";

export interface PlayerState {
  score: number;
}

// "easy": the deck always surfaces a playable card (and a dead deck ends the
// game). "classic": only the first card is guaranteed; unplayable cards are
// PASSed, but a fully dead deck still ends the game instead of looping forever.
export type GameMode = "easy" | "classic";

export interface GameState {
  cells: (Card | null)[];
  deck: Card[];
  players: Record<string, PlayerState>;
  // Both optional so hardcoded snapshot states don't need to carry them;
  // an undefined mode behaves as "easy"
  mode?: GameMode;
  noValidMoves?: boolean;
}

export interface Neighbors {
  topCard: Card | null;
  rightCard: Card | null;
  bottomCard: Card | null;
  leftCard: Card | null;
}

export function getNeighbors(G: GameState, id: number): Neighbors {
  const { cells } = G;

  let topCard: Card | null = null,
    rightCard: Card | null = null,
    bottomCard: Card | null = null,
    leftCard: Card | null = null;

  const topIndex = id - columns,
    rightIndex = id + 1,
    leftIndex = id - 1,
    bottomIndex = id + columns;

  // Set as a neighbor card only if within board boundaries
  if (topIndex >= 0) {
    topCard = cells[topIndex];
  }
  if (bottomIndex < cells.length) {
    bottomCard = cells[bottomIndex];
  }
  if (rightIndex % columns !== 0 && rightIndex < cells.length) {
    rightCard = cells[rightIndex];
  }
  if (leftIndex % columns !== columns - 1 && leftIndex >= 0) {
    leftCard = cells[leftIndex];
  }

  return { topCard, rightCard, bottomCard, leftCard };
}

export function calculateScore(G: GameState, ctx: Ctx, id: number): number {
  const currentCard = G.deck[0];

  const neighbors = getNeighbors(G, id);
  const topCard = neighbors.topCard,
    rightCard = neighbors.rightCard,
    bottomCard = neighbors.bottomCard,
    leftCard = neighbors.leftCard;

  let score = 0;
  if (topCard != null && currentCard.top === topCard.bottom) {
    score += animals[topCard.bottom].score;
  }
  if (rightCard != null && currentCard.right === rightCard.left) {
    score += animals[rightCard.left].score;
  }
  if (bottomCard != null && currentCard.bottom === bottomCard.top) {
    score += animals[bottomCard.top].score;
  }
  if (leftCard != null && currentCard.left === leftCard.right) {
    score += animals[leftCard.right].score;
  }
  return score;
}

export function isLegalMove(
  G: GameState,
  ctx: Ctx,
  id: number,
  currentCard: Card = G.deck[0]
): boolean {
  if (G.cells[id] !== null) {
    return false;
  }

  const neighbors = getNeighbors(G, id);
  const topCard = neighbors.topCard,
    rightCard = neighbors.rightCard,
    bottomCard = neighbors.bottomCard,
    leftCard = neighbors.leftCard;

  if (
    topCard == null &&
    rightCard == null &&
    bottomCard == null &&
    leftCard == null
  ) {
    return false;
  }

  if (
    (topCard == null || currentCard.top === topCard.bottom) &&
    (rightCard == null || currentCard.right === rightCard.left) &&
    (bottomCard == null || currentCard.bottom === bottomCard.top) &&
    (leftCard == null || currentCard.left === leftCard.right)
  ) {
    return true;
  }

  return false;
}

export function cardHasAnyLegalMove(
  G: GameState,
  ctx: Ctx,
  card: Card
): boolean {
  return G.cells.some((_, id) => isLegalMove(G, ctx, id, card));
}

export function hasAnyLegalMove(G: GameState, ctx: Ctx): boolean {
  if (G.deck.length === 0) {
    return false;
  }
  return cardHasAnyLegalMove(G, ctx, G.deck[0]);
}

// Rotate the deck until the top card has a legal placement somewhere on the
// board, so every card that gets drawn is playable. If a full cycle through
// the deck finds nothing, flag the dead end so endIf finishes the game.
export function ensurePlayableTopCard(G: GameState, ctx: Ctx): void {
  for (let i = 0; i < G.deck.length; i++) {
    if (hasAnyLegalMove(G, ctx)) {
      return;
    }
    G.deck.push(G.deck.shift()!); // Unplayable right now — try again later
  }
  G.noValidMoves = true;
}

// Classic mode leaves the deck order alone, but still flags the dead end
// where nothing in the deck can be placed, so endIf finishes the game
// instead of forcing endless passes.
export function checkForDeadEnd(G: GameState, ctx: Ctx): void {
  if (!G.deck.some((card) => cardHasAnyLegalMove(G, ctx, card))) {
    G.noValidMoves = true;
  }
}

// Run whenever a new card surfaces at the top of the deck
export function afterDeckChange(G: GameState, ctx: Ctx): void {
  if (G.mode === "classic") {
    checkForDeadEnd(G, ctx);
  } else {
    ensurePlayableTopCard(G, ctx);
  }
}

export function getInitialState(
  ctx: Ctx,
  random: RandomAPI,
  mode: GameMode
): GameState {
  const G: GameState = {
    cells: [],
    deck: [],
    players: {},
    mode,
  };

  // Add a deck for every player. Copy each card so G never holds the shared
  // constants/cards.js objects — Immer's dev freeze would freeze them after the
  // first game (same read-only hazard as the emptyCells copy below).
  for (let i = 0; i < ctx.numPlayers; i++) {
    G.deck = G.deck.concat(deck.map((card) => ({ ...card })));
  }

  // Shuffle the deck with boardgame.io's seeded RNG so state stays
  // reproducible from the game seed (matters once a server is involved)
  G.deck = random.Shuffle(G.deck);

  for (let j = 0; j < ctx.numPlayers; j++) {
    G.players[j] = {
      score: 0,
    };
  }

  // Fill the game board. Copy the shared module-level array so each game gets
  // its own cells — otherwise the first game's state freeze (Immer, in dev)
  // makes `emptyCells` read-only and the next game throws on G.cells[center] = …
  G.cells = [...emptyCells];

  // The initial card is copied off the shared constants too
  const initialCard = { ...deck[random.Die(deck.length) - 1] };
  G.cells[center] = initialCard;

  // Ensure the first card is playable (in both modes — classic guarantees
  // the very first draw, with the rest left as shuffled)
  ensurePlayableTopCard(G, ctx);

  return G;
}

// The game is built per match so the chosen mode can be baked into setup —
// App.tsx rebuilds the boardgame.io Client with createGame(mode) each game.
export function createGame(mode: GameMode): Game<GameState> {
  return {
    setup: ({ ctx, random }) => getInitialState(ctx, random, mode),

    turn: {
      minMoves: 1,
      maxMoves: 1,
    },

    moves: {
      takeSnapshot: ({ G }) => {
        console.log("==> takeSnapshot", G);
      },

      restoreSnapshot: (
        { G },
        id: keyof typeof snapshots,
        finished?: boolean
      ) => {
        if (id) {
          // An empty deck ends the game on the spot (the victory screenshot)
          return finished ? { ...snapshots[id], deck: [] } : snapshots[id];
        }
      },

      placeCard: ({ G, ctx }, id: number) => {
        if (isLegalMove(G, ctx, id)) {
          G.cells[id] = G.deck[0];
          G.players[ctx.currentPlayer].score += calculateScore(G, ctx, id);

          G.deck.shift();

          if (G.deck.length > 0) {
            afterDeckChange(G, ctx);
          }
        }
      },

      pass: ({ G, ctx }) => {
        G.deck.push(G.deck.shift()!);
        afterDeckChange(G, ctx);
      },
    },

    endIf: ({ G }) => {
      if (G.deck.length === 0 || G.noValidMoves) {
        const winner = Object.keys(G.players).reduce(
          (previousPlayer, currentPlayer) =>
            G.players[previousPlayer].score > G.players[currentPlayer].score
              ? previousPlayer
              : currentPlayer
        );
        return winner;
      }
    },
  };
}
