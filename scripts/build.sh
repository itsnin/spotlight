#!/bin/bash
# Installs Spotlight directly from GitHub main branch
# Usage: ./scripts/build.sh
#    or: curl -sL https://raw.githubusercontent.com/itsnin/spotlight/main/scripts/build.sh | bash
set -e

# Configuration
REPO_OWNER="itsnin"
REPO_NAME="spotlight"
BRANCH="main"
UUID="spotlight@nin"
GETTEXT_DOMAIN="spotlight"
BASE_URL="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}"

# Extension source files to download from main branch
FILES=(
    "extension.js"
    "keybinding.js"
    "popupBackdrop.js"
    "popupPositioner.js"
    "prefs.js"
    "spotlightPopup.js"
    "stylesheet.css"
    "metadata.json"
    "schemas/org.gnome.shell.extensions.spotlight.gschema.xml"
    "prefs/shortcutPage.js"
    "prefs/appearancePage.js"
    "prefs/aboutPage.js"
)

# Install directory
INSTALL_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

echo "Installing Spotlight from ${BRANCH} branch..."
echo "Target: ${INSTALL_DIR}"

# Create directory structure
mkdir -p "${INSTALL_DIR}/schemas"
mkdir -p "${INSTALL_DIR}/prefs"

# Download each file
for filepath in "${FILES[@]}"; do
    echo "  Downloading ${filepath}..."
    curl -sL --fail "${BASE_URL}/${filepath}" -o "${INSTALL_DIR}/${filepath}"
done

# Compile schemas
echo "  Compiling schemas..."
glib-compile-schemas "${INSTALL_DIR}/schemas/"

# Download and compile translations
# Check if locale directory exists with .po source files
LOCALE_LIST_URL="${BASE_URL}/locale"
if command -v msgfmt >/dev/null 2>&1; then
    echo "  Checking for translations..."
    # Try to download known language files and compile them
    # Translators add .po files to locale/ in the repo
    # At install time we compile them to .mo in the installed locale structure
    for po_file in $(curl -sL "${BASE_URL}/locale/" 2>/dev/null | grep -oP '[a-z]{2}(_[A-Z]{2})?\.po' | sort -u); do
        lang_code="${po_file%.po}"
        echo "    Compiling translation: ${lang_code}"
        mkdir -p "${INSTALL_DIR}/locale/${lang_code}/LC_MESSAGES"
        curl -sL --fail "${BASE_URL}/locale/${po_file}" -o /tmp/spotlight_${lang_code}.po
        msgfmt -o "${INSTALL_DIR}/locale/${lang_code}/LC_MESSAGES/${GETTEXT_DOMAIN}.mo" "/tmp/spotlight_${lang_code}.po"
        rm -f "/tmp/spotlight_${lang_code}.po"
    done
fi

echo ""
echo "Spotlight installed successfully!"
echo ""
echo "To enable:"
echo "  gnome-extensions enable ${UUID}"
echo ""
echo "On Wayland, log out and back in to activate."
