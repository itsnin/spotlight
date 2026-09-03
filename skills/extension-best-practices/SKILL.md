# extension-best-practices

## Structure
Use `lib/` for library code organized by concern: `lib/ui`, `lib/core`, `lib/utils`.
`src/` implies a build step. Use `lib/` for extensions without compilation.

## GObject Constructor
Never pass underscore-prefixed properties through GObject constructors.
Assign after construction instead.

## Enable/Disable
`enable()` and `disable()` must be adjacent in `extension.js`. Every object created in
`enable()` must be destroyed in `disable()`, in reverse dependency order.

## Signals
Use `connectObject` with `this` as owner for all signals on objects supporting it.
Works on `global.display` and `global.stage` in GNOME Shell 45+.
Use plain `connect` with explicit ID tracking only for signals that must persist
across open/close cycles.

## Key Events
Use `notify::keyval` with `Clutter.KEY_*` symbols, not `notify::key` with hardware keycodes.

## Icons
Use symbolic icons (St.Icon with `icon_name`). Never Unicode characters.

## Optional Chaining
Prohibited for guaranteed objects. Only allowed for genuinely potentially-null objects.

## Try/Catch
Only for file I/O, JSON parsing, regex. Never wrap standard GNOME API calls.

## Process Isolation
Shell process must never import Gtk, Gdk, or Adw.
Prefs process must never import St, Clutter, Meta, or Shell.

## CSS
Only block comments `/* */`. Never line comments `//`.

## Method Verification
Verify every called method exists on the target class before calling.

## Settings Assignment
When adapting constructors, assign `this._settings` before any method call that needs it.

## GNOME Search Results Activation
When overriding GNOME search results behavior, override BOTH `activateDefault` AND `activate`.
`activateDefault` handles Enter on the first result. `activate` handles Tab-selected specific results.

## St Widget Style Class Check
Use `has_style_class_name(className)`, not `style_class.includes(className)`.
String includes can false-match on longer class names like `popup-menu-item`.

## Activation Close: Comprehensive
`notify::key-focus` only tracks focus within the shell stage.
Mouse clicks on result buttons stay within the stage and don't trigger close.
Use `global.display` `notify::focus-window` to detect external app focus at the window manager level.
Catches all cases: web search, existing browser new tab, copy to clipboard, any external activation.
Connect in `_doOpen()`, disconnect in `_doClose()`. Guard with `this._visible` check.
Close when `focus_window` is not null.

Three-layer defense:
1. `button-press-event` on `_search`, catches ALL mouse clicks on results
2. Enter/Space key capture in `captured-event`, catches keyboard activation of result buttons
3. `global.display` `notify::focus-window`, catches external app focus at WM level
