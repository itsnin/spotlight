# extension-prefs

## entry point
prefs.js at root exports default class extending ExtensionPreferences

## fillPreferencesWindow
single method receives Adw.PreferencesWindow add Adw.PreferencesPage instances

## process isolation
prefs process must never import St Clutter Meta Shell
only Adw Gtk Gio GLib GObject allowed

## binding
settings.bind key widget property Gio.SettingsBindFlags.DEFAULT

## shortcut rows
use Adw.ActionRow with Gtk.ShortcutLabel or custom accelerator capture

## gdk keyval name
Gdk.keyval_name can return null for unknown keyvals always null check before calling methods on the result