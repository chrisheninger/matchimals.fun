# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Matchimals.fun is an animal-matching puzzle card game shipped to iOS and the web. It's an [Expo](https://expo.dev) (SDK 56) React Native app written in TypeScript (strict mode), using [boardgame.io](https://boardgame.io) for turn-based game logic. Package manager is **bun**.

## Commands

```bash
bun install            # install deps
bun run ios            # build & run in iOS simulator (expo run:ios)
bun run web            # run web version (expo start --web)
bun run start          # expo dev server
bun run test           # jest (jest-expo preset, --passWithNoTests)
bun run typecheck      # tsc --noEmit (strict; keep this clean)
bun run format         # prettier on src/**
bun run generate:icons # re-render the app icons from the animal SVGs (outputs are committed)

bun run prebuild       # regenerate ios/ from app.json (expo prebuild -p ios --clean)
bun run build:web      # static web export to dist/ (expo export -p web)
bun run deploy:ios     # bump build number, archive, and upload to TestFlight (scripts/deploy-ios.sh)
```

Run a single test: `bun run test -- path/to/file.test.js` (or `-t "name"`). There is currently no test suite, so `test` passes with no tests.

Lint: `.eslintrc` extends `@react-native`; `lint-staged` runs prettier on commit (husky `precommit`).

## Continuous native generation

The `ios/` directory is **generated** from `app.json` (and the config plugins) — it is not the source of truth and is gitignored. Never hand-edit native iOS files expecting changes to persist; edit `app.json` or a config plugin and re-run `bun run prebuild`. Building requires Xcode + CocoaPods. Releases are built locally (no paid EAS): `bun run deploy:ios` auto-increments `ios.buildNumber`, archives, and uploads to TestFlight (signing and upload use the Apple ID signed into Xcode — see README "Deploying to TestFlight"); bump `version` in `app.json` manually for new releases. See the build-philosophy memory: no fastlane, no paid EAS.

`plugins/withFirebaseNoAdId.js` is a custom dangerous-mod plugin that prepends `$RNFirebaseAnalyticsWithoutAdIdSupport=true` to the Podfile so AdSupport.framework isn't linked (keeps the App Store privacy declaration clean). `plugins/withAnimalAppIcons.js` copies `assets/app-icons/animals/*.appiconset` into the asset catalog and lists them in `ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES` so iOS offers them as alternate app icons.

## Architecture

**Game state lives in boardgame.io, not React.** `src/Matchimals/game.ts` is the pure game definition (`setup`, `moves`, `turn.moveLimit: 1`, `endIf`), typed as boardgame.io's `Game<GameState>`; it also exports the `Card`-holding `GameState` shape. `src/App.tsx` wraps the board with `Client({ board: Matchimals, game, numPlayers })`. The board component (`src/Matchimals/index.tsx`) receives `BoardProps<GameState>` — `G` (game state), `ctx`, and `moves` — and calls `moves.placeCard(id)` / `moves.pass()` to mutate state. `G` is an Immer draft, so moves mutate it directly.

**The board model.** The play area is a fixed `columns × rows` (25 × 19, both must be odd) grid of `cells` — a flat array indexed `row * columns + col`. The first card is placed at `center`. Cards have four edges (`top/right/bottom/left`) holding animal IDs; two cards connect when touching edges share an ID. Core predicates in `game.ts`: `getNeighbors`, `isLegalMove`, `calculateScore` (sums `animals[id].score` per matching edge), `canCardsConnect`. The deck is one copy of `constants/cards.ts` per player, shuffled (lodash — there are TODOs to switch to boardgame.io's seeded RNG for future server play).

**Drag-and-drop → cell index.** Dropping a card doesn't carry a target cell; `onCardDrop` in `src/Matchimals/index.tsx` computes it geometrically from the dropped card's screen position vs. the scrollable `Table`'s offset (exposed via the typed `TableHandle` imperative API), dividing by `cardWidth`/`cardHeight` to get a `(row, col)`, then `row * columns + col`. `constants/board.ts` holds all these dimensions. If drag placement is off, this math (and the Table's measured offset) is the place to look.

**Platform splits via `.web.tsx`.** `Nameplate` has a web variant resolved automatically by Metro; the pair shares a props type in a sibling `types.ts` — when touching it, update both variants and keep the shared type honest. `Dialog` is a single Portal + Animated implementation on both platforms (RN's `Modal` collapses on Fabric, and the portal keeps native and web timings identical). (`Music` has no web variant — expo-audio works on both platforms, and `setAudioModeAsync` is a no-op on web.)

**Animals** (`src/Animals/`) are individual react-native-svg components taking `SvgProps`; `src/Animals/index.ts` is the registry, and `AnimalName` (`keyof typeof Animals`) ties it to `constants/animals.ts` and the player config. `src/hooks/players.tsx` assigns each of up to 4 players a random animal + color via a PlayerProvider context.

**App icons are the animals.** `scripts/generate-app-icons.mjs` renders every registered animal onto the table wood: the `defaultAppIcon` from `constants/appIcon.ts` becomes the primary icon (`assets/app-icons/Icon-App-1024x1024.png` + `public/icons/`), and every other animal an explicit-size `.appiconset` under `assets/app-icons/animals/` (no 1024 per alternate — each would add ~1 MB to the bundle). The iOS alternate-icon name is the `AnimalName`; `src/hooks/appIcon.ts` wraps `expo-alternate-app-icons` (null ⇄ `defaultAppIcon`), and the OS remembers the choice, so the app persists nothing. `AppIconChooser` opens from the `Settings` dialog (the cog beside the audio controls on the main menu and in the in-game menu; `Switch` is the on/off control used there), and only when `canChangeAppIcon` (iOS). Adding an animal to the registry means re-running `bun run generate:icons` and committing the output.

## Conventions

- **This is a public GitHub repo.** Before every commit, review the diff for anything private — credentials, API key IDs, tokens, personal info, internal URLs. Nothing secret is needed on disk for releases; never put credentials in tracked files, commit messages, or PR descriptions.
- Prettier (default config, `.prettierrc`) — let `bun run format` handle style; don't hand-format.
- Comments only where they explain what the code can't (constraints, invariants, non-obvious "why"). Never change-relative: no references to previous behavior or why the new way differs from the old — the codebase is forward-looking; git history is the changelog.
- Components are folders with an `index.tsx`; assets (png/jpg/svg/mp4) live beside the component that uses them. Asset imports are declared in `src/declarations.d.ts`.
- TypeScript is strict (`tsconfig.json` extends Expo's base + `"strict": true`); run `bun run typecheck` before committing. Prefer narrow local types over `any`; the deliberate escape hatches (e.g. web-only CSS values cast past RN's style types) carry comments.
- The Expo config plugin (`plugins/withFirebaseNoAdId.js`) and babel/metro/jest configs stay JS — they run in Node at build time and are excluded from the TS program.
