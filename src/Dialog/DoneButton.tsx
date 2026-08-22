import React from "react";
import { StyleSheet } from "react-native";
import type { TouchableOpacityProps } from "react-native";

import Button from "../Button";

// The white DONE button that closes a dialog, set apart from the content
// above it
const DoneButton = ({ style, ...rest }: TouchableOpacityProps) => (
  <Button color="#fff" style={[styles.done, style]} {...rest}>
    DONE
  </Button>
);

const styles = StyleSheet.create({
  done: {
    marginTop: 16,
  },
});

export default DoneButton;
