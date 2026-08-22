import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animals from "../Animals";
import { usePlayerConfig } from "../hooks/players";
import AnimalChooser from "../AnimalChooser";
import { haptics } from "../haptics";
import type { NameplateProps } from "./types";

const Nameplate = ({
  player,
  players,
  currentPlayer,
  style,
}: NameplateProps) => {
  const [showAnimalChooser, setShowAnimalChooser] = useState(false);
  const { playerConfig } = usePlayerConfig();
  const active = player === currentPlayer;
  const score = players[player]?.score;
  const name = playerConfig[player]?.name;
  const backgroundColor = playerConfig[player]?.color;
  const Icon = Animals[playerConfig[player]?.animal];

  return (
    <>
      <View
        style={[styles.root, active ? styles.active : styles.inactive, style]}
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
      </View>

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
  active: {},
  inactive: {
    opacity: 0.8,
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  details: {
    width: 120,
    height: 80,
    justifyContent: "center",
    paddingLeft: 16,
  },
  name: {
    color: "#17171b",
    fontFamily: "Dimbo",
    fontSize: 24,
    lineHeight: 30,
    marginTop: 4, // The line-height on this font is funky, this visually centers it
  },
  score: {
    color: "#17171b",
    fontFamily: "Dimbo",
    fontSize: 48,
    lineHeight: 60,
    marginTop: -6, // The line-height on this font is funky, this visually centers it
  },
});

export default Nameplate;
