import React from "react";

import Animals from "../Animals";
import type { AnimalName } from "../Animals";
import AppIconTile, { tileRadius } from "./AppIconTile";
import { CHOOSER_TILE, ChooserGrid, ChooserItem } from "../Chooser";
import Dialog from "../Dialog";
import DoneButton from "../Dialog/DoneButton";
import Title from "../Dialog/Title";
import { animalName, caps, t } from "../i18n";

interface AppIconChooserProps {
  isVisible: boolean;
  hide: () => void;
  value: AnimalName;
  onChange: (animal: AnimalName) => void;
}

// Picks which animal is on the home-screen app icon
const AppIconChooser = ({
  isVisible,
  hide,
  value,
  onChange,
}: AppIconChooserProps) => (
  <Dialog isVisible={isVisible} hide={hide}>
    <Title>{caps(t("appIcon"))}</Title>
    <ChooserGrid>
      {(Object.keys(Animals) as AnimalName[]).map((animal) => (
        <ChooserItem
          key={animal}
          label={animalName(animal)}
          accessibilityLabel={t("a11yUseAppIcon", {
            animal: animalName(animal),
          })}
          selected={animal === value}
          radius={tileRadius(CHOOSER_TILE)}
          onPress={() => {
            onChange(animal);
            hide();
          }}
        >
          <AppIconTile animal={animal} size={CHOOSER_TILE} />
        </ChooserItem>
      ))}
    </ChooserGrid>
    <DoneButton onPress={hide} />
  </Dialog>
);

export default AppIconChooser;
