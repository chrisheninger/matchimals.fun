import React from "react";
import Svg, { Path } from "svgs";

import { colors } from "../constants/colors";

interface CogIconProps {
  size?: number;
}

const CENTER = 16;
const TEETH = 8;
const OUTER_RADIUS = 14;
const ROOT_RADIUS = 10.5;
const HOLE_RADIUS = 5;

const point = (radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  const x = CENTER + radius * Math.cos(radians);
  const y = CENTER + radius * Math.sin(radians);
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
};

// Eight slightly tapered teeth around a ring, with the hub cut out
const GEAR_PATH = [
  `M${Array.from({ length: TEETH }, (_, tooth) => {
    const angle = (tooth * 360) / TEETH;
    return [
      point(ROOT_RADIUS, angle - 13),
      point(OUTER_RADIUS, angle - 9),
      point(OUTER_RADIUS, angle + 9),
      point(ROOT_RADIUS, angle + 13),
    ].join("L");
  }).join("L")}Z`,
  `M${CENTER + HOLE_RADIUS} ${CENTER}` +
    `a${HOLE_RADIUS} ${HOLE_RADIUS} 0 1 0 ${-2 * HOLE_RADIUS} 0` +
    `a${HOLE_RADIUS} ${HOLE_RADIUS} 0 1 0 ${2 * HOLE_RADIUS} 0Z`,
].join(" ");

// A settings cog in the same flat style as the audio icons; the round-joined
// stroke softens the tooth corners
const CogIcon = ({ size = 28 }: CogIconProps) => (
  <Svg title="Settings" width={size} height={size} viewBox="0 0 32 32">
    <Path
      fill={colors.grayDark}
      fillRule="evenodd"
      stroke={colors.grayDark}
      strokeWidth={1.5}
      strokeLinejoin="round"
      d={GEAR_PATH}
    />
  </Svg>
);

export default CogIcon;
