import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ReactNode } from "react";
import type { TouchableOpacityProps } from "react-native";

import { colors } from "../constants/colors";
import { haptics } from "../haptics";
import { displayFont } from "../i18n";

// Shared by the animal and app-icon pickers so their grids match
export const CHOOSER_TILE = 72;
const RING_GAP = 3;
const RING_WIDTH = 3;

export const ChooserGrid = ({ children }: { children: ReactNode }) => (
  <View style={styles.grid}>{children}</View>
);

interface ChooserItemProps extends Pick<TouchableOpacityProps, "onPress"> {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  // Corner radius of the tile inside, so the ring stays concentric with it
  radius: number;
  children: ReactNode;
}

// A labelled tile with the selection ring drawn outside it
export const ChooserItem = ({
  label,
  accessibilityLabel,
  selected,
  radius,
  onPress,
  children,
}: ChooserItemProps) => (
  <View style={styles.item}>
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={(event) => {
        haptics.select();
        onPress?.(event);
      }}
      activeOpacity={0.8}
      style={[
        styles.ring,
        { borderRadius: radius + RING_GAP + RING_WIDTH },
        selected && styles.ringSelected,
      ]}
    >
      {children}
    </TouchableOpacity>
    <Text
      style={styles.name}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  item: {
    margin: 10,
    alignItems: "center",
  },
  ring: {
    padding: RING_GAP,
    borderWidth: RING_WIDTH,
    borderColor: "transparent",
    borderCurve: "continuous",
  },
  ringSelected: {
    borderColor: colors.yellowDark,
  },
  // Long translated names shrink to the tile pitch (tile plus both margins)
  // instead of running into the neighbor's label
  name: {
    maxWidth: CHOOSER_TILE + 20,
    color: colors.grayDark,
    ...displayFont,
    fontSize: 20,
    lineHeight: 26,
    textAlign: "center",
    marginTop: 4, // The line-height on this font is funky, this visually centers it
  },
});
