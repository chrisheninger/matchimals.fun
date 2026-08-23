import React from "react";
import Svg, { Path } from "svgs";

import { colors } from "../constants/colors";
import { t } from "../i18n";

interface ShareIconProps {
  size?: number;
}

// An arrow rising out of a tray, the platform's own share glyph in the flat
// style of the other buttons
const ShareIcon = ({ size = 28 }: ShareIconProps) => (
  <Svg title={t("share")} width={size} height={size} viewBox="0 0 32 32">
    <Path
      d="M11 12.5H8.5A2.5 2.5 0 0 0 6 15V25A2.5 2.5 0 0 0 8.5 27.5H23.5A2.5 2.5 0 0 0 26 25V15A2.5 2.5 0 0 0 23.5 12.5H21"
      fill="none"
      stroke={colors.grayDark}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 19V4.5M10.5 10L16 4.5L21.5 10"
      fill="none"
      stroke={colors.grayDark}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default ShareIcon;
