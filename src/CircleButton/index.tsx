import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { TouchableOpacityProps } from "react-native";

import { colors } from "../constants/colors";
import { haptics } from "../haptics";

interface CircleButtonProps extends TouchableOpacityProps {
  color?: string;
}

const CircleButton = ({
  children,
  color,
  onPress,
  ...rest
}: CircleButtonProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={(event) => {
        haptics.tap();
        onPress?.(event);
      }}
      {...rest}
    >
      <View
        style={[
          styles.button,
          {
            backgroundColor: color || colors.blueLight,
          },
        ]}
      >
        <View style={styles.buttonInner}>
          {typeof children === "string" ? (
            <Text style={styles.buttonText}>{children}</Text>
          ) : (
            children
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: "#fff",
  },
  buttonInner: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: colors.grayDark,
    borderRadius: 12,
  },
  buttonText: {
    fontFamily: "Dimbo",
    fontSize: 32,
    color: colors.grayDark,
  },
});

export default CircleButton;
