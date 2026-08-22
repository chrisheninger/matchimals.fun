import React, { useState } from "react";
import { View } from "react-native";

import { colors } from "../constants/colors";
import { DevTools } from "./DevTools";
import AudioControls from "../AudioControls";
import Button from "../Button";
import Dialog from "../Dialog";
import Logo from "../Logo";
import Settings from "../Settings";
import SettingsButton from "../Settings/SettingsButton";
import type { PlayerId } from "../hooks/players";
import type { Moves } from "./DevTools";

interface MenuProps {
  moves: Moves;
  backToMainMenu: () => void;
  hide: () => void;
  isVisible: boolean;
  player: PlayerId;
  scrollToCenter: () => void;
}

const Menu = ({
  moves,
  backToMainMenu,
  hide,
  isVisible,
  player,
  scrollToCenter,
}: MenuProps) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <Dialog
        player={player}
        isVisible={isVisible}
        hide={hide}
        style={{ maxWidth: 360 }}
      >
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            marginTop: -16,
          }}
        >
          <Logo width={240} height={72} />
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            alignSelf: "center",
            marginBottom: 24,
          }}
        >
          <AudioControls />
          <SettingsButton
            onPress={() => {
              hide();
              setShowSettings(true);
            }}
          />
        </View>
        <Button
          color={colors.greenLight}
          onPress={() => {
            scrollToCenter();
            hide();
          }}
          style={{ marginBottom: 24 }}
        >
          SCROLL TO CENTER
        </Button>
        <Button
          color={colors.redLight}
          onPress={backToMainMenu}
          style={{ marginBottom: 24 }}
        >
          EXIT TO MAIN MENU
        </Button>
        <Button color="#fff" onPress={hide}>
          BACK TO GAME
        </Button>

        {(global as { __DEV__?: boolean })?.__DEV__ ? (
          <DevTools moves={moves} />
        ) : null}
      </Dialog>
      <Settings
        isVisible={showSettings}
        hide={() => setShowSettings(false)}
        player={player}
      />
    </>
  );
};

export default Menu;
