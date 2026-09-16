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

## In Spotlight

Spotlight follows a design philosophy of minimal settings and fixed behavior. The popup width is hardcoded at 520px, workspace thumbnail scale is hardcoded at 200%, no animations, no drift. The extension permanently steals the overview search infrastructure rather than building a custom search system. This design decision trades configurability for reliability, consistency, and automatic access to all GNOME search providers.
