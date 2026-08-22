import React from "react";
import { StyleSheet, View } from "react-native";

import Logo, { logoHeight } from "../Logo";

const WIDTH = 300;
const HEIGHT = logoHeight(WIDTH, "bold");

// The sticker logo straddles the card's top edge, half of it outside
export const HEADER_OVERHANG = Math.round(HEIGHT / 2);
// Content padding that clears the half inside the card, plus a gap
export const HEADER_CLEARANCE = HEADER_OVERHANG + 8;

// Every dialog wears the logo as its header
const Header = () => (
  <View pointerEvents="none" style={styles.header}>
    <Logo outline="bold" width={WIDTH} />
  </View>
);

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: -HEADER_OVERHANG,
    left: "50%",
    marginLeft: -WIDTH / 2,
    width: WIDTH,
    height: HEIGHT,
  },
});

export default Header;
