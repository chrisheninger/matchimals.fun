<img src="./assets/app-icons/Icon-App-1024x1024.png" alt="Matchimals icon" width="240" />
<img src="./matchimals-logo.svg" alt="Matchimals logo" width="240" />

# Matchimals.fun

## an animal matching puzzle card game 🦁 🃏

#### [🍎 Download for iOS from the App Store](https://itunes.apple.com/app/id1348821168)

#### [🖥 Play on desktop on the web](https://www.matchimals.fun/)

<img src="./public/screenshots/screenshot-optimized.webp" alt="screenshot of matchimals.fun game" />

## How to play

1.  1-4 players take turns connecting the top card from the deck to the existing cards on the table.
1.  If there isn't a valid connection to be made, then the player must pass.
1.  The game ends when all the cards from the deck have been connected on the board.

## About

Matchimals.fun was built as a proof-of-concept by Chris Heninger ([@chrisheninger](https://github.com/chrisheninger)) and Hannah Heninger ([@mshannahnv](https://github.com/mshannahnv)). The gameplay is inspired by a 1959 card game called Busy Bee. 🐝 🃏

Matchimals.fun is made for kids of all ages. It aims to provide entertainment and improve pattern recognition skills through fun visuals of animals, colors, and numbers.

This project is sponsored by [iGravity Studios](https://igravitystudios.com)– a custom software shop with an emphasis on UI/UX development– based in Phoenix, Arizona. 🏜 ❤️

## Want to contribute?

This game has been made open source to help others looking to learn more about JavaScript, BoardGame.io, and React-Native applications.

Find a bug or have a question? Feel free to [open an issue](https://github.com/chrisheninger/matchimals.fun/issues) or [submit a pull request](https://github.com/chrisheninger/matchimals.fun/pulls)!

### Development

This is an [Expo](https://expo.dev) app using [continuous native generation](https://docs.expo.dev/workflow/continuous-native-generation/) — the `ios/` directory is generated from `app.json` and not checked in. You'll need [bun](https://bun.sh), Xcode, and CocoaPods installed.

1.  Fork the repo
1.  Install dependencies: `bun install`
1.  Build and run the app in the iOS simulator: `bun run ios`
1.  Or run the web version: `bun run web`

The app icons are rendered from the animal SVGs: `bun run generate:icons` regenerates the primary icon, the per-animal alternate icons (pick one under Settings on iOS), and the web icons — commit the output.

Screenshots for the App Store and this README come from the simulator: `bun run screenshots` builds a Release app, boots an iPhone and an iPad, drives the game through the main menu, every board snapshot in `src/Matchimals/snapshots.ts`, and the victory card via `https://www.matchimals.fun/?screenshot=<state>` universal links, and writes PNGs to `screenshots/` — commit them; they are what gets uploaded to App Store Connect. Add `--skip-build` to reuse the last build.

### Deploying to TestFlight

iOS releases are built and uploaded entirely locally (no EAS subscription or fastlane required):

```bash
bun run deploy:ios
```

The script (`scripts/deploy-ios.sh`) auto-increments `ios.buildNumber` in `app.json` (and commits the bump), runs `expo prebuild`, archives with `xcodebuild`, uploads the build straight to App Store Connect, then tags the commit (`ios-v<version>-<build>`) and pushes. It refuses to run unless you're on a clean `main` and the typecheck passes. If the upload step fails (most often because the Apple ID in Xcode needs signing in again), fix that and run `bun run deploy:ios --upload-only` to re-upload the archive it already built. App version bumps (`expo.version`) are still manual — edit `app.json` before deploying a new release.

Signing and the upload use the Apple ID signed into Xcode (Xcode → Settings → Accounts) for the team in `app.json`; Xcode creates the certificates and profiles it needs. No keys or tokens are stored in the repo or on disk.

The web version deploys automatically via Netlify when `main` is pushed (`bun run build:web` for a local static export to `dist/`).

## Special thanks

[Nicolo Davis](https://github.com/nicolodavis) and collaborators for the turn-based game engine [boardgame.io](https://github.com/nicolodavis/boardgame.io).

Facebook and collaborators for the wonderful libraries [React](https://reactjs.org/) and [React-Native](https://facebook.github.io/react-native/).
