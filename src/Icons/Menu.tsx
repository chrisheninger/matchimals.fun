import React from "react";
import Svg, { Path } from "svgs";

import { colors } from "../constants/colors";

interface MenuIconProps {
  size?: number;
}

// Three bars, the in-game menu button
const MenuIcon = ({ size = 28 }: MenuIconProps) => (
  <Svg title="Menu" width={size} height={size} viewBox="0 0 32 32">
    <Path
      d="M6 9H26M6 16H26M6 23H26"
      fill="none"
      stroke={colors.grayDark}
      strokeWidth={4}
      strokeLinecap="round"
    />
  </Svg>
);

export default MenuIcon;
