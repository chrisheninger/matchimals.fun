import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { TouchableOpacityProps } from "react-native";
import Reanimated from "react-native-reanimated";

import { colors } from "../constants/colors";
import { haptics } from "../haptics";
import { usePressScale } from "../hooks/pressScale";
import { displayFont } from "../i18n";

interface CircleButtonProps extends TouchableOpacityProps {
  color?: string;
}

const CircleButton = ({
  children,
  color,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: CircleButtonProps) => {
  const press = usePressScale();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={(event) => {
        haptics.tap();
        onPress?.(event);
      }}
      onPressIn={(event) => {
        press.onPressIn();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        press.onPressOut();
        onPressOut?.(event);
      }}
      {...rest}
    >
      <Reanimated.View
        style={[
          styles.button,
          { backgroundColor: color || colors.blueLight },
          press.style,
        ]}
      >
        <View style={styles.buttonInner}>
          {typeof children === "string" ? (
            <Text style={styles.buttonText}>{children}</Text>
          ) : (
            children
          )}
        </View>
      </Reanimated.View>
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
    ...displayFont,
    fontSize: 32,
    color: colors.grayDark,
  },
});

export default CircleButton;
