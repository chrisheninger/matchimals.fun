#!/usr/bin/env bash
#
# Deploy the iOS app to TestFlight, entirely on this machine.
#
#   bun run deploy:ios
#
# Pipeline: guardrails → bump ios.buildNumber in app.json (+ commit) →
# expo prebuild → xcodebuild archive → xcodebuild -exportArchive with
# destination:upload (sends the build to App Store Connect) → git tag.
#
# Authentication: an App Store Connect API key (.env + ~/.appstoreconnect, see
# the README) lets xcodebuild work headlessly; without one it relies on the
# Apple ID signed into Xcode, which also works for a team you own.
set -euo pipefail

cd "$(dirname "$0")/.."

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

# --- Credentials (optional) ---------------------------------------------------

AUTH_ARGS=()
if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi
if [[ -n "${ASC_KEY_ID:-}" && -n "${ASC_ISSUER_ID:-}" ]]; then
  ASC_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
  [[ -f "$ASC_KEY_PATH" ]] || err "ASC_KEY_ID is set but $ASC_KEY_PATH is missing."
  AUTH_ARGS=(
    -authenticationKeyPath "$ASC_KEY_PATH"
    -authenticationKeyID "$ASC_KEY_ID"
    -authenticationKeyIssuerID "$ASC_ISSUER_ID"
  )
  echo "▸ Authenticating with App Store Connect API key ${ASC_KEY_ID}"
else
  echo "▸ No App Store Connect API key — using the Apple ID signed into Xcode"
fi

# --- Bump build number (app.json is the CNG source of truth) -----------------

BUILD_NUMBER=$(bun -e '
  const file = "app.json";
  const json = await Bun.file(file).json();
  const next = String(Number(json.expo.ios.buildNumber) + 1);
  json.expo.ios.buildNumber = next;
  await Bun.write(file, JSON.stringify(json, null, 2) + "\n");
  console.log(next);
')
VERSION=$(bun -e 'console.log((await Bun.file("app.json").json()).expo.version)')
TEAM_ID=$(bun -e 'console.log((await Bun.file("app.json").json()).expo.ios.appleTeamId)')

echo "▸ Deploying Matchimals ${VERSION} (build ${BUILD_NUMBER})"
git add app.json
git commit -m "chore: bump iOS build number to ${BUILD_NUMBER}"

# --- Prebuild (regenerates ios/ from app.json) --------------------------------

echo "▸ Prebuilding…"
# CocoaPods needs a UTF-8 locale; in a bare shell it crashes and prebuild
# still exits 0, leaving ios/ without Pods
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 bun run prebuild
[[ -f ios/Podfile.lock ]] || err "prebuild finished without installing Pods."

# --- Archive ------------------------------------------------------------------

ARCHIVE_PATH="build/Matchimals.xcarchive"
rm -rf "$ARCHIVE_PATH"

echo "▸ Archiving (this takes a while)…"
xcodebuild -workspace ios/Matchimals.xcworkspace \
  -scheme Matchimals \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  -allowProvisioningUpdates \
  ${AUTH_ARGS[@]+"${AUTH_ARGS[@]}"}

# --- Export & upload to App Store Connect ------------------------------------

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
  <key>signingStyle</key>
  <string>automatic</string>
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
  -allowProvisioningUpdates \
  ${AUTH_ARGS[@]+"${AUTH_ARGS[@]}"}

# --- Tag ----------------------------------------------------------------------

TAG="ios-v${VERSION}-${BUILD_NUMBER}"
git tag "$TAG"

echo "✔ Uploaded build ${BUILD_NUMBER} — it will appear in TestFlight once Apple finishes processing."
echo "  Tagged ${TAG}. Don't forget: git push --follow-tags"
