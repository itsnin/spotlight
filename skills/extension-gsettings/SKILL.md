# extension-gsettings

## Schema Location

The schemas directory sits at the extension root. Filenames must match the schema ID pattern.

## Schema ID

org.gnome.shell.extensions.extensionname follows the GNOME convention.

## Schema Compilation

The gschemas.compiled file must never be shipped. GNOME Shell 44 and later compiles automatically on install.

## Key Types

as means string array for shortcuts, b is boolean, i is integer and s is string.

## Binding

Use Gio.SettingsBindFlags.DEFAULT for widget binding in prefs.

## Listening

Use connectObject on changed::key or changed for all keys.

## System Settings

org.gnome.desktop.interface color-scheme provides the system dark and light preference. Connect to changed::color-scheme for live theme updates when the UI is visible.

## In Spotlight

Two schema keys only. `toggle-shortcut` (type `as`, default `['<Control>space']`) controls the keyboard shortcut. `theme-preference` (type `s`, default `'default'`) controls the visual theme with values `default`, `dark`, or `light`. Settings are created once in `extension.enable()` and passed to the popup constructor. The popup also creates a separate `Gio.Settings` instance for `org.gnome.desktop.interface` to detect system color scheme changes.
