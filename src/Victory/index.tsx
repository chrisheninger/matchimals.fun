import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useAsyncStorage } from "@react-native-async-storage/async-storage";
import InAppReview from "react-native-in-app-review";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePlayerConfig } from "../hooks/players";
import { colors } from "../constants/colors";

import Animals from "../Animals";
import Button from "../Button";
import { haptics } from "../haptics";
import Confetti from "../Confetti";
import Header, { HEADER_CLEARANCE, HEADER_OVERHANG } from "../Dialog/Header";
import Title from "../Dialog/Title";
import { ExitIcon, ShareIcon } from "../Icons";
import type { GameState, PlayerState } from "../Matchimals/game";
import type { PlayerId } from "../hooks/players";
import { animalName, caps, displayFont, t } from "../i18n";
import { animalEmoji } from "../constants/emoji";
import { Portal } from "../Overlay";
import ShareCard, { SHARE_CARD_WIDTH } from "../ShareCard";
import { shareVictory } from "../share";

const SHARE_URL = "https://www.matchimals.com";

interface VictoryProps {
  backToMainMenu: () => void;
  player: PlayerId;
  players: Record<string, PlayerState>;
  cells: GameState["cells"];
  // Cards stranded in the deck when the game ended with no legal move left
  cardsLeft: number;
}

// The end-of-game card: the dialog chrome (logo header, white card) over
// confetti, with the winner's circle in their color. Not dismissable — the
// only way out is back to the main menu. Share hands the finished board to
// the system share sheet as a picture.
const Victory = ({
  backToMainMenu,
  player,
  players,
  cells,
  cardsLeft,
}: VictoryProps) => {
  const {
    getItem: getAsyncLastReviewPrompt,
    setItem: setAsyncLastReviewPrompt,
  } = useAsyncStorage("lastReviewPrompt");
  const { playerConfig } = usePlayerConfig();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const score = players[player]?.score;
  const animal = playerConfig[player]?.animal;
  const backgroundColor = playerConfig[player]?.color;
  const Icon = Animals[animal];
  const shareCardRef = useRef<View>(null);
  const shareAnchorRef = useRef<View>(null);
  // One capture at a time: a second tap while the sheet is opening would
  // stack two sheets
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    haptics.celebrate();
  }, []);

  const handleShare = async () => {
    if (sharing) {
      return;
    }
    setSharing(true);
    const name = animalName(animal);
    try {
      await shareVictory(shareCardRef, {
        text: t("shareMessage", {
          emoji: animalEmoji[animal],
          url: SHARE_URL,
        }),
        subject: t("wins", { name }),
        anchor: shareAnchorRef,
      });
    } catch (error) {
      console.log(error);
    } finally {
      setSharing(false);
    }
  };

  const handleEndGame = async () => {
    const asyncLastReviewPrompt = await getAsyncLastReviewPrompt();
    const lastPrompt = asyncLastReviewPrompt && new Date(asyncLastReviewPrompt);
    const thirtyDaysAgo = new Date(
      new Date().setDate(new Date().getDate() - 30)
    );

    // No stored prompt date counts as "long ago" (epoch)
    if (
      InAppReview.isAvailable() &&
      (lastPrompt || new Date(0)) < thirtyDaysAgo
    ) {
      InAppReview.RequestInAppReview()
        .then((hasFlowFinishedSuccessfully) => {
          if (hasFlowFinishedSuccessfully) {
            setAsyncLastReviewPrompt(new Date().toISOString());
          }
        })
        .catch((error) => {
          console.log(error);
        });
    }

    backToMainMenu();
  };

  return (
    <View style={styles.root}>
      <Confetti />
      <View
        style={[
          styles.card,
          {
            // A phone on its side is shorter than the card: cap it so the
            // content scrolls instead of the buttons leaving the screen, with
            // room above for the logo poking out the top
            maxHeight:
              height - insets.top - insets.bottom - HEADER_OVERHANG * 2 - 32,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.animal,
              { backgroundColor: backgroundColor || colors.grayLight },
            ]}
          >
            <Icon width={80} height={80} />
          </View>
          <Title>{caps(t("wins", { name: animalName(animal) }))}</Title>
          <Text style={styles.score}>{score}</Text>
          <View ref={shareAnchorRef} collapsable={false} style={styles.share}>
            <Button
              accessibilityLabel={t("share")}
              disabled={sharing}
              icon={<ShareIcon />}
              onPress={handleShare}
            >
              {caps(t("share"))}
            </Button>
          </View>
          <Button
            color={colors.redLight}
            icon={<ExitIcon />}
            onPress={handleEndGame}
            style={styles.exit}
          >
            {caps(t("exitToMainMenu"))}
          </Button>
        </ScrollView>
        <Header />
      </View>
      {cardsLeft > 0 ? (
        // The deck fades out under this overlay; its corner instead says why
        // the game ended with cards to spare
        <View
          style={[
            styles.leftover,
            {
              bottom: Math.max(insets.bottom, 16),
              left: Math.max(insets.left, 16),
            },
          ]}
        >
          <Text style={styles.leftoverText}>{t("noCardFits")}</Text>
        </View>
      ) : null}
      {/* The picture to share, laid out at full size beside the screen where
          nothing shows it, and captured from there on demand */}
      <Portal>
        <View pointerEvents="none" collapsable={false} style={styles.shareCard}>
          <ShareCard
            ref={shareCardRef}
            cells={cells}
            winner={player}
            players={players}
            playerConfig={playerConfig}
          />
        </View>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    // The gutter lives here rather than as a margin on the card: a stretched
    // child capped by maxWidth sits at the cross-start instead of centering
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  // The same card as Dialog, at the menu dialog's width
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
  },
  content: {
    alignItems: "center",
    paddingTop: HEADER_CLEARANCE,
  },
  animal: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  score: {
    color: colors.grayDark,
    ...displayFont,
    fontSize: 80,
    lineHeight: 96,
    textAlign: "center",
  },
  share: {
    alignSelf: "stretch",
    marginTop: 12,
  },
  exit: {
    alignSelf: "stretch",
    marginTop: 12,
  },
  leftover: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  leftoverText: {
    color: colors.grayDark,
    ...displayFont,
    fontSize: 20,
    lineHeight: 26,
  },
  shareCard: {
    position: "absolute",
    top: 0,
    left: -(SHARE_CARD_WIDTH + 100),
  },
});

export default Victory;
