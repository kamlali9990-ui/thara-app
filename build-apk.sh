#!/bin/bash
set -e

# Extract passwords from signing key file
KEYSTORE_PASS=$(grep "Key store password" "أسواق ثراء الشرق ون - Google Play package (2)/signing-key-info.txt" | cut -d: -f2 | xargs)
KEY_PASS=$(grep "Key password" "أسواق ثراء الشرق ون - Google Play package (2)/signing-key-info.txt" | cut -d: -f2 | xargs)

export BUBBLEWRAP_KEYSTORE_PASSWORD="$KEYSTORE_PASS"
export BUBBLEWRAP_KEY_PASSWORD="$KEY_PASS"

# Configure Bubblewrap paths
npx @bubblewrap/cli updateConfig --jdkPath "$JAVA_HOME" --androidSdkPath "$ANDROID_SDK_ROOT"

# Build the APK
npx @bubblewrap/cli build

# Copy the signed APK to the public folder
cp app-release-signed.apk public/thara-app.apk
