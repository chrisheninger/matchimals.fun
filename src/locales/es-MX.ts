import es from "./es";
import type { Translations } from "./types";

// Latin-American Spanish: the words iOS itself uses there ("Configuración",
// "Listo", "ícono") over the European ones
const esMX: Translations = {
  ...es,
  settings: "Configuración",
  appIcon: "Ícono de la app",
  done: "Listo",
  a11yAppIcon: "Ícono de la app, ahora {animal}",
  a11yChooseAppIcon: "Elige otro ícono para la app",
  a11yUseAppIcon: "Usar el ícono de {animal}",
};

export default esMX;
