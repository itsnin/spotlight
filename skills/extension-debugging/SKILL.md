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
