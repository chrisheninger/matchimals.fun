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

interface SettingsProps {
  isVisible: boolean;
  hide: () => void;
}

// Music and sound-effect switches, plus the app-icon picker where the
// platform supports alternate icons. Reached from both menus.
const Settings = ({ isVisible, hide }: SettingsProps) => {
  const music = useMusic();
  const { appIcon, setAppIcon } = useAppIcon();
  // The chooser opens on top of this dialog, so a pick lands back here
  const [showAppIconChooser, setShowAppIconChooser] = useState(false);

  return (
    <>
      <Dialog isVisible={isVisible} hide={hide} style={{ maxWidth: 360 }}>
        <Title>SETTINGS</Title>
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
    fontFamily: "Dimbo",
    fontSize: 28,
    lineHeight: 34,
  },
});

export default Settings;
