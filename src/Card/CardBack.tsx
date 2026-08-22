import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import CardBackground from "./card-back.png";
import { cardHeight, cardWidth } from "../constants/board";
import Logo from "../Logo";

interface CardBackProps {
  // The deck only ever shows the few backs directly under the top card; the
  // rest skip the logo so a tall deck doesn't mount hundreds of SVG paths
  logo?: boolean;
  style?: StyleProp<ViewStyle>;
}

const CardBack = ({ logo = true, style }: CardBackProps) => (
  <View style={[styles.root, style]}>
    <ImageBackground source={CardBackground} style={styles.root}>
      {logo ? <Logo width={84} /> : null}
    </ImageBackground>
  </View>
);

const styles = StyleSheet.create({
  root: {
    width: cardWidth,
    height: cardHeight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderRadius: 8,
  },
});

export default CardBack;
