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
