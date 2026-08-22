import { useCallback, useState } from "react";
import {
  getAppIconName,
  setAlternateAppIcon,
  supportsAlternateIcons,
} from "expo-alternate-app-icons";

import type { AnimalName } from "../Animals";
import { defaultAppIcon } from "../constants/appIcon";

// iOS only; the web and any device without alternate-icon support keep the
// primary icon and hide the chooser.
export const canChangeAppIcon = supportsAlternateIcons;

// The OS remembers the chosen icon (null means the primary), so it is read
// back from there rather than stored by the app.
const currentAppIcon = (): AnimalName =>
  canChangeAppIcon
    ? (getAppIconName() as AnimalName | null) ?? defaultAppIcon
    : defaultAppIcon;

export const useAppIcon = () => {
  const [appIcon, setAppIconState] = useState<AnimalName>(currentAppIcon);

  const setAppIcon = useCallback((animal: AnimalName) => {
    setAlternateAppIcon(animal === defaultAppIcon ? null : animal)
      .then(() => setAppIconState(animal))
      .catch((error) => console.warn("Could not change the app icon", error));
  }, []);

  return { appIcon, setAppIcon };
};
