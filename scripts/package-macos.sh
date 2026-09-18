#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[[ "$(uname -s)" == Darwin ]] || { echo 'macOS is required.' >&2; exit 1; }
VERSION="$(/usr/bin/plutil -extract version raw -o - "$ROOT/package.json")"
CONFIGURATION="${CONFIGURATION:-release}"
MODE="${SCOPE_DISTRIBUTION:-preview}"
IDENTITY="-"
if [[ "$MODE" == developer-id ]]; then
  : "${SIGN_IDENTITY:?Set your Developer ID Application identity.}"
  : "${SPARKLE_PUBLIC_KEY:?Set your Sparkle Ed25519 public key.}"
  [[ "$SIGN_IDENTITY" == 'Developer ID Application:'* ]] || { echo 'A Developer ID Application identity is required.' >&2; exit 1; }
  IDENTITY="$SIGN_IDENTITY"
elif [[ "$MODE" != preview ]]; then
  echo 'SCOPE_DISTRIBUTION must be preview or developer-id.' >&2; exit 1
fi
swift build --package-path "$ROOT/macOS" -c "$CONFIGURATION" --product OMLXScope \
  -Xlinker -rpath -Xlinker '@executable_path/../Frameworks'
BIN="$(swift build --package-path "$ROOT/macOS" -c "$CONFIGURATION" --show-bin-path)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
APP="$STAGE/OMLX Scope.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$APP/Contents/Frameworks" "$ROOT/dist"
cp "$BIN/OMLXScope" "$APP/Contents/MacOS/OMLXScope"
cp "$ROOT/LICENSE" "$APP/Contents/Resources/LICENSE.txt"
cp "$ROOT/THIRD_PARTY_NOTICES.md" "$APP/Contents/Resources/THIRD_PARTY_NOTICES.md"
# This framework is the checksum-pinned, published Sparkle SPM binary.
FRAMEWORK="$(find "$ROOT/macOS/.build/artifacts" -type d -name Sparkle.framework | head -1)"
[[ -n "$FRAMEWORK" ]] || { echo 'The resolved Sparkle framework is missing.' >&2; exit 1; }
/usr/bin/ditto "$FRAMEWORK" "$APP/Contents/Frameworks/Sparkle.framework"
SPARKLE_LICENSE="$ROOT/macOS/.build/checkouts/Sparkle/LICENSE"
[[ -f "$SPARKLE_LICENSE" ]] || { echo 'Sparkle license is missing.' >&2; exit 1; }
cp "$SPARKLE_LICENSE" "$APP/Contents/Resources/Sparkle-LICENSE.txt"
export VERSION MODE APP
python3 - <<'PY'
import base64,os,plistlib
from pathlib import Path
v=os.environ['VERSION']
p={
 'CFBundleExecutable':'OMLXScope','CFBundleIdentifier':'com.mikebuckets171.omlx-scope',
 'CFBundleName':'OMLX Scope','CFBundleDisplayName':'OMLX Scope','CFBundlePackageType':'APPL',
 'CFBundleShortVersionString':v,'CFBundleVersion':v,'LSMinimumSystemVersion':'14.0',
 'NSPrincipalClass':'NSApplication','CFBundleIconFile':'Scope','NSHighResolutionCapable':True,
 'NSAppTransportSecurity':{'NSAllowsLocalNetworking':True},
 # Keep update consent explicit; no profiling, HTML notes, or unsigned extraction.
 'SUEnableAutomaticChecks':False, 'SUAutomaticallyUpdate':False,'SUSendProfileInfo':False,
 'SUShowReleaseNotes':False, 'SUEnableJavaScript':False,
 'SURequireSignedFeed':True,'SUVerifyUpdateBeforeExtraction':True,'SUScheduledCheckInterval':86400,
}
if os.environ['MODE']=='developer-id':
 key=os.environ['SPARKLE_PUBLIC_KEY']
 assert len(base64.b64decode(key,validate=True))==32, 'Invalid Ed25519 public key'
 p.update(SUPublicEDKey=key,SUFeedURL='https://raw.githubusercontent.com/mikebuckets171/omlx-scope-openchamber/updates/appcast.xml')
with (Path(os.environ['APP'])/'Contents/Info.plist').open('wb') as f:plistlib.dump(p,f)
PY
swift "$ROOT/scripts/macos-icon.swift" "$STAGE/Scope.iconset"
/usr/bin/iconutil -c icns "$STAGE/Scope.iconset" -o "$APP/Contents/Resources/Scope.icns"
SIGN_ARGS=(--force --sign "$IDENTITY" --options runtime)
if [[ "$MODE" == developer-id ]]; then SIGN_ARGS+=(--timestamp); else SIGN_ARGS+=(--timestamp=none); fi
# Sign nested code inside-out. No --deep signing or library-validation exceptions.
FW="$APP/Contents/Frameworks/Sparkle.framework"
while IFS= read -r -d '' TOOL; do /usr/bin/codesign "${SIGN_ARGS[@]}" "$TOOL"; done < <(find "$FW" -type f -name Autoupdate -print0)
while IFS= read -r -d '' BUNDLE; do /usr/bin/codesign "${SIGN_ARGS[@]}" "$BUNDLE"; done < <(find "$FW" -depth -type d \( -name '*.xpc' -o -name '*.app' \) -print0)
/usr/bin/codesign "${SIGN_ARGS[@]}" "$FW"
/usr/bin/codesign "${SIGN_ARGS[@]}" "$APP"
/usr/bin/codesign --verify --deep --strict --verbose=2 "$APP"
/usr/bin/plutil -lint "$APP/Contents/Info.plist"
if /usr/bin/otool -L "$APP/Contents/MacOS/OMLXScope" | grep -E '/(opt/homebrew|Users|usr/local)/'; then
  echo 'Unexpected build-machine library dependency.' >&2; exit 1
fi
SIZE="$(stat -f %z "$APP/Contents/MacOS/OMLXScope")"
[[ "$SIZE" -lt 8000000 ]] || { echo 'Executable exceeds the 8 MB budget.' >&2; exit 1; }
rm -rf "$ROOT/dist/OMLX Scope.app"
/usr/bin/ditto "$APP" "$ROOT/dist/OMLX Scope.app"
/usr/bin/ditto -c -k --sequesterRsrc --keepParent "$APP" "$ROOT/dist/OMLX-Scope-macOS-$VERSION.zip"
echo "PASS: native app $VERSION; executable $SIZE bytes; Sparkle 2.10.0 embedded."
if [[ "$MODE" == preview ]]; then
  echo 'Distribution: hardened, ad-hoc preview. Not notarized. Automatic installation disabled.'
else
  echo 'Distribution: Developer ID candidate. Notarize and staple before publishing.'
fi
