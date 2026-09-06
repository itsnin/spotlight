# extension-prefs

## Entry Point
`prefs.js` at root. Exports default class extending `ExtensionPreferences`.

## fillPreferencesWindow
Single method receives `Adw.PreferencesWindow`. Add `Adw.PreferencesPage` instances.

## Process Isolation
Prefs process must never import St, Clutter, Meta, or Shell.
Only Adw, Gtk, Gio, GLib, GObject are allowed.

## Binding
`settings.bind(key, widget, property, Gio.SettingsBindFlags.DEFAULT)`

## Shortcut Rows
Use `Adw.ActionRow` with `Gtk.ShortcutLabel` or custom accelerator capture.

## Gdk Keyval Name
`Gdk.keyval_name()` can return null for unknown keyvals. Always null-check before calling methods on the result.

## In Spotlight

Prefs window has three pages. `shortcutPage.js` handles the keyboard shortcut with a shortcut editor. `appearancePage.js` provides a combo row for theme preference with options Default, Dark, and Light. `aboutPage.js` shows extension name, version, and description. The prefs process never imports `St`, `Clutter`, `Meta`, or `Shell`. All UI is built with `Adw` and `Gtk`.
