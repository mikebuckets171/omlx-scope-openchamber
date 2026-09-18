#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[[ "$(uname -s)" == Darwin ]] || { echo 'Run this script on macOS.' >&2; exit 1; }
# Stop this app only, never OpenChamber or oMLX.
pkill -x OMLXScope || true
CONFIGURATION=debug bash "$ROOT/scripts/package-macos.sh"
/usr/bin/open -n "$ROOT/dist/OMLX Scope.app"
if [[ "${1:-}" == --verify ]]; then
    sleep 2
    pgrep -x OMLXScope >/dev/null
    echo 'OMLX Scope is running.'
fi
