import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { TextProps } from "react-native";

import { colors } from "../constants/colors";

// The heading at the top of a dialog's content, underscored with the same
// yellow the toggles and switches use
const Title = ({ style, ...rest }: TextProps) => (
  <View style={styles.root}>
    <Text style={[styles.title, style]} {...rest} />
    <View style={styles.accent} />
  </View>
);

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: colors.grayDark,
    fontFamily: "Dimbo",
    fontSize: 40,
    lineHeight: 48,
    textAlign: "center",
  },
  accent: {
    width: 56,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.yellowDark,
    marginTop: 2,
  },
});

export default Title;
