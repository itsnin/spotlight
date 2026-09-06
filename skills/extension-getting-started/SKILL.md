# extension-getting-started

## Required Files
`extension.js`, `metadata.json`

## Optional Files
`prefs.js`, `stylesheet.css`, `schemas/` directory

## Install Location
`~/.local/share/gnome-shell/extensions/<uuid>/`
Directory name must match the UUID.

## Enable/Disable
Extension class extends `Extension`. Has `enable()` and `disable()` methods.

## Prefs Class
Prefs class extends `ExtensionPreferences`. Has `fillPreferencesWindow()` method.

## In Spotlight

Entry point is `extension.js` which constructs `SpotlightPopup` and `KeybindingManager`. On enable, the popup steals the GNOME Overview search widgets permanently. The popup opens on Ctrl+Space via `global.display.grab_accelerator`. Build and install locally with `scripts/build.sh`, then enable via `gnome-extensions enable spotlight@nin`. Log out and back in on Wayland.
