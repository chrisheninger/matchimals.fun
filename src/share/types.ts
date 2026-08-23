import type { RefObject } from "react";
import type { View } from "react-native";

// Shared between the native (share sheet) and web (Web Share API) variants so
// both stay call-compatible.
export interface ShareVictoryOptions {
  // The line that travels with the image: the result, and the link
  text: string;
  // For share targets that want one, like Mail
  subject: string;
  // iPad presents the sheet as a popover anchored to this view
  anchor?: RefObject<View | null>;
}

// Captures the mounted ShareCard as a PNG and hands it, with the text, to
// whatever the platform offers for sharing.
export type ShareVictory = (
  card: RefObject<View | null>,
  options: ShareVictoryOptions
) => Promise<void>;
