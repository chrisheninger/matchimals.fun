import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppIconChooser from "../AppIconChooser";
import AppIconTile from "../AppIconChooser/AppIconTile";
import Dialog from "../Dialog";
import DoneButton from "../Dialog/DoneButton";
import Title from "../Dialog/Title";
import { useMusic } from "../Music";
import Switch from "../Switch";
import { colors } from "../constants/colors";
import { canChangeAppIcon, useAppIcon } from "../hooks/appIcon";
import {
  canUseHaptics,
  haptics,
  setHapticsEnabled,
  useHapticsEnabled,
} from "../haptics";
import { animalName, caps, displayFont, t } from "../i18n";

interface SettingsProps {
  isVisible: boolean;
  hide: () => void;
}

// Music and sound-effect switches, plus the app-icon picker where the
// platform supports alternate icons. Reached from both menus.
const Settings = ({ isVisible, hide }: SettingsProps) => {
  const music = useMusic();
  const { appIcon, setAppIcon } = useAppIcon();
  const hapticsEnabled = useHapticsEnabled();
  // The chooser opens on top of this dialog, so a pick lands back here
  const [showAppIconChooser, setShowAppIconChooser] = useState(false);

  return (
    <>
      <Dialog isVisible={isVisible} hide={hide} style={{ maxWidth: 360 }}>
        <Title>{caps(t("settings"))}</Title>
        <View style={styles.row}>
          <Text style={styles.label}>{t("music")}</Text>
          <Switch
            accessibilityLabel={t("music")}
            value={music.musicEnabled}
            onChange={music.setMusicEnabled}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t("soundEffects")}</Text>
          <Switch
            accessibilityLabel={t("a11ySoundEffects")}
            value={music.soundEffectsEnabled}
            onChange={music.setSoundEffectsEnabled}
          />
        </View>
        {canUseHaptics ? (
          <View style={styles.row}>
            <Text style={styles.label}>{t("vibration")}</Text>
            <Switch
              accessibilityLabel={t("vibration")}
              value={hapticsEnabled}
              onChange={setHapticsEnabled}
            />
          </View>
        ) : null}
        {canChangeAppIcon ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("a11yAppIcon", {
              animal: animalName(appIcon),
            })}
            accessibilityHint={t("a11yChooseAppIcon")}
            onPress={() => {
              haptics.tap();
              setShowAppIconChooser(true);
            }}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.label}>{t("appIcon")}</Text>
            <View style={styles.tile}>
              <AppIconTile animal={appIcon} size={48} />
            </View>
          </Pressable>
        ) : null}
        <DoneButton onPress={hide} />
      </Dialog>
      {canChangeAppIcon ? (
        <AppIconChooser
          isVisible={showAppIconChooser}
          hide={() => setShowAppIconChooser(false)}
          value={appIcon}
          onChange={setAppIcon}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  // Fill the card; the minimum keeps a comfortable gap between label and switch
  // when the card hugs its content
  // Labels start, and the icon tile ends, on the 4pt white border line of the
  // switches and the DONE button
  row: {
    alignSelf: "stretch",
    minWidth: 296,
    paddingLeft: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  rowPressed: {
    opacity: 0.8,
  },
  tile: {
    marginRight: 4,
  },
  label: {
    color: colors.grayDark,
    ...displayFont,
    fontSize: 28,
    lineHeight: 34,
  },
});

export default Settings;
