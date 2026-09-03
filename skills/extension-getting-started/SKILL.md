# extension-getting-started

## Required files
extension.js, metadata.json

## Optional files
prefs.js, stylesheet.css, schemas/ directory

## Install location
~/.local/share/gnome-shell/extensions/<uuid>/
Directory name must match UUID.

## Enable/disable
Extension class extends Extension. Has enable() and disable() methods.

## Prefs class
Prefs class extends ExtensionPreferences. Has fillPreferencesWindow() method.
