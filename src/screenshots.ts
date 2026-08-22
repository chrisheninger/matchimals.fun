import { useEffect, useState } from "react";
import { Linking, Platform } from "react-native";

import * as snapshots from "./Matchimals/snapshots";
import { colors } from "./constants/colors";
import type { PlayerConfig } from "./hooks/players";

// A screenshot link puts the app straight into a known state so
// scripts/screenshots.sh can photograph it on the simulator: the main menu, any
// board snapshot from src/Matchimals/snapshots.ts, or the victory card of a
// two- or four-player game. Two forms: `matchimals://screenshot/<state>` (handy
// from Safari), and the universal link
// `https://www.matchimals.fun/?screenshot=<state>`, which iOS opens without
// the "Open in Matchimals?" prompt that blocks an unattended script. The site's
// apple-app-site-association only claims "/", so the state rides in the query
// string.
export type SnapshotId = keyof typeof snapshots;
export type VictoryState = keyof typeof VICTORIES;
export type ScreenshotState = "menu" | SnapshotId | VictoryState;
export type BoardState = Exclude<ScreenshotState, "menu">;

// Each victory shows the last board of its game with the deck exhausted
const VICTORIES = {
  twoPlayerVictory: "twoPlayerE",
  fourPlayerVictory: "fourPlayerE",
} as const satisfies Record<string, SnapshotId>;

const isVictory = (state: string): state is VictoryState =>
  Object.prototype.hasOwnProperty.call(VICTORIES, state);

// The snapshot a board state restores, and whether the game has ended
export const snapshotForState = (
  state: BoardState
): { id: SnapshotId; finished: boolean } =>
  isVictory(state)
    ? { id: VICTORIES[state], finished: true }
    : { id: state, finished: false };

// Fixed players for the screenshots, each picked to read well on their
// plate colour (player order follows the PlayerProvider defaults)
export const screenshotPlayers: PlayerConfig = {
  0: { name: "Fox", animal: "Fox", color: colors.greenLight },
  1: { name: "Penguin", animal: "Penguin", color: colors.blueLight },
  2: { name: "Frog", animal: "Frog", color: colors.redLight },
  3: { name: "Koala", animal: "Koala", color: colors.yellowLight },
};

const SCHEME_PREFIX = "matchimals://screenshot/";
const UNIVERSAL_LINK =
  /^https:\/\/(?:www\.)?matchimals\.fun\/?\?(?:[^#]*&)?screenshot=([A-Za-z]+)/;

export const parseScreenshotUrl = (
  url: string | null | undefined
): ScreenshotState | null => {
  if (!url) {
    return null;
  }
  let state: string | undefined;
  if (url.startsWith(SCHEME_PREFIX)) {
    state = url.slice(SCHEME_PREFIX.length).replace(/\/+$/, "");
  } else if (Platform.OS !== "web") {
    state = url.match(UNIVERSAL_LINK)?.[1];
  }
  if (
    state === "menu" ||
    (state !== undefined && (state in snapshots || isVictory(state)))
  ) {
    return state as ScreenshotState;
  }
  return null;
};

// Board states start with the player count they were recorded with
export const playersForState = (state: ScreenshotState) =>
  state.startsWith("two") ? 2 : 4;

// The state requested by the launch URL, or by a URL opened while running
export const useScreenshotState = () => {
  const [state, setState] = useState<ScreenshotState | null>(null);

  useEffect(() => {
    Linking.getInitialURL()
      .then((url) => {
        const requested = parseScreenshotUrl(url);
        if (requested) {
          setState(requested);
        }
      })
      .catch(() => {});
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const requested = parseScreenshotUrl(url);
      if (requested) {
        setState(requested);
      }
    });
    return () => subscription.remove();
  }, []);

  return state;
};
