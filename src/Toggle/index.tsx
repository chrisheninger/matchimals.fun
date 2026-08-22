import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ViewProps } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "../constants/colors";
import { haptics } from "../haptics";

const SEGMENT_WIDTH = 150;
const SEGMENT_HEIGHT = 56;

// Quick ease-out slide — a clean toggle-switch feel, no overshoot
const SLIDE = { duration: 220, easing: Easing.out(Easing.cubic) };

export interface ToggleOption<T extends string> {
  label: string;
  value: T;
}

interface ToggleProps<T extends string> extends ViewProps {
  options: [ToggleOption<T>, ToggleOption<T>];
  value: T;
  onChange: (value: T) => void;
}

const Toggle = <T extends string>({
  options,
  value,
  onChange,
  style,
  ...rest
}: ToggleProps<T>) => {
  const activeIndex = options[1].value === value ? 1 : 0;

  const translateX = useSharedValue(activeIndex * SEGMENT_WIDTH);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      translateX.value = activeIndex * SEGMENT_WIDTH;
      return;
    }
    translateX.value = withTiming(activeIndex * SEGMENT_WIDTH, SLIDE);
  }, [activeIndex, translateX]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.track, style]}
      {...rest}
    >
      <View style={styles.trackInner}>
        <Reanimated.View style={[styles.thumb, thumbStyle]} />
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: option.value === value }}
            style={styles.segment}
            onPress={() => {
              if (option.value !== value) {
                haptics.select();
                onChange(option.value);
              }
            }}
          >
            <Text
              style={[
                styles.label,
                option.value !== value && styles.labelInactive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Fully flat, like the rest of the app. If the app ever gets a hard
  // "flat shadow" design pass, this pill is a natural candidate for one.
  track: {
    backgroundColor: colors.blueGrayLight,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: "#fff",
  },
  trackInner: {
    flexDirection: "row",
    borderWidth: 4,
    borderColor: colors.grayDark,
    borderRadius: 12,
    overflow: "hidden",
  },
  thumb: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SEGMENT_WIDTH,
    backgroundColor: colors.yellowLight,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.yellowDark,
  },
  segment: {
    width: SEGMENT_WIDTH,
    height: SEGMENT_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Dimbo",
    fontSize: 26,
    color: colors.grayDark,
  },
  labelInactive: {
    opacity: 0.4,
  },
});

export default Toggle;
