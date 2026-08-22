import React from "react";
import Svg, { Path } from "svgs";

import { colors } from "../constants/colors";

interface SkipIconProps {
  size?: number;
}

// Skip-forward: a play triangle against a bar, for passing a turn
const SkipIcon = ({ size = 28 }: SkipIconProps) => (
  <Svg title="Pass" width={size} height={size} viewBox="0 0 32 32">
    <Path
      d="M7 7.5L21.5 16L7 24.5Z"
      fill={colors.grayDark}
      stroke={colors.grayDark}
      strokeWidth={2.5}
      strokeLinejoin="round"
    />
    <Path
      d="M25.5 7.5V24.5"
      fill="none"
      stroke={colors.grayDark}
      strokeWidth={4}
      strokeLinecap="round"
    />
  </Svg>
);

export default SkipIcon;
