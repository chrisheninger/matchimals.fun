import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export interface DialogProps {
  children?: ReactNode;
  isVisible: boolean;
  hide: () => void;
  style?: StyleProp<ViewStyle>;
}
