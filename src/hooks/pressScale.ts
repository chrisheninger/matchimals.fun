import { useCallback } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// A button shrinks a touch while held and springs back on release
const PRESSED_SCALE = 0.95;
const PRESS = { duration: 80 };
const RELEASE = { damping: 14, stiffness: 260 };

export const usePressScale = () => {
  const scale = useSharedValue(1);
  const onPressIn = useCallback(() => {
    scale.value = withTiming(PRESSED_SCALE, PRESS);
  }, [scale]);
  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, RELEASE);
  }, [scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return { style, onPressIn, onPressOut };
};
