# extension-esm-imports

## Syntax
`import Name from 'gi://Gio'`
`import {Exported} from './relative/path.js'`

## Forbidden
`imports.gi.*` legacy imports are forbidden.

## Process Isolation
Shell files must never import Gtk, Gdk, or Adw.
Prefs files must never import St, Clutter, Meta, or Shell.

## Relative Paths
Imports resolve relative to the file location. Use the correct number of dot-dots.

## Extension Base
`import Extension from 'resource:///org/gnome/shell/extensions/extension.js'`
`import ExtensionPreferences from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'`

## GNOME 51 SearchEntry

ControlsManager in ui/overviewControls.js now uses SearchEntry from ui/search.js instead of St.Entry. SearchEntry emits activate-new-instance on Ctrl+Enter. If an extension steals Main.overview.searchEntry, it should still work with basic St.Entry methods since SearchEntry likely extends St.Entry.

## In Spotlight

All imports use the `resource:///org/gnome/shell/` prefix for GNOME Shell modules and `gi://` for GObject introspection. Relative imports are used for internal modules like `./lib/ui/spotlightPopup.js` and `./lib/core/keybinding.js`. In GNOME 51, `ControlsManager` uses `SearchEntry` from `ui/search.js` instead of `St.Entry` — Spotlight steals this via `Main.overview.searchEntry` and the new class likely extends `St.Entry` so existing code works unchanged.
