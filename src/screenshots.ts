import { useEffect, useState } from "react";
import { Linking, Platform } from "react-native";

import Animals from "./Animals";
import type { AnimalName } from "./Animals";
import * as snapshots from "./Matchimals/snapshots";
import { colors } from "./constants/colors";
import type { PlayerConfig } from "./hooks/players";
import { animalName } from "./i18n";

// A screenshot link puts the app straight into a known state so
// scripts/screenshots.sh (and scripts/locale-screenshots.sh) can photograph it
// on the simulator: the main menu, with or without Settings open; any board
// snapshot from src/Matchimals/snapshots.ts; the victory card of a two- or
// four-player game; and, for checking translations fit, a game with the
// in-game menu or the animal chooser open, or with the longest animal names
// on the nameplates. Two forms: `matchimals://screenshot/<state>` (handy
// from Safari), and the universal link
// `https://www.matchimals.fun/?screenshot=<state>`, which iOS opens without
// the "Open in Matchimals?" prompt that blocks an unattended script. The site's
// apple-app-site-association only claims "/", so the state rides in the query
// string.
export type SnapshotId = keyof typeof snapshots;
export type MenuState = (typeof MENU_STATES)[number];
export type VictoryState = keyof typeof VICTORIES;
export type OverlayState = (typeof OVERLAY_STATES)[number];
export type ScreenshotState =
  | MenuState
  | SnapshotId
  | VictoryState
  | OverlayState;
export type BoardState = Exclude<ScreenshotState, MenuState>;

const MENU_STATES = ["menu", "settings"] as const;
// Four-player games for checking that translations fit: the in-game menu or
// the animal chooser open, and the nameplates (and the victory title) carrying
// the longest animal names in the running language
const OVERLAY_STATES = [
  "gameMenu",
  "animalChooser",
  "fitCheck",
  "fitCheckVictory",
] as const;

const includes = <T extends string>(list: readonly T[], state: string) =>
  (list as readonly string[]).includes(state);

// Each victory shows the last board of its game with the deck exhausted
const VICTORIES = {
  twoPlayerVictory: "twoPlayerE",
  fourPlayerVictory: "fourPlayerE",
} as const satisfies Record<string, SnapshotId>;

const isVictory = (state: string): state is VictoryState =>
  Object.prototype.hasOwnProperty.call(VICTORIES, state);

const isOverlay = (state: string): state is OverlayState =>
  includes(OVERLAY_STATES, state);

const isScreenshotState = (state: string): state is ScreenshotState =>
  includes(MENU_STATES, state) ||
  isOverlay(state) ||
  isVictory(state) ||
  state in snapshots;

export const isBoardState = (state: ScreenshotState): state is BoardState =>
  !includes(MENU_STATES, state);

// The snapshot a board state restores, and whether the game has ended
export const snapshotForState = (
  state: BoardState
): { id: SnapshotId; finished: boolean } => {
  if (isVictory(state)) {
    return { id: VICTORIES[state], finished: true };
  }
  if (state === "fitCheckVictory") {
    return { id: "fourPlayerE", finished: true };
  }
  if (isOverlay(state)) {
    return { id: "fourPlayerC", finished: false };
  }
  return { id: state, finished: false };
};

const PLAYER_COLORS = [
  colors.greenLight,
  colors.blueLight,
  colors.redLight,
  colors.yellowLight,
];

const playersOf = (animals: AnimalName[]): PlayerConfig =>
  Object.fromEntries(
    animals.map((animal, i) => [
      i,
      { name: animal, animal, color: PLAYER_COLORS[i] },
    ])
  );

// Fixed players for the store screenshots, each picked to read well on their
// plate color (player order follows the PlayerProvider defaults)
const screenshotPlayers = playersOf(["Fox", "Penguin", "Frog", "Koala"]);

// The four animals whose names run longest in the running language, so the
// fit check photographs the nameplates at their widest
const fitCheckPlayers = () =>
  playersOf(
    (Object.keys(Animals) as AnimalName[])
      .sort((a, b) => animalName(b).length - animalName(a).length)
      .slice(0, 4)
  );

export const screenshotPlayersFor = (state: BoardState) =>
  state.startsWith("fitCheck") ? fitCheckPlayers() : screenshotPlayers;

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
  return state !== undefined && isScreenshotState(state) ? state : null;
};

// Two-player states say so in their name; everything else is a four-player game
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
