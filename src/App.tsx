import React, { useCallback, useEffect, useMemo } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { useAsyncStorage } from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Client } from "boardgame.io/react-native";
import { colors } from "./constants/colors";

import Matchimals from "./Matchimals";
import { createGame } from "./Matchimals/game";
import type { GameMode } from "./Matchimals/game";
import MainMenu from "./MainMenu";
import { MusicProvider } from "./Music";
import { PlayerProvider } from "./hooks/players";
import { OverlayProvider } from "./Overlay";
import {
  isBoardState,
  playersForState,
  useScreenshotState,
} from "./screenshots";

const SCREEN_FADE = 200;

export default function App() {
  const [isMainMenuVisible, setIsMainMenuVisible] = React.useState(true);
  const [numPlayers, setNumPlayers] = React.useState(1);

  const [numGamesPlayed, setNumGamesPlayed] = React.useState("0");
  const { getItem: getAsyncNumGamesPlayed, setItem: setAsyncNumGamesPlayed } =
    useAsyncStorage("numGamesPlayed");

  const [gameMode, setGameMode] = React.useState<GameMode>("easy");
  const { getItem: getAsyncGameMode, setItem: setAsyncGameMode } =
    useAsyncStorage("gameMode");

  // Hydrate the last-chosen mode once on mount (defaults to easy)
  useEffect(() => {
    getAsyncGameMode().then((storedMode) => {
      if (storedMode === "easy" || storedMode === "classic") {
        setGameMode(storedMode);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetGameMode = useCallback(
    (mode: GameMode) => {
      setGameMode(mode);
      setAsyncGameMode(mode);
    },
    [setAsyncGameMode]
  );

  const onMount = async () => {
    const asyncNumGamesPlayed = await getAsyncNumGamesPlayed();

    setNumGamesPlayed(asyncNumGamesPlayed ?? "0");
  };

  const handleIncrementGamesPlayed = useCallback(() => {
    const stringNumberWow = `${Number(numGamesPlayed) + 1}`;
    console.log("You are playing Game Number: " + stringNumberWow);
    setNumGamesPlayed(stringNumberWow);
    setAsyncNumGamesPlayed(stringNumberWow);
  }, [numGamesPlayed, setNumGamesPlayed, setAsyncNumGamesPlayed]);

  useEffect(() => {
    onMount();
  });

  const screenshotState = useScreenshotState();
  useEffect(() => {
    if (!screenshotState) {
      return;
    }
    if (!isBoardState(screenshotState)) {
      setIsMainMenuVisible(true);
      return;
    }
    setNumPlayers(playersForState(screenshotState));
    setIsMainMenuVisible(false);
  }, [screenshotState]);

  const backToMainMenu = useCallback(() => {
    setIsMainMenuVisible(true);
  }, [setIsMainMenuVisible]);

  const startGame = useCallback(
    (numPlayers: number) => {
      setNumPlayers(numPlayers);
      setIsMainMenuVisible(false);
      handleIncrementGamesPlayed();
    },
    [handleIncrementGamesPlayed, setIsMainMenuVisible, setNumPlayers]
  );

  // Memoized so re-renders of App don't mint a new component type, which
  // would remount the board mid-game
  const MatchimalsClient = useMemo(
    () =>
      Client({
        board: Matchimals,
        game: createGame(gameMode),
        numPlayers,
        debug: false,
      }),
    [gameMode, numPlayers]
  );

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <MusicProvider>
          <PlayerProvider>
            <OverlayProvider>
              <View style={styles.root}>
                <StatusBar hidden />
                {/* The screens cross-fade: the leaving one stays mounted for
                    the length of the fade, so both fill the root */}
                {isMainMenuVisible ? (
                  <Reanimated.View
                    key="menu"
                    style={StyleSheet.absoluteFill}
                    entering={FadeIn.duration(SCREEN_FADE)}
                    exiting={FadeOut.duration(SCREEN_FADE)}
                  >
                    <MainMenu
                      startGame={startGame}
                      gameMode={gameMode}
                      setGameMode={handleSetGameMode}
                      settingsOpen={screenshotState === "settings"}
                    />
                  </Reanimated.View>
                ) : (
                  <Reanimated.View
                    key="game"
                    style={StyleSheet.absoluteFill}
                    entering={FadeIn.duration(SCREEN_FADE)}
                    exiting={FadeOut.duration(SCREEN_FADE)}
                  >
                    {/* Each screenshot state gets a fresh game: a finished
                        game ignores further moves, including restoring the
                        next snapshot */}
                    <MatchimalsClient
                      key={screenshotState ?? "game"}
                      backToMainMenu={backToMainMenu}
                      snapshot={
                        screenshotState && isBoardState(screenshotState)
                          ? screenshotState
                          : undefined
                      }
                    />
                  </Reanimated.View>
                )}
              </View>
            </OverlayProvider>
          </PlayerProvider>
        </MusicProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    position: "relative",
    width: "100%",
    // On web this fills #root, which index.html pins to the live viewport
    // (position: fixed; inset: 0) — unlike 100vh, it tracks the mobile URL bar
    // collapsing/expanding, so the deck and buttons stay on screen.
    height: "100%",
    overflow: "hidden",
    backgroundColor: colors.grayDark,
  },
});
