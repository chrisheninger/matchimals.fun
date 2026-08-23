import React from "react";
import type { TouchableOpacityProps } from "react-native";

import CircleButton from "../CircleButton";
import { CogIcon } from "../Icons";
import { t } from "../i18n";

// The cog that opens Settings, shown beside the audio controls in both menus
const SettingsButton = (props: TouchableOpacityProps) => (
  <CircleButton accessibilityLabel={t("settings")} {...props}>
    <CogIcon size={32} />
  </CircleButton>
);

export default SettingsButton;
