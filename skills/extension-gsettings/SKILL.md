# extension-gsettings

## schema location
schemas directory at extension root filename must match schema id pattern

## schema id
org.gnome.shell.extensions.extensionname follows gnome convention

## schema compilation
gschemas.compiled must never be shipped gnome shell 44 compiles automatically on install

## key types
as string array for shortcuts b boolean i integer s string

## binding
use Gio.SettingsBindFlags.DEFAULT for widget binding in prefs

## listening
connectObject on changed key or changed for all keys
