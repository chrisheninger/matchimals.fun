import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppIconChooser from "../AppIconChooser";
import AppIconTile from "../AppIconChooser/AppIconTile";
import Dialog from "../Dialog";
import { useMusic } from "../Music";
import Switch from "../Switch";
import { colors } from "../constants/colors";
import { canChangeAppIcon, useAppIcon } from "../hooks/appIcon";
import type { PlayerId } from "../hooks/players";

interface SettingsProps {
  isVisible: boolean;
  hide: () => void;
  player?: PlayerId;
}

// Music and sound-effect switches, plus the app-icon picker where the
// platform supports alternate icons. Reached from both menus.
const Settings = ({ isVisible, hide, player }: SettingsProps) => {
  const music = useMusic();
  const { appIcon, setAppIcon } = useAppIcon();
  // The chooser opens on top of this dialog, so a pick lands back here
  const [showAppIconChooser, setShowAppIconChooser] = useState(false);

  return (
    <>
      <Dialog
        player={player}
        isVisible={isVisible}
        hide={hide}
        style={{ maxWidth: 360 }}
      >
        <Text style={styles.title}>SETTINGS</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Music</Text>
          <Switch
            accessibilityLabel="Music"
            value={music.musicEnabled}
            onChange={music.setMusicEnabled}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Sound Effects</Text>
          <Switch
            accessibilityLabel="Sound effects"
            value={music.soundEffectsEnabled}
            onChange={music.setSoundEffectsEnabled}
          />
        </View>
        {canChangeAppIcon ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`App icon, currently ${appIcon}`}
            accessibilityHint="Choose a different app icon"
            onPress={() => setShowAppIconChooser(true)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.label}>App Icon</Text>
            <AppIconTile animal={appIcon} size={48} />
          </Pressable>
        ) : null}
      </Dialog>
      {canChangeAppIcon ? (
        <AppIconChooser
          isVisible={showAppIconChooser}
          hide={() => setShowAppIconChooser(false)}
          value={appIcon}
          onChange={setAppIcon}
          player={player}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  title: {
    color: colors.grayDark,
    fontFamily: "Dimbo",
    fontSize: 32,
    lineHeight: 40,
    textAlign: "center",
    marginBottom: 8,
  },
  row: {
    width: 296,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  rowPressed: {
    opacity: 0.8,
  },
  label: {
    color: colors.grayDark,
    fontFamily: "Dimbo",
    fontSize: 28,
    lineHeight: 34,
  },
});

export default Settings;
