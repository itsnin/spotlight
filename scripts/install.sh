#!/usr/bin/env bash
# Requires bash — will not run correctly under sh, zsh, or fish.
# Downloads and installs the latest Spotlight release from GitHub.
# Usage: ./scripts/install.sh (or ./scripts/build.sh for backward compatibility)
#    or: curl -sL https://raw.githubusercontent.com/itsnin/spotlight/main/scripts/build.sh | sh
set -e

# Re-exec with bash if invoked via sh or another shell.
if [ -z "$BASH_VERSION" ]; then
    SCRIPT_URL="https://raw.githubusercontent.com/itsnin/spotlight/main/scripts/build.sh"
    if [ -f "$0" ]; then
        exec bash "$0" "$@"
    else
        curl -sL "$SCRIPT_URL" | bash
        exit $?
    fi
fi

# Configuration.
REPO_OWNER="itsnin"
REPO_NAME="spotlight"
UUID="spotlight@nin"
ASSET_NAME="${UUID}.shell-extension.zip"
API_URL="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest"

echo "Fetching latest release from GitHub..."

# Get the download URL for the extension zip.
# Prefer jq if available, fall back to grep/sed.
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

# Download the release zip to a temp file.
TEMP_ZIP=$(mktemp /tmp/spotlight.XXXXXX.zip)
curl -sL --fail "$DOWNLOAD_URL" -o "$TEMP_ZIP"

echo "Installing extension..."
gnome-extensions install --force "$TEMP_ZIP"
rm -f "$TEMP_ZIP"

echo ""
echo "Extension installed successfully!"
echo ""
echo "On Wayland, log out and back in before enabling."
echo "Then run: gnome-extensions enable ${UUID}"
