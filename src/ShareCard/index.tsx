import React, { forwardRef, useMemo, useState } from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";

import Animals from "../Animals";
import Card from "../Card";
import Logo, { logoHeight } from "../Logo";
import TriangleBackground from "../MainMenu/trianglify.png";
import WoodBackground from "../Table/wood-background.jpg";
import { cardHeight, cardWidth, columns } from "../constants/board";
import type { Card as CardType } from "../constants/cards";
import { colors } from "../constants/colors";
import type { PlayerConfig, PlayerId } from "../hooks/players";
import { animalName, caps, displayFont, t } from "../i18n";
import type { PlayerState } from "../Matchimals/game";

// A 4:5 portrait, the shape every chat app and feed shows at full width
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

// The white card sits on the menu's pattern with a margin all round, wearing
// the sticker logo across its top edge like the dialogs do
const MARGIN = 40;
const CARD_TOP = 110;
const PADDING = 32;
const LOGO_WIDTH = 520;
const LOGO_HEIGHT = logoHeight(LOGO_WIDTH, true);
const LOGO_OVERHANG = Math.round(LOGO_HEIGHT / 2);
const CONTENT_TOP = LOGO_OVERHANG + 16;
const AVATAR = 196;
// The finished board floats in its frame with table showing around it
const BOARD_INSET = 24;

interface ShareCardProps {
  cells: (CardType | null)[];
  winner: PlayerId;
  players: Record<string, PlayerState>;
  playerConfig: PlayerConfig;
}

interface PlacedCard {
  id: number;
  card: CardType;
  left: number;
  top: number;
}

// The placed cards, relative to the top-left of their bounding box
const cropCells = (cells: (CardType | null)[]) => {
  const placed: { id: number; card: CardType; row: number; col: number }[] = [];
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;
  cells.forEach((card, id) => {
    if (!card) {
      return;
    }
    const row = Math.floor(id / columns);
    const col = id % columns;
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
    placed.push({ id, card, row, col });
  });
  return {
    width: placed.length ? (maxCol - minCol + 1) * cardWidth : 0,
    height: placed.length ? (maxRow - minRow + 1) * cardHeight : 0,
    cards: placed.map<PlacedCard>(({ id, card, row, col }) => ({
      id,
      card,
      left: (col - minCol) * cardWidth,
      top: (row - minRow) * cardHeight,
    })),
  };
};

// The real cards at their real size, scaled down as one layer to fit the
// frame, so the art stays the art the players just looked at
const BoardCrop = ({ cells }: { cells: (CardType | null)[] }) => {
  const [frame, setFrame] = useState<{ width: number; height: number }>();
  const crop = useMemo(() => cropCells(cells), [cells]);

  const onLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const { width, height } = nativeEvent.layout;
    setFrame({ width, height });
  };

  let scale = 0;
  if (frame && crop.cards.length) {
    scale = Math.min(
      1,
      (frame.width - BOARD_INSET * 2) / crop.width,
      (frame.height - BOARD_INSET * 2) / crop.height
    );
  }

  return (
    <View style={styles.boardFrame} onLayout={onLayout}>
      {scale > 0 ? (
        <View
          style={{ width: crop.width * scale, height: crop.height * scale }}
        >
          <View
            style={{
              width: crop.width,
              height: crop.height,
              transform: [{ scale }],
              transformOrigin: "top left",
            }}
          >
            {crop.cards.map(({ id, card, left, top }) => (
              <View
                key={id}
                style={{
                  position: "absolute",
                  left,
                  top,
                  width: cardWidth,
                  height: cardHeight,
                }}
              >
                <Card card={card} flipped disabled />
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

// The in-game nameplate a size up, frozen: no chooser, no active-turn scaling
const Plate = ({
  player,
  score,
  playerConfig,
}: {
  player: PlayerId;
  score: number;
  playerConfig: PlayerConfig;
}) => {
  const Icon = Animals[playerConfig[player]?.animal];
  return (
    <View style={styles.plate}>
      <View
        style={[
          styles.plateAnimal,
          { backgroundColor: playerConfig[player]?.color || colors.grayLight },
        ]}
      >
        <Icon width={72} height={72} />
      </View>
      <View style={styles.plateDetails}>
        <Text style={styles.plateName}>
          {animalName(playerConfig[player]?.animal)}
        </Text>
        <Text style={styles.plateScore}>{score}</Text>
      </View>
    </View>
  );
};

// A fixed scatter of confetti over the top of the picture; seeded so the same
// game always makes the same picture
const SPRINKLE_COUNT = 44;
const SPRINKLE_ZONE = CARD_TOP + CONTENT_TOP + AVATAR;
const SPRINKLE_COLORS = [
  colors.redLight,
  colors.redMedium,
  colors.orangeMedium,
  colors.yellowLight,
  colors.yellowDark,
  colors.greenLight,
  colors.greenMedium,
  colors.blueLight,
  colors.blueMedium,
  colors.purpleMedium,
];

// mulberry32: a tiny seeded generator, plenty for scattering confetti
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
};

const sprinkles = (() => {
  const random = seeded(1959);
  return Array.from({ length: SPRINKLE_COUNT }, (_, i) => {
    const small = i % 5 === 0;
    return {
      left: random() * SHARE_CARD_WIDTH,
      top: random() * SPRINKLE_ZONE,
      width: small ? 16 : 24,
      height: small ? 9 : 12,
      rotate: `${Math.round(random() * 140 - 70)}deg`,
      backgroundColor:
        SPRINKLE_COLORS[Math.floor(random() * SPRINKLE_COLORS.length)],
    };
  });
})();

const Sprinkles = () => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {sprinkles.map(({ rotate, ...piece }, i) => (
      <View
        key={i}
        style={[styles.sprinkle, piece, { transform: [{ rotate }] }]}
      />
    ))}
  </View>
);

// The trophy card a finished game turns into: the winner, the final board on
// the table, and everyone's score, at the size a chat or feed shows at full
// width. Rendered off-screen and captured as a PNG by src/share; nothing here
// is interactive.
const ShareCard = forwardRef<View, ShareCardProps>(
  ({ cells, winner, players, playerConfig }, ref) => {
    const animal = playerConfig[winner]?.animal;
    const Icon = Animals[animal];
    const standings = Object.keys(players).sort(
      (a, b) => players[b].score - players[a].score
    );

    return (
      <View ref={ref} collapsable={false} style={styles.root}>
        <ImageBackground
          source={TriangleBackground}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.cardFrame, styles.cardBackground]} />
        <Sprinkles />
        <View style={[styles.cardFrame, styles.card]}>
          <View style={styles.header}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor:
                    playerConfig[winner]?.color || colors.grayLight,
                },
              ]}
            >
              <Icon width={132} height={132} />
            </View>
            <View style={styles.titleColumn}>
              <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
                {caps(t("wins", { name: animalName(animal) }))}
              </Text>
              <View style={styles.accent} />
            </View>
            <Text style={styles.score}>{players[winner]?.score}</Text>
          </View>
          <ImageBackground
            source={WoodBackground}
            resizeMode="repeat"
            style={styles.table}
            imageStyle={styles.tableTexture}
          >
            <View style={styles.tableTop}>
              <BoardCrop cells={cells} />
              <View style={styles.plates}>
                {standings.map((player) => (
                  <Plate
                    key={player}
                    player={player}
                    score={players[player].score}
                    playerConfig={playerConfig}
                  />
                ))}
              </View>
            </View>
          </ImageBackground>
          <Text style={styles.footer}>
            matchimals.com
            <Text style={styles.footerTagline}> · {t("shareFooter")}</Text>
          </Text>
          <View pointerEvents="none" style={styles.logo}>
            <Logo bold width={LOGO_WIDTH} />
          </View>
        </View>
      </View>
    );
  }
);

ShareCard.displayName = "ShareCard";

const styles = StyleSheet.create({
  root: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    overflow: "hidden",
    backgroundColor: colors.grayDark,
  },
  cardFrame: {
    position: "absolute",
    top: CARD_TOP,
    left: MARGIN,
    width: SHARE_CARD_WIDTH - MARGIN * 2,
    height: SHARE_CARD_HEIGHT - CARD_TOP - MARGIN,
    borderRadius: 32,
  },
  // The white card and its content are separate layers so the confetti can
  // fall between them: over the card, under the words
  cardBackground: {
    backgroundColor: "#fff",
  },
  card: {
    padding: PADDING,
    paddingTop: CONTENT_TOP,
  },
  logo: {
    position: "absolute",
    top: -LOGO_OVERHANG,
    left: 0,
    right: 0,
    alignItems: "center",
    height: LOGO_HEIGHT,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    color: colors.grayDark,
    ...displayFont,
    fontSize: 80,
    lineHeight: 84,
  },
  // The dialog title's yellow underscore, at the picture's scale
  accent: {
    width: 96,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.yellowDark,
    marginTop: 8,
  },
  score: {
    color: colors.grayDark,
    ...displayFont,
    fontSize: 136,
    lineHeight: 136,
    textAlign: "right",
  },
  table: {
    flex: 1,
    marginTop: 24,
    marginBottom: 20,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: "#2A1A12",
    overflow: "hidden",
  },
  // Sized by the header above it, so the texture has to be told to fill: an
  // ImageBackground without its own width and height keeps the asset's pixel
  // size on web. The percentages resolve against the content box, which is
  // why the inset lives on the view inside rather than here.
  tableTexture: {
    width: "100%",
    height: "100%",
  },
  tableTop: {
    flex: 1,
    flexDirection: "row",
    padding: BOARD_INSET,
  },
  boardFrame: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  plates: {
    justifyContent: "center",
    marginLeft: BOARD_INSET,
    gap: 12,
  },
  plate: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 54,
    borderColor: "#fff",
    borderWidth: 4,
  },
  plateAnimal: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  plateDetails: {
    minWidth: 150,
    height: 100,
    justifyContent: "center",
    paddingLeft: 20,
    paddingRight: 20,
  },
  plateName: {
    color: colors.grayDark,
    ...displayFont,
    fontSize: 30,
    lineHeight: 36,
    marginTop: 5, // The line-height on this font is funky, this visually centers it
  },
  plateScore: {
    color: colors.grayDark,
    ...displayFont,
    fontSize: 60,
    lineHeight: 72,
    marginTop: -8, // The line-height on this font is funky, this visually centers it
  },
  footer: {
    color: colors.grayDark,
    ...displayFont,
    fontSize: 40,
    lineHeight: 48,
    textAlign: "center",
  },
  footerTagline: {
    color: colors.grayMedium,
  },
  sprinkle: {
    position: "absolute",
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    borderTopLeftRadius: 2.6,
    borderTopRightRadius: 2.6,
  },
});

export default ShareCard;
