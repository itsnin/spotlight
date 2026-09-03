# extension-best-practices

## Structure

Use lib for library code organized by concern, such as lib/ui, lib/core and lib/utils. The src prefix implies a build step so use lib for extensions that do not need compilation.

## GObject Constructor

Never pass underscore-prefixed properties through GObject constructors. Assign them after construction instead.

## Enable and Disable

Enable and disable must be adjacent in extension.js. Every object created in enable should be destroyed in disable, in reverse dependency order.

## Signals

Use connectObject with this as the owner for all signals on objects that support it. This works on global.display and global.stage in GNOME Shell 45 and later. Use plain connect with explicit ID tracking only for signals that must persist across open and close cycles.

## Key Events

Use notify::keyval with Clutter.KEY symbols rather than notify::key with hardware keycodes.

## Icons

Use symbolic icons through St.Icon with icon_name. Never use Unicode characters for this purpose.

## Optional Chaining

Optional chaining is prohibited for guaranteed objects and only allowed for genuinely potentially-null objects.

## Try and Catch

Use try-catch only for file I/O, JSON parsing and regex. Never wrap standard GNOME API calls with it.

## Process Isolation

The shell process must never import Gtk, Gdk or Adw. The prefs process must never import St, Clutter, Meta or Shell.

## CSS

Only block comments are allowed. Never use line comments.

## Method Verification

Verify that every called method actually exists on the target class before calling it.

## Settings Assignment

When adapting constructors, assign this._settings before any method call that might need it.

## GNOME Search Results Activation

When overriding GNOME search results behavior, override both activateDefault and activate. The former handles Enter on the first result while the latter handles Tab-selected specific results.

## St Widget Style Class Check

Use has_style_class_name rather than style_class.includes. The string version can produce false matches on longer class names like popup-menu-item.

## Activation Close, Comprehensive

The notify::key-focus signal only tracks focus within the shell stage. Mouse clicks on result buttons stay within the stage and do not trigger a close. Use global.display notify::focus-window to detect external app focus at the window manager level. This catches all cases including web search, existing browser new tabs, copy to clipboard and any other external activation. Connect in _doOpen, disconnect in _doClose and guard with the this._visible check. Close when focus_window is not null.

Three-layer defense. First, button-press-event on _search catches all mouse clicks on results. Second, Enter or Space key capture in captured-event catches keyboard activation of result buttons. Third, global.display notify::focus-window catches external app focus at the WM level.
