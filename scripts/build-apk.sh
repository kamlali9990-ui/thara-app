#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Read signing passwords from existing file
KEYSTORE_PASS=$(grep 'Key store password' "أسواق ثراء الشرق ون - Google Play package (2)/signing-key-info.txt" | cut -d: -f2 | xargs)
KEY_PASS=$(grep 'Key password' "أسواق ثراء الشرق ون - Google Play package (2)/signing-key-info.txt" | cut -d: -f2 | xargs)

export BUBBLEWRAP_KEYSTORE_PASSWORD="$KEYSTORE_PASS"
export BUBBLEWRAP_KEY_PASSWORD="$KEY_PASS"

echo "JDK: $(java -version 2>&1 | head -1)"
echo "JAVA_HOME: $JAVA_HOME"
echo "ANDROID_SDK_ROOT: $ANDROID_SDK_ROOT"

# Configure Bubblewrap paths (non-interactive)
npx @bubblewrap/cli updateConfig \
  --jdkPath "$JAVA_HOME" \
  --androidSdkPath "$ANDROID_SDK_ROOT" \
  2>&1 || echo "updateConfig done (may have warnings)"

# Build
npx @bubblewrap/cli build
