import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import TriangleBackground from "./trianglify.png";
import { colors } from "../constants/colors";
import PlayerButton from "../PlayerButton";
import Logo from "../Logo";
import Settings from "../Settings";
import SettingsButton from "../Settings/SettingsButton";
import Toggle from "../Toggle";
import type { GameMode } from "../Matchimals/game";

const modeCaptions: Record<GameMode, string> = {
  easy: "Always a match to make",
  classic: "Match if you can, pass if not",
};

const PLAYER_COUNTS = [1, 2, 3, 4];

const Menu = ({
  startGame,
  gameMode,
  setGameMode,
}: {
  startGame: (numPlayers: number) => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
}) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Phone-sized viewports get a tighter column
  const compact = width < 500 || height < 700;
  // A phone on its side has no height to spare for the 2×2 grid, so landscape
  // lines the player buttons up in a single row and trims the vertical gaps
  const landscape = width > height;
  const tight = compact && landscape;

  const [showSettings, setShowSettings] = useState(false);

  const captionOpacity = useSharedValue(0);
  useEffect(() => {
    captionOpacity.value = 0;
    captionOpacity.value = withTiming(1, { duration: 350 });
  }, [gameMode, captionOpacity]);

  const captionStyle = useAnimatedStyle(() => ({
    opacity: captionOpacity.value,
  }));

  return (
    <ImageBackground source={TriangleBackground} style={styles.root}>
      <View
        style={[
          styles.column,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Logo
          outline
          width={tight ? 260 : compact ? 320 : 420}
          style={{ marginBottom: tight ? 12 : compact ? 20 : 48 }}
        />
        <Text
          style={[
            styles.text,
            compact && styles.textCompact,
            tight && styles.textTight,
          ]}
        >
          HOW MANY PLAYERS?
        </Text>
        <View style={[styles.players, !landscape && styles.playersGrid]}>
          {PLAYER_COUNTS.map((numPlayers) => (
            <PlayerButton
              key={numPlayers}
              number={numPlayers}
              onPress={() => {
                startGame(numPlayers);
              }}
              style={landscape ? styles.playerButtonRow : styles.playerButton}
            />
          ))}
        </View>

        <Toggle
          options={[
            { label: "EASY MODE", value: "easy" },
            { label: "CLASSIC", value: "classic" },
          ]}
          value={gameMode}
          onChange={setGameMode}
          style={{ marginTop: tight ? 12 : compact ? 16 : 24 }}
        />
        <Reanimated.Text
          style={[
            styles.caption,
            compact && styles.captionCompact,
            captionStyle,
          ]}
        >
          {modeCaptions[gameMode]}
        </Reanimated.Text>
      </View>

      <SettingsButton
        onPress={() => setShowSettings(true)}
        style={{
          position: "absolute",
          top: Math.max(insets.top, 16),
          right: Math.max(insets.right, 16),
        }}
      />
      <Settings isVisible={showSettings} hide={() => setShowSettings(false)} />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  column: {
    alignItems: "center",
  },
  text: {
    color: colors.grayDark,
    fontFamily: "Dimbo",
    fontSize: 48,
    lineHeight: 60,
    marginBottom: 32,
  },
  textCompact: {
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 16,
  },
  textTight: {
    marginBottom: 8,
  },
  players: {
    flexDirection: "row",
    justifyContent: "center",
  },
  // Two buttons per row
  playersGrid: {
    width: 280,
    flexWrap: "wrap",
  },
  playerButton: {
    margin: 6,
  },
  playerButtonRow: {
    marginHorizontal: 6,
  },
  caption: {
    // The animated fade owns the opacity prop
    color: colors.grayDark,
    fontFamily: "Dimbo",
    fontSize: 22,
    lineHeight: 28,
    marginTop: 12,
    width: 320,
    // Both captions are single-line; fixed height keeps the layout stable
    height: 28,
    textAlign: "center",
  },
  captionCompact: {
    marginTop: 8,
  },
});

export default Menu;
