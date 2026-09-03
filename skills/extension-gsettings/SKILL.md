# extension-gsettings

## Schema location
schemas/ directory at extension root. Filename must match schema ID pattern.

## Schema ID
org.gnome.shell.extensions.<extensionname> — follows GNOME convention.

## Schema compilation
gschemas.compiled must never be shipped. GNOME Shell 44+ compiles automatically on install.

## Key types
'as' = string array (for shortcuts), 'b' = boolean, 'i' = integer, 's' = string.

## Binding
Use Gio.SettingsBindFlags.DEFAULT for widget binding in prefs.

## Listening
connectObject on 'changed::<key>' or 'changed' for all keys.

## System settings
org.gnome.desktop.interface color-scheme provides system dark/light preference.
Connect to 'changed::color-scheme' for live theme updates when UI is visible.
