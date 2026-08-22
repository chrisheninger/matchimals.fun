import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ReactNode } from "react";
import type { TouchableOpacityProps } from "react-native";

import { colors } from "../constants/colors";
import { haptics } from "../haptics";

interface ButtonProps extends TouchableOpacityProps {
  color?: string;
  // Drawn after the label
  icon?: ReactNode;
}

const Button = ({ children, color, icon, onPress, ...rest }: ButtonProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={(event) => {
        haptics.tap();
        onPress?.(event);
      }}
      {...rest}
    >
      <View style={[styles.button, color && { backgroundColor: color }]}>
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>{children}</Text>
          {icon ? <View>{icon}</View> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    height: 64,
    backgroundColor: "#C5E5F0",
    borderRadius: 16,
    borderWidth: 4,
    borderColor: "#fff",
  },
  buttonInner: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: colors.grayDark,
    borderRadius: 12,
    paddingHorizontal: 32,
  },
  buttonText: {
    fontFamily: "Dimbo",
    fontSize: 32,
    color: colors.grayDark,
  },
});

export default Button;
