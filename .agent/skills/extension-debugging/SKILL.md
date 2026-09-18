# extension-debugging

## Logs
`journalctl -b /usr/bin/gnome-shell | grep extensionname`

## Log Levels
`console.debug`, `console.info`, `console.warn`, `console.error`. Prefer the appropriate level.

## Looking Glass
Alt+F2, type `lg`. Inspect objects and signals live.

## Nested Shell
`dbus-run-session gnome-shell --nested --wayland` for safe testing.

## Schema Reload
`glib-compile-schemas schemas/` after schema changes.

## Overview Search Diagnostics

If typing while the Overview is visible causes blanking, inspect the
ControlsManager `_onSearchChanged()` path. Stage-level capture cannot prevent
the earlier Overview handler from running, and the stolen search controller
must be shown when it is reparented.

For popup activation issues, verify the mouse, keyboard, and external-window
focus defenses together.
