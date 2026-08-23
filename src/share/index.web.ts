import { captureRef } from "react-native-view-shot";

import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from "../ShareCard";
import type { ShareVictory } from "./types";

const FILE_NAME = "matchimals-victory.png";

// Rasterized by html2canvas, which can come out blank for layouts it can't
// draw; a failure here just drops the picture from the share
const renderPicture = async (
  card: Parameters<ShareVictory>[0]
): Promise<File | undefined> => {
  try {
    const dataUri = await captureRef(card, {
      format: "png",
      quality: 1,
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      result: "data-uri",
    });
    const blob = await (await fetch(dataUri)).blob();
    return new File([blob], FILE_NAME, { type: "image/png" });
  } catch {
    return undefined;
  }
};

// Browsers that can't share start a download instead, so the picture still
// ends up somewhere the player can post it from
const download = (file: File) => {
  const href = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = href;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(href);
};

// Mobile browsers get the Web Share sheet (with the picture where the browser
// can share files); desktop browsers without it download the picture and
// copy the text to the clipboard.
export const shareVictory: ShareVictory = async (card, { text, subject }) => {
  if (typeof navigator === "undefined") {
    return;
  }
  const file = await renderPicture(card);
  if (typeof navigator.share === "function") {
    const withFile = file && navigator.canShare?.({ files: [file] });
    try {
      await navigator.share(
        withFile ? { files: [file], text, title: subject } : { text }
      );
      return;
    } catch (error) {
      // Closing the sheet rejects with an AbortError; anything else (the
      // user-activation window expiring during a slow capture, a browser
      // that advertises sharing it can't do) falls through to the download
      if ((error as { name?: string })?.name === "AbortError") {
        return;
      }
    }
  }
  if (file) {
    download(file);
  }
  // Not awaited: a browser that never settles the permission would otherwise
  // leave the button stuck mid-share
  navigator.clipboard?.writeText(text).catch(() => {});
};
