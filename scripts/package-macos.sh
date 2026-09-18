#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[[ "$(uname -s)" == Darwin ]] || { echo 'macOS is required to build the native app.' >&2; exit 1; }
VERSION="$(/usr/bin/plutil -extract version raw -o - "$ROOT/package.json")"
CONFIGURATION="${CONFIGURATION:-release}"
swift build --package-path "$ROOT/macOS" -c "$CONFIGURATION" --product OMLXScope
BIN="$(swift build --package-path "$ROOT/macOS" -c "$CONFIGURATION" --show-bin-path)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
APP="$STAGE/OMLX Scope.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$ROOT/dist"
cp "$BIN/OMLXScope" "$APP/Contents/MacOS/OMLXScope"
cp "$ROOT/LICENSE" "$APP/Contents/Resources/LICENSE.txt"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>OMLXScope</string>
<key>CFBundleIdentifier</key><string>com.mikebuckets171.omlx-scope</string>
<key>CFBundleName</key><string>OMLX Scope</string>
<key>CFBundleDisplayName</key><string>OMLX Scope</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>$VERSION</string>
<key>CFBundleVersion</key><string>$VERSION</string>
<key>LSMinimumSystemVersion</key><string>14.0</string>
<key>NSPrincipalClass</key><string>NSApplication</string>
<key>CFBundleIconFile</key><string>Scope</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict></plist>
PLIST
swift "$ROOT/scripts/macos-icon.swift" "$STAGE/Scope.iconset"
/usr/bin/iconutil -c icns "$STAGE/Scope.iconset" -o "$APP/Contents/Resources/Scope.icns"
# Ad-hoc signing verifies local bundle integrity; it is not Developer ID notarization.
/usr/bin/codesign --force --sign - "$APP"
/usr/bin/codesign --verify --strict --verbose=2 "$APP"
/usr/bin/plutil -lint "$APP/Contents/Info.plist"
if /usr/bin/otool -L "$APP/Contents/MacOS/OMLXScope" | grep -E '/(opt/homebrew|Users|usr/local)/'; then
    echo 'Native binary depends on a non-system library.' >&2; exit 1
fi
SIZE="$(stat -f %z "$APP/Contents/MacOS/OMLXScope")"
[[ "$SIZE" -lt 8000000 ]] || { echo 'Native executable exceeds the 8 MB budget.' >&2; exit 1; }
rm -rf "$ROOT/dist/OMLX Scope.app"
/usr/bin/ditto "$APP" "$ROOT/dist/OMLX Scope.app"
/usr/bin/ditto -c -k --sequesterRsrc --keepParent "$APP" "$ROOT/dist/OMLX-Scope-macOS-$VERSION.zip"
echo "PASS: native app $VERSION; executable $SIZE bytes; no bundled runtime or non-system dynamic libraries."
echo 'Signing: ad-hoc; not Developer ID signed or notarized.'
