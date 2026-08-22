#!/usr/bin/env bash
#
# Deploy the iOS app to TestFlight, entirely on this machine.
#
#   bun run deploy:ios
#   bun run deploy:ios --upload-only   # retry the upload of the last archive
#
# Pipeline: guardrails → bump ios.buildNumber in app.json (+ commit) →
# expo prebuild → xcodebuild archive → xcodebuild -exportArchive with
# destination:upload (sends the build to App Store Connect) → tag + push.
#
# Signing and the upload rely on the Apple ID signed into Xcode (Settings →
# Accounts) for the team in app.json — the archive is signed with the Apple
# Development identity and -exportArchive re-signs it with Apple Distribution,
# minting certificates and profiles as needed. Nothing secret lives in the repo
# or on disk.
set -euo pipefail

cd "$(dirname "$0")/.."
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer

upload_only=false
[[ "${1:-}" == "--upload-only" ]] && upload_only=true

err() {
  echo "✖ $1" >&2
  exit 1
}

# --- Guardrails --------------------------------------------------------------

branch=$(git rev-parse --abbrev-ref HEAD)
[[ "$branch" == "main" ]] || err "Deploys must run from main (currently on '$branch')."
[[ -z "$(git status --porcelain)" ]] || err "Working tree is dirty — commit or stash first."

echo "▸ Typechecking…"
bun run typecheck

VERSION=$(bun -e 'console.log((await Bun.file("app.json").json()).expo.version)')
TEAM_ID=$(bun -e 'console.log((await Bun.file("app.json").json()).expo.ios.appleTeamId)')
ARCHIVE_PATH="build/Matchimals.xcarchive"

if $upload_only; then
  # The previous run archived but the upload failed (typically the Apple ID
  # in Xcode needed signing in again): reuse that archive and its build number.
  [[ -d "$ARCHIVE_PATH" ]] || err "No archive at $ARCHIVE_PATH to upload."
  BUILD_NUMBER=$(bun -e 'console.log((await Bun.file("app.json").json()).expo.ios.buildNumber)')
  echo "▸ Re-uploading Matchimals ${VERSION} (build ${BUILD_NUMBER}) as team ${TEAM_ID}"
else
  # --- Bump build number (app.json is the CNG source of truth) ---------------

  BUILD_NUMBER=$(bun -e '
    const file = "app.json";
    const json = await Bun.file(file).json();
    const next = String(Number(json.expo.ios.buildNumber) + 1);
    json.expo.ios.buildNumber = next;
    await Bun.write(file, JSON.stringify(json, null, 2) + "\n");
    console.log(next);
  ')

  echo "▸ Deploying Matchimals ${VERSION} (build ${BUILD_NUMBER}) as team ${TEAM_ID}"
  git add app.json
  git commit -m "chore: bump iOS build number to ${BUILD_NUMBER}"

  # --- Prebuild (regenerates ios/ from app.json) ------------------------------

  echo "▸ Prebuilding…"
  # CocoaPods needs a UTF-8 locale; in a bare shell it crashes and prebuild
  # still exits 0, leaving ios/ without Pods
  LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 bun run prebuild
  [[ -f ios/Podfile.lock ]] || err "prebuild finished without installing Pods."

  # --- Archive ----------------------------------------------------------------

  rm -rf "$ARCHIVE_PATH"

  echo "▸ Archiving (this takes a while)…"
  xcodebuild -workspace ios/Matchimals.xcworkspace \
    -scheme Matchimals \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$ARCHIVE_PATH" \
    archive \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    CODE_SIGN_IDENTITY="Apple Development"
fi

# --- Export & upload to App Store Connect ------------------------------------

mkdir -p build
cat > build/ExportOptions.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>destination</key>
  <string>upload</string>
  <key>teamID</key>
  <string>${TEAM_ID}</string>
  <key>uploadSymbols</key>
  <true/>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
</dict>
</plist>
EOF

echo "▸ Uploading to App Store Connect…"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist build/ExportOptions.plist \
  -exportPath build/export \
  -allowProvisioningUpdates

# --- Tag & push ---------------------------------------------------------------

TAG="ios-v${VERSION}-${BUILD_NUMBER}"
git tag "$TAG"
git push origin main --follow-tags

echo "✔ Uploaded build ${BUILD_NUMBER} (tagged ${TAG}) — it will appear in TestFlight once Apple finishes processing."
