import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

// Shared between the native (Portal + Animated) and web (Modal) variants so
// both stay call-compatible.
export interface DialogProps {
  children?: ReactNode;
  isVisible: boolean;
  hide: () => void;
  style?: StyleProp<ViewStyle>;
}
