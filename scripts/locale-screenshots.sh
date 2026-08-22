#!/usr/bin/env bash
#
# Photograph every language on the iPhone and iPad simulators, to check that
# translations fit: the main menu, Settings, the nameplates with the longest
# animal names (and the victory card with the longest name), the in-game
# menu, the animal chooser and the victory card.
#
#   bun run screenshots:locales                # build, then capture
#   bun run screenshots:locales --skip-build   # reuse the last build in ios/build
#   bun run screenshots:locales --app <path>   # capture from a specific .app
#   bun run screenshots:locales --locales "ja ko"   # only these languages
#
# The simulator's language is switched with `defaults write AppleLanguages`
# and the app relaunched for each locale; PNGs land in
# build/locale-screenshots/<locale>/<display>-<state>.png, and one contact
# sheet per locale in build/locale-screenshots/<locale>.jpg (with ImageMagick).
set -euo pipefail

cd "$(dirname "$0")/.."
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer

LOCALES=(en es-ES es-MX pt-BR de fr it ja ko zh-Hans)
# display | simulator | victory state
TARGETS=(
  "iphone|iPhone 14 Plus|twoPlayerVictory"
  "ipad|iPad Pro 13-inch (M5)|fourPlayerVictory"
)
STATES=(menu settings fitCheck fitCheckVictory gameMenu animalChooser)
BUNDLE_ID=native.matchimals.fun
OUT=build/locale-screenshots
DERIVED=ios/build
APP="$DERIVED/Build/Products/Release-iphonesimulator/Matchimals.app"
SETTLE=2

err() {
  echo "✖ $1" >&2
  exit 1
}

build=true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) build=false ;;
    --app)
      build=false
      APP="$2"
      shift
      ;;
    --locales)
      read -ra LOCALES <<<"$2"
      shift
      ;;
    *) err "Unknown option: $1" ;;
  esac
  shift
done

[[ -d ios ]] || err "No ios/ directory — run \`bun run prebuild\` first."

if $build; then
  echo "▸ Building Release for the simulator into $DERIVED…"
  CI=1 xcodebuild -workspace ios/Matchimals.xcworkspace -scheme Matchimals \
    -configuration Release -sdk iphonesimulator \
    -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath "$DERIVED" build -quiet
fi
[[ -d "$APP" ]] || err "App bundle not found at $APP"

udid_for() {
  xcrun simctl list devices available | { grep -F "$1 (" || true; } | head -1 |
    sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/'
}

for locale in "${LOCALES[@]}"; do
  rm -rf "${OUT:?}/$locale" "$OUT/$locale.jpg"
done
mkdir -p "$OUT"

for target in "${TARGETS[@]}"; do
  IFS='|' read -r display device victory <<<"$target"
  udid=$(udid_for "$device")
  [[ -n "$udid" ]] || err "No simulator named \"$device\" — run \`bun run screenshots\` once to create it."

  was_booted=$(xcrun simctl list devices | grep -F "$udid" | grep -c Booted || true)
  if [[ "$was_booted" == "0" ]]; then
    echo "▸ Booting $device…"
    xcrun simctl boot "$udid"
  fi
  xcrun simctl bootstatus "$udid" -b >/dev/null
  xcrun simctl status_bar "$udid" override --time 9:41 --batteryState charged \
    --batteryLevel 100 --wifiBars 3 --cellularBars 4 --operatorName "" >/dev/null
  xcrun simctl install "$udid" "$APP"

  for locale in "${LOCALES[@]}"; do
    mkdir -p "$OUT/$locale"
    echo "▸ $device · $locale"
    xcrun simctl terminate "$udid" "$BUNDLE_ID" 2>/dev/null || true
    xcrun simctl spawn "$udid" defaults write "Apple Global Domain" \
      AppleLanguages -array "$locale" >/dev/null
    xcrun simctl spawn "$udid" defaults write "Apple Global Domain" \
      AppleLocale -string "${locale//-/_}" >/dev/null
    xcrun simctl launch "$udid" "$BUNDLE_ID" >/dev/null
    sleep 4
    for state in "${STATES[@]}" "$victory"; do
      xcrun simctl openurl "$udid" "https://www.matchimals.fun/?screenshot=$state"
      sleep "$SETTLE"
      xcrun simctl io "$udid" screenshot "$OUT/$locale/$display-$state.png" >/dev/null 2>&1
      echo "  ✓ $locale/$display-$state.png"
    done
  done

  xcrun simctl terminate "$udid" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl spawn "$udid" defaults delete "Apple Global Domain" AppleLanguages >/dev/null 2>&1 || true
  xcrun simctl spawn "$udid" defaults delete "Apple Global Domain" AppleLocale >/dev/null 2>&1 || true
  xcrun simctl status_bar "$udid" clear >/dev/null
  if [[ "$was_booted" == "0" ]]; then
    xcrun simctl shutdown "$udid"
  fi
done

# One sheet per language: a row of the iPhone states above a row of the iPad's
# (appended rather than montaged — montage insists on a text font)
if command -v magick >/dev/null; then
  echo "▸ Contact sheets…"
  for locale in "${LOCALES[@]}"; do
    rows=()
    for target in "${TARGETS[@]}"; do
      IFS='|' read -r display _ victory <<<"$target"
      shots=()
      for state in "${STATES[@]}" "$victory"; do
        shots+=("$OUT/$locale/$display-$state.png")
      done
      rows+=("(" "${shots[@]}" -resize 320x -bordercolor '#17171b' -border 6 +append ")")
    done
    magick "${rows[@]}" -background '#17171b' -gravity center -append \
      -quality 85 "$OUT/$locale.jpg"
  done
fi

echo "▸ Done: $(find "$OUT" -name '*.png' | wc -l | tr -d ' ') screenshots in $OUT/"
