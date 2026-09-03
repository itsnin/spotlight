# extension-debugging

## Logs
journalctl -b /usr/bin/gnome-shell | grep extensionname

## Log levels
console.debug, console.info, console.warn, console.error. Prefer appropriate level.

## Looking Glass
Alt+F2, type 'lg'. Inspect objects and signals live.

## Nested shell
dbus-run-session gnome-shell --nested --wayland for safe testing.

## Schema reload
glib-compile-schemas schemas/ after schema changes.
