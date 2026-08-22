import React from "react";
import { StyleSheet, View } from "react-native";
import type { ViewProps } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import Card from "../Card";
import type { CardDropPoint } from "../Card";
import type { Card as CardType } from "../constants/cards";

interface DeckProps extends ViewProps {
  cards?: CardType[];
  onCardDrop?: (point: CardDropPoint) => boolean;
  dragCenterX?: SharedValue<number>;
  dragCenterY?: SharedValue<number>;
  dragActive?: SharedValue<boolean>;
}

const Deck = ({
  cards = [],
  onCardDrop,
  dragCenterX,
  dragCenterY,
  dragActive,
  style,
  ...rest
}: DeckProps) => (
  <View style={[styles.root, style]} {...rest}>
    {cards.map((card, i) => {
      let shadow;
      if (i !== 0) {
        shadow = {
          // A solid border reads as the card edge — real shadow props are a
          // perf problem with this many stacked cards
          borderRightWidth: 1,
          borderRightColor: "#2A1A12",
        };
      }

      return (
        <Card
          // Key by distance from the bottom of the deck so each physical card
          // keeps its component instance as the deck shrinks (index keys would
          // let the next top card inherit the just-dragged card's state)
          key={cards.length - i}
          card={card}
          onCardDrop={onCardDrop}
          dragCenterX={dragCenterX}
          dragCenterY={dragCenterY}
          dragActive={dragActive}
          flipped={i === 0}
          backLogo={i < 3}
          style={{
            position: "absolute",
            left: i === 0 ? 0 : i * 3,
            top: 0,
            ...shadow,
            zIndex: 100 - i,
          }}
          disabled={i !== 0}
        />
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  root: {
    position: "absolute",
  },
});

// Memoized (with a deferred `cards` value and stable callback/shared-value
// props from Matchimals) so the urgent placement render skips the whole deck
// stack — it re-renders a frame later, off the drop's critical frame.
export default React.memo(Deck);
