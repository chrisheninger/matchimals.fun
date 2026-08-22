import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animals from "../Animals";
import { usePlayerConfig } from "../hooks/players";
import AnimalChooser from "../AnimalChooser";
import { haptics } from "../haptics";
import type { NameplateProps } from "./types";
import { animalName, displayFont } from "../i18n";

const Nameplate = ({
  player,
  players,
  currentPlayer,
  style,
  ...rest
}: NameplateProps) => {
  const [showAnimalChooser, setShowAnimalChooser] = useState(false);
  const { playerConfig } = usePlayerConfig();
  const active = player === currentPlayer;
  const score = players[player]?.score;
  const name = animalName(playerConfig[player]?.animal);
  const backgroundColor = playerConfig[player]?.color;
  const Icon = Animals[playerConfig[player]?.animal];

  // Drive the active/inactive transition with the core Animated API on the
  // native driver- react-native-animatable's `transition` prop oscillates on
  // the New Architecture (Fabric). Start at the resting value so plates that
  // mount inactive don't animate in.
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [active, progress]);

  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  return (
    <>
      <Animated.View
        style={[styles.root, { opacity, transform: [{ scale }] }, style]}
        {...rest}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            haptics.tap();
            setShowAnimalChooser(true);
          }}
        >
          <View
            style={[
              styles.animal,
              {
                backgroundColor: backgroundColor || "#9F9FB7",
              },
            ]}
          >
            <Icon width={60} height={60} />
          </View>
        </TouchableOpacity>
        <View style={styles.details}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.score}>{score}</Text>
        </View>
      </Animated.View>
      <AnimalChooser
        isVisible={showAnimalChooser}
        hide={() => setShowAnimalChooser(false)}
        player={player}
      />
    </>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 44,
    borderColor: "#fff",
    borderWidth: 4,
    marginBottom: 4,
  },
  animal: {
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  // Grows for the longer animal names some languages have
  details: {
    minWidth: 120,
    height: 80,
    justifyContent: "center",
    paddingLeft: 16,
  },
  name: {
    color: "#17171b",
    ...displayFont,
    fontSize: 24,
    lineHeight: 30,
    marginTop: 4, // The line-height on this font is funky, this visually centers it
  },
  score: {
    color: "#17171b",
    ...displayFont,
    fontSize: 48,
    lineHeight: 60,
    marginTop: -6, // The line-height on this font is funky, this visually centers it
  },
});

export default Nameplate;
