# extension-esm-imports

## Syntax
import Name from 'gi://Gio'
import {Exported} from './relative/path.js'

## Forbidden
imports.gi.* legacy imports are forbidden.

## Process isolation
Shell files must never import Gtk, Gdk, or Adw.
Prefs files must never import St, Clutter, Meta, or Shell.

## Relative paths
Imports resolve relative to the file location. Use correct number of dot-dots.

## Extension base
import Extension from 'resource:///org/gnome/shell/extensions/extension.js'
import ExtensionPreferences from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'
