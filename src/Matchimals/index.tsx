import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { BoardProps } from "boardgame.io/dist/types/src/client/react";

import { cardHeight, cardWidth, columns, rows } from "../constants/board";
import Deck from "../Deck";
import { PICKUP_SCALE } from "../Card";
import type { CardDropPoint } from "../Card";
import FlyingCard from "../FlyingCard";
import type { FlyingCardHandle } from "../FlyingCard";
import CircleButton from "../CircleButton";
import { MenuIcon, SkipIcon } from "../Icons";
import { haptics } from "../haptics";
import Nameplate from "../Nameplate";
import Table from "../Table";
import type { TableHandle } from "../Table";
import Menu from "../Menu";
import AnimalChooser from "../AnimalChooser";
import Victory from "../Victory";
import { isLegalMove } from "./game";
import type { GameState } from "./game";
import { usePlayerConfig } from "../hooks/players";
import { screenshotPlayersFor, snapshotForState } from "../screenshots";
import type { BoardState } from "../screenshots";
import { useMusic } from "../Music";
import { t } from "../i18n";

type MatchimalsProps = BoardProps<GameState> & {
  backToMainMenu: () => void;
  // Screenshot mode only: the board state to jump to (see src/screenshots.ts)
  snapshot?: BoardState;
};

// Memoized so the urgent placement render can skip the nameplates (they take
// deferred values and catch up a frame later, off the drop's critical frame).
const Nameplates = React.memo(
  ({
    players,
    currentPlayer,
  }: {
    players: GameState["players"];
    currentPlayer: string;
  }) => (
    <>
      {Object.keys(players).map((playerIndex) => (
        <Nameplate
          key={playerIndex}
          player={playerIndex}
          players={players}
          currentPlayer={currentPlayer}
        />
      ))}
    </>
  )
);

Nameplates.displayName = "Nameplates";

const Matchimals = ({
  backToMainMenu,
  ctx,
  G,
  moves,
  snapshot,
}: MatchimalsProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const music = useMusic();
  const tableRef = useRef<TableHandle>(null);
  const insets = useSafeAreaInsets();
  const { setPlayerConfig } = usePlayerConfig();

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    const { id, finished, stranded } = snapshotForState(snapshot);
    setPlayerConfig(screenshotPlayersFor(snapshot));
    moves.restoreSnapshot(id, finished, stranded);
    tableRef.current?.scrollToCenter();
    setShowMenu(snapshot === "gameMenu");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  // A placement commits the game state at release, but nothing may MOUNT while
  // the FlyingCard overlay is mid-flight: Fabric applies mounts on the main
  // thread, and a placed card's SVG tree landing mid-animation stalls frames
  // (visible jank). So the UI renders from a frozen display snapshot during
  // the flight; when the overlay lands, the snapshot catches up in one render
  // (board card, deck advance, nameplates) underneath the static overlay,
  // where a render hitch is invisible, and then the overlay fades.
  const [frozen, setFrozen] = useState(false);
  const [display, setDisplay] = useState(() => ({
    G,
    currentPlayer: ctx.currentPlayer,
  }));
  if (
    !frozen &&
    (display.G !== G || display.currentPlayer !== ctx.currentPlayer)
  ) {
    // Render-phase sync (React's "adjust state during render" pattern) keeps
    // the snapshot current whenever it isn't deliberately frozen.
    setDisplay({ G, currentPlayer: ctx.currentPlayer });
  }

  const deckStyle = useMemo(
    () => ({
      position: "absolute" as const,
      bottom: Math.max(insets.bottom + cardHeight, 16 + cardHeight),
      left: Math.max(insets.left, 16),
    }),
    [insets.bottom, insets.left]
  );

  // Kept in a ref so onCardDrop's identity never changes — a fresh callback per
  // move would defeat the Deck's memoization on the urgent placement render.
  const dropDeps = useRef({ G, ctx, moves, music });
  dropDeps.current = { G, ctx, moves, music };

  // Live position of the card being dragged (window coordinates), written by
  // Card on the UI thread and read by the Table's CellHighlight to preview the
  // drop target without any JS-thread round trips.
  const dragCenterX = useSharedValue(0);
  const dragCenterY = useSharedValue(0);
  const dragActive = useSharedValue(false);

  // The deck bows out under the victory overlay — cards it still holds would
  // read as being in play
  const gameOver = Boolean(ctx.gameover);
  const deckOpacity = useSharedValue(1);
  useEffect(() => {
    deckOpacity.value = withTiming(gameOver ? 0 : 1, { duration: 300 });
  }, [gameOver, deckOpacity]);
  const deckFade = useAnimatedStyle(() => ({ opacity: deckOpacity.value }));

  // The pre-mounted overlay that carries a placed card from the release point
  // into its cell, so the drop responds on the next frame regardless of how
  // long the placement render takes.
  const flyingCardRef = useRef<FlyingCardHandle>(null);
  const overlayNeedsHide = useRef(false);

  // The flight landed: reveal the real state (mounting the board card and
  // advancing the deck under the overlay), then hide the overlay once that
  // render has committed.
  const onFlightArrived = useCallback(() => {
    const { G, ctx } = dropDeps.current;
    overlayNeedsHide.current = true;
    setFrozen(false);
    setDisplay({ G, currentPlayer: ctx.currentPlayer });
  }, []);

  useEffect(() => {
    if (overlayNeedsHide.current) {
      overlayNeedsHide.current = false;
      flyingCardRef.current?.hide();
    }
  }, [display]);

  const onCardDrop = useCallback((point: CardDropPoint): boolean => {
    const { G, ctx, moves, music } = dropDeps.current;
    // The dragged card stays full screen-size while the board scales, so when
    // zoomed out the card visually covers several cells. The drop point is
    // the card's CENTER so it lands where the player aims regardless of zoom.
    //
    // Get the top left corner of the viewport in relation to the entire table
    const table = tableRef.current!;
    const tableLeft = table._previousLeft;
    const tableTop = table._previousTop;
    const scale = table._previousScale || 1;

    // Convert the card center from screen pixels back to board pixels (the
    // board is scaled by `scale` around its top-left origin, so 1 screen px ==
    // 1/scale board px), then find which cell contains that point. This must
    // stay the same math as CellHighlight's worklet so the card always lands
    // on the highlighted cell.
    const boardLeft = (point.centerX - tableLeft) / scale;
    const boardTop = (point.centerY - tableTop) / scale;

    const cellsFromLeft = Math.floor(boardLeft / cardWidth);
    const cellsFromTop = Math.floor(boardTop / cardHeight);

    // A drop outside the board must not wrap into a neighboring row via the
    // flat cell index.
    const inBounds =
      cellsFromLeft >= 0 &&
      cellsFromLeft < columns &&
      cellsFromTop >= 0 &&
      cellsFromTop < rows;

    // Calculate the target cell's id
    const targetCell = cellsFromTop * columns + cellsFromLeft;

    if (!inBounds || !isLegalMove(G, ctx, targetCell)) {
      music.playSoundEffect3(); // Play mismatched card sound effect
      haptics.reject();
      return false;
    }

    music.playSoundEffect1(); // Play card drop sound effect
    haptics.match();
    // The overlay flies the card face from the release point into the cell on
    // the UI thread; the displayed state stays frozen until it lands, so no
    // mounts can stall frames mid-flight.
    flyingCardRef.current?.fly({
      card: G.deck[0],
      fromX: point.centerX,
      fromY: point.centerY,
      fromScale: PICKUP_SCALE,
      toX: tableLeft + (cellsFromLeft + 0.5) * cardWidth * scale,
      toY: tableTop + (cellsFromTop + 0.5) * cardHeight * scale,
      toScale: scale,
    });
    setFrozen(true);
    moves.placeCard(targetCell);
    return true;
  }, []);

  const onGamePass = useCallback(() => {
    music.playSoundEffect2(); // Play pass card sound effect
    moves.pass();
  }, [moves, music]);

  return (
    <>
      <View style={styles.root}>
        <StatusBar hidden />
        <Table
          ref={tableRef}
          G={display.G}
          dragCenterX={dragCenterX}
          dragCenterY={dragCenterY}
          dragActive={dragActive}
        />
        <View
          style={{
            position: "absolute",
            top: Math.max(insets.top, 16),
            left: Math.max(insets.left, 16),
          }}
        >
          <Nameplates
            players={display.G.players}
            currentPlayer={display.currentPlayer}
          />
        </View>
        <Reanimated.View
          style={[deckStyle, deckFade]}
          pointerEvents={gameOver ? "none" : "box-none"}
        >
          <Deck
            cards={display.G.deck}
            onCardDrop={onCardDrop}
            dragCenterX={dragCenterX}
            dragCenterY={dragCenterY}
            dragActive={dragActive}
          />
        </Reanimated.View>
        <FlyingCard
          ref={flyingCardRef}
          nextCard={G.deck[0]}
          onArrived={onFlightArrived}
        />
        <CircleButton
          accessibilityLabel={t("pass")}
          onPress={onGamePass}
          style={{
            position: "absolute",
            bottom: Math.max(insets.bottom, 16),
            right: Math.max(insets.right, 16),
          }}
        >
          <SkipIcon size={32} />
        </CircleButton>
        <CircleButton
          accessibilityLabel={t("menu")}
          onPress={() => setShowMenu(true)}
          style={{
            position: "absolute",
            top: Math.max(insets.top, 16),
            right: Math.max(insets.right, 16),
          }}
        >
          <MenuIcon size={32} />
        </CircleButton>
      </View>
      {ctx.gameover ? (
        <Victory
          backToMainMenu={backToMainMenu}
          player={ctx.gameover}
          players={G.players}
          cells={G.cells}
          cardsLeft={G.deck.length}
        />
      ) : null}
      <Menu
        moves={moves}
        backToMainMenu={backToMainMenu}
        scrollToCenter={() => tableRef?.current?.scrollToCenter()}
        isVisible={showMenu}
        hide={() => setShowMenu(false)}
      />
      {snapshot === "animalChooser" ? (
        <AnimalChooser isVisible hide={() => {}} player="0" />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default Matchimals;
