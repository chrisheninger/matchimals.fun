import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAsyncStorage } from "@react-native-async-storage/async-storage";
import InAppReview from "react-native-in-app-review";

import { usePlayerConfig } from "../hooks/players";
import { colors } from "../constants/colors";

import Animals from "../Animals";
import Button from "../Button";
import { haptics } from "../haptics";
import Confetti from "../Confetti";
import Header, { HEADER_CLEARANCE } from "../Dialog/Header";
import Title from "../Dialog/Title";
import { ExitIcon } from "../Icons";
import type { PlayerState } from "../Matchimals/game";
import type { PlayerId } from "../hooks/players";

interface VictoryProps {
  backToMainMenu: () => void;
  player: PlayerId;
  players: Record<string, PlayerState>;
}

// The end-of-game card: the dialog chrome (logo header, white card) over
// confetti, with the winner's circle in their colour. Not dismissable — the
// only way out is back to the main menu.
const Victory = ({ backToMainMenu, player, players }: VictoryProps) => {
  const {
    getItem: getAsyncLastReviewPrompt,
    setItem: setAsyncLastReviewPrompt,
  } = useAsyncStorage("lastReviewPrompt");
  const { playerConfig } = usePlayerConfig();
  const score = players[player]?.score;
  const name = playerConfig[player]?.name;
  const backgroundColor = playerConfig[player]?.color;
  const Icon = Animals[playerConfig[player]?.animal];

  useEffect(() => {
    haptics.celebrate();
  }, []);

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
      <View style={styles.card}>
        <View
          style={[
            styles.animal,
            { backgroundColor: backgroundColor || colors.grayLight },
          ]}
        >
          <Icon width={80} height={80} />
        </View>
        <Title>{name.toUpperCase()} WINS!</Title>
        <Text style={styles.score}>{score}</Text>
        <Button
          color={colors.redLight}
          icon={<ExitIcon />}
          onPress={handleEndGame}
          style={styles.exit}
        >
          EXIT TO MAIN MENU
        </Button>
        <Header />
      </View>
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
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
    paddingTop: HEADER_CLEARANCE + 8,
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
    fontFamily: "Dimbo",
    fontSize: 80,
    lineHeight: 96,
    textAlign: "center",
  },
  exit: {
    alignSelf: "stretch",
    marginTop: 12,
  },
});

export default Victory;
