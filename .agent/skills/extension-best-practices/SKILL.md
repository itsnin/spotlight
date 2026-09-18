# extension-best-practices

## Structure

Use lib for library code organized by concern, such as lib/ui, lib/core and lib/utils. The src prefix implies a build step so use lib for extensions that do not need compilation.

## GObject Constructor

Never pass underscore-prefixed properties through GObject constructors. Assign them after construction instead.

## Layout Managers

`St.BinLayout` is not available as a constructor from `gi://St`. Use `new Clutter.BinLayout()` from `gi://Clutter` instead. Verified against actual GNOME Shell source in js/ui/modalDialog.js. `St.BoxLayout` and `St.Table` are available directly from `St`.

## Popup Positioning and Sizing
Position the popup once at open time, never reposition as results come in. Vertical center at 25 percent of monitor height from the top, clamped with a minimum top margin of 20 px so the popup never goes off-screen. Width fixed at 520 px capped at 85 percent of monitor width. Max height cap is 540 px. Results grow naturally within this limit.

## Animations
Use `actor.ease()` with `Clutter.AnimationMode.EASE_OUT_QUAD` — this matches GNOME Shell's own pattern in `overviewControls.js _onSearchChanged()`. Open: opacity 0→255 and scale 0.96→1.0 over 180ms. Close: opacity 255→0 over 150ms. Always check `St.Settings.get().enable_animations` first and skip easing entirely if false. Cancel in-flight transitions with `actor.remove_transition(name)` before starting new ones to handle rapid toggling.

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

## Workspace Thumbnail Scale

GNOME Shell workspace thumbnails in the overview are intentionally small by default.
To make them actually usable on modern high-resolution displays, increase the
_maxThumbnailScale value. The default is approximately 0.05, setting it to 0.1
effectively doubles the maximum available size. This must be applied to both the
primary monitor thumbnails box and the SecondaryMonitorDisplay prototype method
_getThumbnailsHeight for multi-monitor setups. Always back up the original values
in enable and restore them in disable.

## Overview Type-to-Search Interception

The GNOME overview has a start-typing-to-search feature that activates on any printable key press at the stage level. When an extension permanently steals the overview search widgets, this feature causes two problems. First, the overview handler fires before any extension-connected handler because it connected earlier in the capture chain, so EVENT_STOP from an extension cannot prevent it. Second, the ControlsManager reacts to the resulting notify::search-active by calling _onSearchChanged() which fades out the app display and workspaces display while fading in the now-empty search controller, causing a black screen. Stage key capture intercepts printable keys at the captured-event level. When the popup is closed it returns EVENT_STOP which prevents later handlers but not the overview handler. When the popup is open it manually forwards the event to the entry via entry.event(event) before returning EVENT_STOP. The ControlsManager black screen reaction requires a separate fix at the _onSearchChanged() level.

## GNOME 51 Porting Notes

GNOME 51 introduces SearchEntry in ui/search.js which replaces St.Entry in ControlsManager. The new class likely extends St.Entry and adds an activate-new-instance signal on Ctrl+Enter. Basic St.Widget and St.Entry methods should continue to work. The old way of connecting event signals directly to actors still works but is deprecated in favor of Clutter event controllers (Clutter.KeyController, Clutter.ClickGesture etc). Shell.GLSLEffect was removed, use Clutter.ShaderEffect instead. Clutter.get_default_backend() was removed, use global.stage.context.get_backend() or actor.get_context().get_backend() instead. The ui/pointerWatcher.js module was removed, use global.backend.get_cursor_tracker() for cursor tracking needs. PopupMenu open() and close() now accept a parameters object like {animate: false} instead of a single animation argument.

## Workspace Thumbnail Background

GNOME Shell uses a solid grey color for workspace thumbnails by default. To show the actual wallpaper instead, override WorkspaceThumbnail.prototype._init to create a BackgroundManager with the thumbnail's _contents container and vignette disabled. Also override _onDestroy to clean up the BackgroundManager and its signal connections. Connect to the BackgroundManager's 'loaded' and 'changed' signals to queue_relayout on the background actor, working around a Shell 50 bug where thumbnails stay blank until a relayout is forced.

## Multi-Monitor Thumbnail Safety

When overriding WorkspaceThumbnail.prototype._init or SecondaryMonitorDisplay prototype methods, guard against edge cases that appear in vertical monitor configurations. Validate that `_contents` exists before creating a BackgroundManager. Clamp `monitorIndex` to the valid range of `Main.layoutManager.monitors`. In `_getThumbnailsHeight` overrides, fall back to the private `_maxThumbnailScale` field if the public getter is unavailable, and guard the return value with `Number.isFinite()` — returning `NaN` from layout methods breaks the overview.
