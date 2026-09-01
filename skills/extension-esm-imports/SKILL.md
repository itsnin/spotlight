# extension-esm-imports

## syntax
import Name from gi://Gio
import {Exported} from ./relative/path.js

## forbidden
imports.gi.* legacy imports are forbidden

## process isolation
shell files must never import Gtk Gdk Adw
prefs files must never import St Clutter Meta Shell

## relative paths
imports resolve relative to the file location use correct number of dot dots

## extension base
import Extension from resource:///org/gnome/shell/extensions/extension.js
import ExtensionPreferences from resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js
