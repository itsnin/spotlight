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

## In Spotlight

For black screen issues when typing in the overview, the problem is usually the overview type-to-search handler firing before Spotlight stage capture. Check that `_overviewKeyCaptureId` is connected and that the condition `!Main.overview.visible` correctly intercepts printable keys. For popup not closing on activation, verify all three defense layers are connected: button-press-event on results, Enter/Space key capture, and `notify::focus-window` on `global.display`. Journalctl command: `journalctl -b /usr/bin/gnome-shell | grep spotlight`.
