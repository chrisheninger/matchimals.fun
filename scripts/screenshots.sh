#!/usr/bin/env bash
#
# Capture App Store / README screenshots from the iOS Simulator.
#
#   bun run screenshots                 # build for the simulator, then capture
#   bun run screenshots --skip-build    # reuse the last build in ios/build
#   bun run screenshots --app <path>    # capture from a specific .app bundle
#
# Every device below is booted in turn, the app is driven through each state
# with `matchimals://screenshot/<state>` deep links (see src/screenshots.ts),
# and a PNG lands in screenshots/<device>/<state>.png. The status bar is
# overridden Apple-style (9:41, full battery) while capturing.
set -euo pipefail

cd "$(dirname "$0")/.."

DEVICES=("iPhone 17 Pro Max" "iPad Pro 13-inch (M5)")
STATES=(menu twoPlayerA twoPlayerB twoPlayerC twoPlayerD twoPlayerE
  fourPlayerA fourPlayerB fourPlayerC fourPlayerD fourPlayerE victory)
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

udid_for() {
  xcrun simctl list devices available | grep -F "$1 (" | head -1 |
    sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/'
}

for device in "${DEVICES[@]}"; do
  udid=$(udid_for "$device")
  [[ -n "$udid" ]] || err "No available simulator named \"$device\"."
  slug=$(echo "$device" | tr -cd '[:alnum:] ' | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
  mkdir -p "$OUT/$slug"

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

  for state in "${STATES[@]}"; do
    xcrun simctl openurl "$udid" "https://www.matchimals.fun/?screenshot=$state"
    sleep "$SETTLE"
    xcrun simctl io "$udid" screenshot "$OUT/$slug/$state.png" >/dev/null 2>&1
    echo "  ✓ $slug/$state.png"
  done

  xcrun simctl status_bar "$udid" clear >/dev/null
  if [[ "$was_booted" == "0" ]]; then
    xcrun simctl shutdown "$udid"
  fi
done

if command -v magick >/dev/null; then
  echo "▸ Recompressing PNGs losslessly…"
  find "$OUT" -name '*.png' -exec magick {} -strip -define png:compression-level=9 \
    -define png:compression-filter=5 -define png:compression-strategy=1 {} ;
fi

echo "▸ Done: $(find "$OUT" -name '*.png' | wc -l | tr -d ' ') screenshots in $OUT/"
