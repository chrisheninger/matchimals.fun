import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Animals from "../Animals";
import type { AnimalName } from "../Animals";
import AppIconTile, { tileRadius } from "./AppIconTile";
import Dialog from "../Dialog";
import { colors } from "../constants/colors";
import type { PlayerId } from "../hooks/players";

const TILE = 72;
const RING_GAP = 3;
const RING_WIDTH = 3;

interface AppIconChooserProps {
  isVisible: boolean;
  hide: () => void;
  value: AnimalName;
  onChange: (animal: AnimalName) => void;
  player?: PlayerId;
}

// Picks which animal is on the home-screen app icon
const AppIconChooser = ({
  isVisible,
  hide,
  value,
  onChange,
  player,
}: AppIconChooserProps) => (
  <Dialog player={player} isVisible={isVisible} hide={hide}>
    <Text style={styles.title}>APP ICON</Text>
    <View style={styles.grid}>
      {(Object.keys(Animals) as AnimalName[]).map((animal) => {
        const selected = animal === value;
        return (
          <View key={animal} style={styles.item}>
            <TouchableOpacity
              accessibilityLabel={`Use the ${animal} app icon`}
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(animal);
                hide();
              }}
              activeOpacity={0.8}
              style={[styles.ring, selected && styles.ringSelected]}
            >
              <AppIconTile animal={animal} size={TILE} />
            </TouchableOpacity>
            <Text style={styles.name}>{animal}</Text>
          </View>
        );
      })}
    </View>
  </Dialog>
);

const styles = StyleSheet.create({
  title: {
    color: colors.grayDark,
    fontFamily: "Dimbo",
    fontSize: 32,
    lineHeight: 40,
    textAlign: "center",
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  item: {
    margin: 10,
    alignItems: "center",
  },
  // Selection ring drawn outside the tile, concentric with its corners
  ring: {
    padding: RING_GAP,
    borderWidth: RING_WIDTH,
    borderColor: "transparent",
    borderRadius: tileRadius(TILE) + RING_GAP + RING_WIDTH,
    borderCurve: "continuous",
  },
  ringSelected: {
    borderColor: colors.yellowDark,
  },
  name: {
    color: colors.grayDark,
    fontFamily: "Dimbo",
    fontSize: 20,
    lineHeight: 26,
    textAlign: "center",
    marginTop: 4, // The line-height on this font is funky, this visually centers it
  },
});

export default AppIconChooser;
