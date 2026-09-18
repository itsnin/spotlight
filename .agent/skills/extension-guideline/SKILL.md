# extension-guideline

## Process Isolation
Shell: no Gtk, Gdk, Adw. Prefs: no St, Clutter, Meta, Shell.

## Cleanup
Everything created in `enable()` destroyed in `disable()`. Signals cleaned.

## Signals
`connectObject` preferred. Plain `connect` only for signals that must persist across open/close.

## ESM
`import 'gi://Name'`, not `imports.gi.Name`.

## Constructor
No underscore properties in GObject constructors. Assign after.

## CSS
Only `/* */` comments.

## Try/Catch
Only file I/O, JSON parsing, regex.

## Optional Chaining
Prohibited for guaranteed objects.
