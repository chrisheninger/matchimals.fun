#!/usr/bin/env bash
#
# Capture App Store / README screenshots from the iOS Simulator.
#
#   bun run screenshots                 # build for the simulator, then capture
#   bun run screenshots --skip-build    # reuse the last build in ios/build
#   bun run screenshots --app <path>    # capture from a specific .app bundle
#
# One simulator per App Store Connect display class, at the pixel size its
# slot accepts: the required iPhone slot is the 6.5" display (1284 × 2778 —
# an iPhone 14 Plus; the 17 Pro family is 6.3"/6.9" and gets rejected), and
# the iPad slot is the 13" display (2064 × 2752). The iPhone shows a
# two-player game and the iPad a four-player one: the five board snapshots
# from src/Matchimals/snapshots.ts, then the victory card, each reached with a
# `https://www.matchimals.fun/?screenshot=<state>` universal link (see
# src/screenshots.ts). PNGs land in screenshots/<display>/<n>-<state>.png, in
# upload order, and every capture is checked against the slot's pixel size.
# The status bar is overridden Apple-style (9:41, full battery) while capturing.
set -euo pipefail

cd "$(dirname "$0")/.."
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer

# display folder | simulator (created if missing) | expected pixels | state prefix
TARGETS=(
  "iphone-6.5|iPhone 14 Plus|1284x2778|twoPlayer"
  "ipad-13|iPad Pro 13-inch (M5)|2064x2752|fourPlayer"
)
STATES=(A B C D E Victory)
BUNDLE_ID=native.matchimals.fun
OUT=screenshots
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

# Empty when no simulator has that name (grep's miss must not trip pipefail)
udid_for() {
  xcrun simctl list devices available | { grep -F "$1 (" || true; } | head -1 |
    sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/'
}

# Creates the simulator on the newest installed runtime
create_device() {
  local type
  type=$(xcrun simctl list devicetypes | { grep -F "$1 (" || true; } | head -1 |
    sed -E 's/.*\((com\.apple\.CoreSimulator\.SimDeviceType\.[^)]+)\).*/\1/')
  [[ -n "$type" ]] || err "Xcode has no simulator device type named \"$1\"."
  xcrun simctl create "$1" "$type"
}

pixels_of() {
  sips -g pixelWidth -g pixelHeight "$1" |
    awk '/pixelWidth/ { w = $2 } /pixelHeight/ { h = $2 } END { print w "x" h }'
}

for target in "${TARGETS[@]}"; do
  IFS='|' read -r folder device pixels prefix <<<"$target"
  udid=$(udid_for "$device")
  if [[ -z "$udid" ]]; then
    echo "▸ Creating simulator $device…"
    udid=$(create_device "$device")
  fi
  rm -rf "${OUT:?}/$folder"
  mkdir -p "$OUT/$folder"

  was_booted=$(xcrun simctl list devices | grep -F "$udid" | grep -c Booted || true)
  if [[ "$was_booted" == "0" ]]; then
    echo "▸ Booting $device…"
    xcrun simctl boot "$udid"
  fi
  xcrun simctl bootstatus "$udid" -b >/dev/null

  xcrun simctl status_bar "$udid" override --time 9:41 --batteryState charged \
    --batteryLevel 100 --wifiBars 3 --cellularBars 4 --operatorName "" >/dev/null
  xcrun simctl terminate "$udid" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl install "$udid" "$APP"
  xcrun simctl launch "$udid" "$BUNDLE_ID" >/dev/null
  # A fresh simulator shows first-boot notifications for a few seconds
  sleep 8

  n=0
  for suffix in "${STATES[@]}"; do
    n=$((n + 1))
    state="$prefix$suffix"
    file="$OUT/$folder/$n-$state.png"
    xcrun simctl openurl "$udid" "https://www.matchimals.fun/?screenshot=$state"
    sleep "$SETTLE"
    xcrun simctl io "$udid" screenshot "$file" >/dev/null 2>&1
    actual=$(pixels_of "$file")
    [[ "$actual" == "$pixels" ]] ||
      err "$file is ${actual} px; App Store Connect wants ${pixels} for $folder."
    echo "  ✓ $file"
  done

  xcrun simctl status_bar "$udid" clear >/dev/null
  if [[ "$was_booted" == "0" ]]; then
    xcrun simctl shutdown "$udid"
  fi
done

if command -v magick >/dev/null; then
  echo "▸ Recompressing PNGs losslessly…"
  find "$OUT" -name '*.png' -exec magick {} -strip -define png:compression-level=9 \
    -define png:compression-filter=5 -define png:compression-strategy=1 {} \;
fi

echo "▸ Done: $(find "$OUT" -name '*.png' | wc -l | tr -d ' ') screenshots in $OUT/"
