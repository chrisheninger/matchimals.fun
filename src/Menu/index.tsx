import React, { useState } from "react";

import { colors } from "../constants/colors";
import { DevTools } from "./DevTools";
import Button from "../Button";
import { CogIcon, CrosshairIcon, ExitIcon } from "../Icons";
import Dialog from "../Dialog";
import DoneButton from "../Dialog/DoneButton";
import Settings from "../Settings";
import type { Moves } from "./DevTools";

interface MenuProps {
  moves: Moves;
  backToMainMenu: () => void;
  hide: () => void;
  isVisible: boolean;
  scrollToCenter: () => void;
}

const Menu = ({
  moves,
  backToMainMenu,
  hide,
  isVisible,
  scrollToCenter,
}: MenuProps) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <Dialog isVisible={isVisible} hide={hide} style={{ maxWidth: 360 }}>
        <Button
          icon={<CogIcon />}
          onPress={() => {
            hide();
            setShowSettings(true);
          }}
          style={{ marginTop: 8 }}
        >
          SETTINGS
        </Button>
        <Button
          color={colors.greenLight}
          icon={<CrosshairIcon />}
          onPress={() => {
            scrollToCenter();
            hide();
          }}
          style={{ marginTop: 16 }}
        >
          SCROLL TO CENTER
        </Button>
        <Button
          color={colors.redLight}
          icon={<ExitIcon />}
          onPress={backToMainMenu}
          style={{ marginTop: 16 }}
        >
          EXIT TO MAIN MENU
        </Button>
        <DoneButton onPress={hide} style={{ marginTop: 32 }} />

        {(global as { __DEV__?: boolean })?.__DEV__ ? (
          <DevTools moves={moves} />
        ) : null}
      </Dialog>
      <Settings isVisible={showSettings} hide={() => setShowSettings(false)} />
    </>
  );
};

export default Menu;
