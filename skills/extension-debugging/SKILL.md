# extension-debugging

## logs
journalctl b /usr/bin/gnome-shell grep extensionname

## log levels
console.debug console.info console.warn console.error prefer appropriate level

## looking glass
alt f2 type lg inspect objects and signals live

## nested shell
dbus run session gnome shell nested wayland for safe testing

## schema reload
glib compile schemas schemas after schema changes
