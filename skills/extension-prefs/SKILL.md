# extension-prefs

## Entry point
prefs.js at root. Exports default class extending ExtensionPreferences.

## fillPreferencesWindow
Single method receives Adw.PreferencesWindow. Add Adw.PreferencesPage instances.

## Process isolation
Prefs process must never import St, Clutter, Meta, or Shell.
Only Adw, Gtk, Gio, GLib, GObject allowed.

## Binding
settings.bind(key, widget, property, Gio.SettingsBindFlags.DEFAULT).

## Shortcut rows
Use Adw.ActionRow with Gtk.ShortcutLabel or custom accelerator capture.

## Gdk keyval name
Gdk.keyval_name() can return null for unknown keyvals. Always null-check before calling methods on the result.
