import React from "react";
import Svg, { Circle, Path } from "svgs";

import { colors } from "../constants/colors";

interface CrosshairIconProps {
  size?: number;
}

// A chunky crosshair: ring, four ticks, and a centre dot, in the same flat
// style as the cog
const CrosshairIcon = ({ size = 28 }: CrosshairIconProps) => (
  <Svg title="Center" width={size} height={size} viewBox="0 0 32 32">
    <Circle
      cx={16}
      cy={16}
      r={9}
      fill="none"
      stroke={colors.grayDark}
      strokeWidth={4}
    />
    <Path
      d="M16 2.5V7.5M16 24.5V29.5M2.5 16H7.5M24.5 16H29.5"
      fill="none"
      stroke={colors.grayDark}
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Circle cx={16} cy={16} r={2.75} fill={colors.grayDark} />
  </Svg>
);

export default CrosshairIcon;
