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
import AudioControls from "../AudioControls";
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
  // On phone-sized viewports the full column collides with the
  // bottom-right audio controls, so tighten the top of the column
  const compact = width < 500 || height < 700;

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
      <>
        <Logo
          width={compact ? 224 : 306}
          height={compact ? 44 : 60}
          style={{ marginBottom: compact ? 20 : 48 }}
        />
        <Text style={[styles.text, compact && styles.textCompact]}>
          HOW MANY PLAYERS?
        </Text>
        <View
          style={{
            width: 280,
            flexDirection: "row",
            flexWrap: "wrap",
          }}
        >
          <PlayerButton
            number={1}
            onPress={() => {
              startGame(1);
            }}
            style={{ margin: 6 }}
          />
          <PlayerButton
            number={2}
            onPress={() => {
              startGame(2);
            }}
            style={{ margin: 6 }}
          />
          <PlayerButton
            number={3}
            onPress={() => {
              startGame(3);
            }}
            style={{ margin: 6 }}
          />
          <PlayerButton
            number={4}
            onPress={() => {
              startGame(4);
            }}
            style={{ margin: 6 }}
          />
        </View>

        <Toggle
          options={[
            { label: "EASY MODE", value: "easy" },
            { label: "CLASSIC", value: "classic" },
          ]}
          value={gameMode}
          onChange={setGameMode}
          style={{ marginTop: compact ? 16 : 24 }}
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

        <View
          style={{
            position: "absolute",
            bottom: Math.max(insets.bottom, 8),
            right: Math.max(insets.right, 8),
            flexDirection: "row",
            gap: 12,
          }}
        >
          <AudioControls />
          <SettingsButton onPress={() => setShowSettings(true)} />
        </View>
        <Settings
          isVisible={showSettings}
          hide={() => setShowSettings(false)}
        />
      </>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
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
