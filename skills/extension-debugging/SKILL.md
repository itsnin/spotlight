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

For black screen issues when typing in the overview: the ControlsManager reacts to notify::search-active by calling _onSearchChanged() which fades out app display and workspaces display while fading in the now-empty search controller. Stage key capture cannot prevent this because the overview handler connects earlier and fires first in the capture chain. The fix must intercept at the _onSearchChanged() level. Critical: _searchController.show() must be called somewhere or results stay invisible since the controller gets hidden in stealOverviewSearch().

For popup not closing on activation, verify all three defense layers are connected: button-press-event on results, Enter/Space key capture, and notify::focus-window on global.display. Journalctl command: journalctl -b /usr/bin/gnome-shell | grep spotlight.
