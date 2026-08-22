import React, { useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { StyleProp, TouchableOpacityProps, ViewStyle } from "react-native";
import Reanimated from "react-native-reanimated";
import { usePlayerConfig } from "../hooks/players";
import { colors } from "../constants/colors";
import Animals from "../Animals";
import { haptics } from "../haptics";
import { usePressScale } from "../hooks/pressScale";

interface PlayerButtonProps {
  number: number;
  onPress?: TouchableOpacityProps["onPress"];
  style?: StyleProp<ViewStyle>;
}

const PlayerButton = ({ number, onPress, style }: PlayerButtonProps) => {
  const { playerConfig } = usePlayerConfig();
  const press = usePressScale();
  const PlayerIcons = Array(number)
    .fill(undefined)
    .map((n, i) => Animals[playerConfig[i]["animal"]]);

  const getIconLayout = useCallback(
    function (): { size: number; margin: number; rowWidth?: number } {
      switch (number) {
        case 1: {
          return { size: 72, margin: 2 };
        }
        case 2: {
          return { size: 44, margin: 2 };
        }
        // The fixed rowWidth keeps the wrap at two icons per row —
        // three 36px icons with 2px margins would otherwise fit across.
        case 3:
        case 4: {
          return { size: 36, margin: 2, rowWidth: 80 };
        }
        default: {
          return { size: 64, margin: 2 };
        }
      }
    },
    [number]
  );
  const getBackgroundColor = useCallback(
    function () {
      switch (number) {
        case 1: {
          return colors.greenLight;
        }
        case 2: {
          return colors.blueLight;
        }
        case 3: {
          return colors.redLight;
        }
        case 4: {
          return colors.yellowLight;
        }
        default: {
          return colors.grayLight;
        }
      }
    },
    [number]
  );

  const { size, margin, rowWidth } = getIconLayout();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${number} player${number === 1 ? "" : "s"}`}
      onPress={(event) => {
        haptics.tap();
        onPress?.(event);
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      activeOpacity={0.9}
      style={style}
    >
      <Reanimated.View
        style={[
          styles.tag,
          { backgroundColor: getBackgroundColor() },
          press.style,
        ]}
      >
        <View style={styles.tagInner}>
          <View
            style={{
              width: rowWidth,
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {PlayerIcons.map((Icon, i) => (
              <Icon key={i} width={size} height={size} style={{ margin }} />
            ))}
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{number}</Text>
        </View>
      </Reanimated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tag: {
    width: 128,
    height: 128,
    borderRadius: 64,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  tagInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: colors.grayDark,
    borderRadius: 60,
  },
  // The player count, sitting on the circle's rim with the same white-then-
  // dark double ring as the circle itself
  badge: {
    position: "absolute",
    right: -8,
    bottom: -8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.grayDark,
    color: colors.grayDark,
    fontFamily: "Dimbo",
    fontSize: 22,
    lineHeight: 30,
    textAlign: "center",
    overflow: "hidden",
  },
});

export default PlayerButton;
