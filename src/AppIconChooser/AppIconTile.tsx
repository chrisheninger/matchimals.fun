import React from "react";
import { Image, StyleSheet, View } from "react-native";

import Animals from "../Animals";
import type { AnimalName } from "../Animals";
import WoodBackground from "../Table/wood-background.jpg";

// iOS app icons have continuous-curve corners of roughly 22% of the icon size
export const tileRadius = (size: number) => Math.round(size * 0.22);

interface AppIconTileProps {
  animal: AnimalName;
  size?: number;
}

// A miniature of the real app icon: the animal on the wood table at the
// icon's proportions (the art is 3/4 of the icon, nudged down 28/1024 so the
// face sits on the optical center — see scripts/generate-app-icons.mjs).
const AppIconTile = ({ animal, size = 72 }: AppIconTileProps) => {
  const Icon = Animals[animal];
  const art = Math.round(size * 0.75);
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: tileRadius(size) },
      ]}
    >
      <Image source={WoodBackground} style={styles.wood} resizeMode="cover" />
      <Icon
        width={art}
        height={art}
        style={{ transform: [{ translateY: (size * 28) / 1024 }] }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderCurve: "continuous",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  wood: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});

export default AppIconTile;
