import { useEffect, useState } from "react";
import { Linking, Platform } from "react-native";

import * as snapshots from "./Matchimals/snapshots";

// A screenshot link puts the app straight into a known state so
// scripts/screenshots.sh can photograph it on the simulator: the main menu, any
// board snapshot from src/Matchimals/snapshots.ts, or the victory card. Two
// forms: `matchimals://screenshot/<state>` (handy from Safari), and the
// universal link `https://www.matchimals.fun/?screenshot=<state>`, which iOS
// opens without the "Open in Matchimals?" prompt that blocks an unattended
// script. The site's apple-app-site-association only claims "/", so the
// state rides in the query string.
export type SnapshotId = keyof typeof snapshots;
export type ScreenshotState = "menu" | "victory" | SnapshotId;

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
    state === "victory" ||
    (state !== undefined && state in snapshots)
  ) {
    return state as ScreenshotState;
  }
  return null;
};

// Snapshot ids start with the player count they were recorded with
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
