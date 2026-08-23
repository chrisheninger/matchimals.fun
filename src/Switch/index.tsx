import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PressableProps } from "react-native";
import Reanimated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "../constants/colors";
import { haptics } from "../haptics";
import { caps, displayFont, t } from "../i18n";

const WIDTH = 96;
const HEIGHT = 56;
const BORDER = 4;
// The thumb fills one half of the inner track and slides across to the other
const HALF_WIDTH = (WIDTH - 4 * BORDER) / 2;

// Quick ease-out slide, matching the mode Toggle
const SLIDE = { duration: 220, easing: Easing.out(Easing.cubic) };

interface SwitchProps extends Omit<PressableProps, "onPress" | "style"> {
  value: boolean;
  onChange: (value: boolean) => void;
}

// An on/off switch in the app's cartoon button style: the thumb slides right
// and the track turns green when on, uncovering the ON/OFF label behind it.
const Switch = ({ value, onChange, ...rest }: SwitchProps) => {
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, SLIDE);
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.blueGrayLight, colors.greenLight]
    ),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * HALF_WIDTH }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => {
        onChange(!value);
        haptics.select();
      }}
      {...rest}
    >
      <Reanimated.View style={[styles.track, trackStyle]}>
        <View style={styles.trackInner}>
          <View style={styles.half}>
            <Text style={styles.label}>{caps(t("on"))}</Text>
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>{caps(t("off"))}</Text>
          </View>
          <Reanimated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </Reanimated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // The animated track color owns backgroundColor
  track: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: 16,
    borderWidth: BORDER,
    borderColor: "#fff",
  },
  trackInner: {
    flex: 1,
    flexDirection: "row",
    borderWidth: BORDER,
    borderColor: colors.grayDark,
    borderRadius: 12,
    overflow: "hidden",
  },
  half: {
    width: HALF_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...displayFont,
    fontSize: 18,
    color: colors.grayDark,
    opacity: 0.5,
  },
  thumb: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: HALF_WIDTH,
    borderRadius: 8,
    backgroundColor: colors.yellowLight,
    borderWidth: 3,
    borderColor: colors.yellowDark,
  },
});

export default Switch;
