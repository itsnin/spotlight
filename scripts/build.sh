#!/bin/bash
# Downloads and installs the latest Spotlight release from GitHub
# Usage: ./scripts/build.sh
#    or: curl -sL https://raw.githubusercontent.com/itsnin/spotlight/main/scripts/build.sh | bash
set -e

# Configuration
REPO_OWNER="itsnin"
REPO_NAME="spotlight"
UUID="spotlight@nin"
ASSET_NAME="${UUID}.shell-extension.zip"
API_URL="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest"

echo "Fetching latest release from GitHub..."

# Get the download URL for the extension zip
# Prefer jq if available, fall back to grep/sed
if command -v jq >/dev/null 2>&1; then
    DOWNLOAD_URL=$(curl -sL "$API_URL" | jq -r ".assets[] | select(.name==\"${ASSET_NAME}\") | .browser_download_url")
else
    DOWNLOAD_URL=$(curl -sL "$API_URL" | grep -o "\"browser_download_url\": \"[^\"]*${ASSET_NAME}\"" | cut -d'"' -f4)
fi

if [ -z "$DOWNLOAD_URL" ]; then
    echo "ERROR: Could not find ${ASSET_NAME} in the latest release"
    echo "Check releases at https://github.com/${REPO_OWNER}/${REPO_NAME}/releases"
    exit 1
fi

echo "Downloading: ${DOWNLOAD_URL}"

# Download the release zip to a temp file
TEMP_ZIP=$(mktemp /tmp/spotlight.XXXXXX.zip)
curl -sL --fail "$DOWNLOAD_URL" -o "$TEMP_ZIP"

echo "Installing extension..."
gnome-extensions install --force "$TEMP_ZIP"
rm -f "$TEMP_ZIP"

echo ""
echo "Extension installed successfully!"
echo ""
echo "To activate:"
echo "  1. Log out and back in (required on Wayland)"
echo "  2. Run: gnome-extensions enable ${UUID}"
