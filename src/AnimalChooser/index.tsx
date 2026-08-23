import React from "react";
import { StyleSheet, View } from "react-native";

import Animals from "../Animals";
import type { AnimalName } from "../Animals";
import { CHOOSER_TILE, ChooserGrid, ChooserItem } from "../Chooser";
import Dialog from "../Dialog";
import DoneButton from "../Dialog/DoneButton";
import Title from "../Dialog/Title";
import { usePlayerConfig } from "../hooks/players";
import type { PlayerId } from "../hooks/players";
import { animalName, caps, t } from "../i18n";

interface AnimalChooserProps {
  isVisible: boolean;
  hide: () => void;
  player: PlayerId;
}

// Picks the animal (and name) a player goes by, in their color
const AnimalChooser = ({ isVisible, hide, player }: AnimalChooserProps) => {
  const { playerConfig, setPlayerConfig } = usePlayerConfig();
  const { animal: current, color } = playerConfig[player];

  return (
    <Dialog isVisible={isVisible} hide={hide}>
      <Title>{caps(t("yourAnimal"))}</Title>
      <ChooserGrid>
        {(Object.keys(Animals) as AnimalName[]).map((animal) => {
          const Icon = Animals[animal];
          return (
            <ChooserItem
              key={animal}
              label={animalName(animal)}
              accessibilityLabel={t("a11yPlayAs", {
                animal: animalName(animal),
              })}
              selected={animal === current}
              radius={CHOOSER_TILE / 2}
              onPress={() => {
                setPlayerConfig({
                  ...playerConfig,
                  [player]: { name: animal, animal, color },
                });
                hide();
              }}
            >
              <View style={[styles.animal, { backgroundColor: color }]}>
                <Icon width={54} height={54} />
              </View>
            </ChooserItem>
          );
        })}
      </ChooserGrid>
      <DoneButton onPress={hide} />
    </Dialog>
  );
};

const styles = StyleSheet.create({
  animal: {
    width: CHOOSER_TILE,
    height: CHOOSER_TILE,
    borderRadius: CHOOSER_TILE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AnimalChooser;
