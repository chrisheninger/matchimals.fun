import React from "react";
import Svg, { Path } from "svgs";

import { colors } from "../constants/colors";
import { t } from "../i18n";

interface ExitIconProps {
  size?: number;
}

// A door frame open on the right with an arrow heading out through it
const ExitIcon = ({ size = 28 }: ExitIconProps) => (
  <Svg title={t("exit")} width={size} height={size} viewBox="0 0 32 32">
    <Path
      d="M18 6.5H9A3 3 0 0 0 6 9.5V22.5A3 3 0 0 0 9 25.5H18"
      fill="none"
      stroke={colors.grayDark}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13.5 16H28M22.5 10.5L28 16L22.5 21.5"
      fill="none"
      stroke={colors.grayDark}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default ExitIcon;
