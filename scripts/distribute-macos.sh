#!/bin/bash
# Run on the publisher's Mac. Credentials stay in Keychain, never this checkout.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[[ "$(uname -s)" == Darwin ]] || { echo 'macOS is required.' >&2; exit 1; }
: "${SIGN_IDENTITY:?Set your Developer ID Application identity.}"
: "${SPARKLE_PUBLIC_KEY:?Set the matching Ed25519 public key.}"
: "${NOTARYTOOL_PROFILE:?Set the name of your notarytool Keychain profile.}"
: "${SPARKLE_BIN:?Set the bin directory of the official Sparkle 2.10.0 tools.}"
ACCOUNT="${SPARKLE_KEY_ACCOUNT:-ed25519}"
[[ -x "$SPARKLE_BIN/sign_update" ]] || { echo 'Sparkle sign_update is missing.' >&2; exit 1; }
[[ "${CONFIGURATION:-release}" == release ]] || { echo 'Distribution requires a release build.' >&2; exit 1; }
export SCOPE_DISTRIBUTION=developer-id
bash "$ROOT/scripts/package-macos.sh"
VERSION="$(/usr/bin/plutil -extract version raw -o - "$ROOT/package.json")"
APP="$ROOT/dist/OMLX Scope.app"
ZIP="$ROOT/dist/OMLX-Scope-macOS-$VERSION.zip"
# This can fail for account/auth/service reasons. Never fall back to an unsigned release.
xcrun notarytool submit "$ZIP" --keychain-profile "$NOTARYTOOL_PROFILE" --wait --output-format json > "$ROOT/dist/notarization.json"
python3 - "$ROOT/dist/notarization.json" <<'PY'
import json,sys
assert json.load(open(sys.argv[1]))['status']=='Accepted', 'Notarization was not accepted; do not publish.'
PY
xcrun stapler staple "$APP"
xcrun stapler validate "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
/usr/sbin/spctl --assess --type execute --verbose=2 "$APP"
# Stapling changes the artifact. Archive and sign only after the ticket is attached.
rm "$ZIP"
/usr/bin/ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
SIGNATURE="$("$SPARKLE_BIN/sign_update" --account "$ACCOUNT" -p "$ZIP")"
export VERSION ZIP SIGNATURE
# Confirm the signing key really matches the public key embedded in the app.
swift "$ROOT/scripts/verify-update-signature.swift" "$ZIP" "$SPARKLE_PUBLIC_KEY" "$SIGNATURE"
python3 - "$ROOT/dist/appcast.xml" <<'PY'
import base64,os,sys,xml.etree.ElementTree as E
from pathlib import Path
from email.utils import formatdate
v=os.environ['VERSION'];sig=os.environ['SIGNATURE'];assert len(base64.b64decode(sig,validate=True))==64
ns='http://www.andymatuschak.org/xml-namespaces/sparkle';E.register_namespace('sparkle',ns)
r=E.Element('rss',version='2.0');c=E.SubElement(r,'channel')
E.SubElement(c,'title').text='OMLX Scope for Mac'
i=E.SubElement(c,'item');E.SubElement(i,'title').text='OMLX Scope '+v
E.SubElement(i,'link').text='https://github.com/mikebuckets171/omlx-scope-openchamber/releases/tag/v'+v
E.SubElement(i,'pubDate').text=formatdate(usegmt=True)
for k,t in [('version',v),('shortVersionString',v),('minimumSystemVersion','14.0.0'),('hardwareRequirements','arm64')]:E.SubElement(i,'{'+ns+'}'+k).text=t
E.SubElement(i,'enclosure',{'url':f'https://github.com/mikebuckets171/omlx-scope-openchamber/releases/download/v{v}/OMLX-Scope-macOS-{v}.zip','length':str(Path(os.environ['ZIP']).stat().st_size),'type':'application/octet-stream','{'+ns+'}edSignature':sig})
E.indent(r);E.ElementTree(r).write(sys.argv[1],encoding='utf-8',xml_declaration=True)
PY
"$SPARKLE_BIN/sign_update" --account "$ACCOUNT" "$ROOT/dist/appcast.xml"
"$SPARKLE_BIN/sign_update" --account "$ACCOUNT" --verify "$ROOT/dist/appcast.xml"
/usr/bin/shasum -a 256 "$ZIP" > "$ROOT/dist/SHA256SUMS"
echo 'Signed archive and signed feed are ready in dist. No files have been published.'
echo 'Publish the matching ZIP before updating the updates branch feed. See docs/RELEASING.md.'
