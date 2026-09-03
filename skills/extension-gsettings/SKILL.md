# extension-gsettings

## Schema Location
`schemas/` directory at the extension root. Filename must match the schema ID pattern.

## Schema ID
`org.gnome.shell.extensions.<extensionname>`, follows the GNOME convention.

## Schema Compilation
`gschemas.compiled` must never be shipped. GNOME Shell 44+ compiles automatically on install.

## Key Types
`'as'` = string array (for shortcuts), `'b'` = boolean, `'i'` = integer, `'s'` = string.

## Binding
Use `Gio.SettingsBindFlags.DEFAULT` for widget binding in prefs.

## Listening
`connectObject` on `'changed::<key>'` or `'changed'` for all keys.

## System Settings
`org.gnome.desktop.interface` `color-scheme` provides the system dark/light preference.
Connect to `'changed::color-scheme'` for live theme updates when the UI is visible.
