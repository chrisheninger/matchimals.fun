import { findNodeHandle, PixelRatio, Share } from "react-native";
import { captureRef } from "react-native-view-shot";

import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from "../ShareCard";
import type { ShareVictory } from "./types";

// The system share sheet, carrying the PNG and the text together: Messages
// and Mail send both, image-only targets keep the picture.
export const shareVictory: ShareVictory = async (
  card,
  { text, subject, anchor }
) => {
  let url: string | undefined;
  try {
    // The capture size is in points and rasterizes at the screen's scale, so
    // this lands on the card's pixel size on every screen
    const scale = PixelRatio.get();
    url = await captureRef(card, {
      format: "png",
      quality: 1,
      width: SHARE_CARD_WIDTH / scale,
      height: SHARE_CARD_HEIGHT / scale,
      result: "tmpfile",
    });
  } catch {
    // Without the picture the sheet still carries the result and the link
  }
  await Share.share(url ? { url, message: text } : { message: text }, {
    subject,
    anchor: findNodeHandle(anchor?.current ?? null) ?? undefined,
  });
};
