# Popup Close Defense

The multi-layer close defense lives in `lib/popup/behavior/defense.js` as `installCloseDefense()` and `uninstallCloseDefense()` functions. It installs on each popup open and uninstalls on each close.

Spotlight uses a multi-layer defense to ensure the popup closes reliably when any result is activated. This solves the problem where some activations create new windows, some open URLs in browsers, and some copy to clipboard without any window creation.

## Layer 1: Mouse Click Capture

A `button-press-event` handler connected to the search results widget catches ALL mouse clicks on any result. Uses `GLib.idle_add` so the activation handler runs first, then the popup closes. Disconnected in `_doClose` via `disconnectObject`.

## Layer 2: Keyboard Activation Capture

In the popup's `captured-event` handler, Enter and Space keys are captured when focus lands on a result button rather than the entry or a popup menu. This covers keyboard activation of copy-to-clipboard buttons and similar result actions that do not create windows.

## Layer 3: External Window Focus Tracking

A `global.display` `notify::focus-window` handler tracks external application focus at the window manager level. Catches web search results opening in browsers, any application launching, or anything that shifts focus outside GNOME Shell. Disconnected in `_doClose`.

## Additional Safeguards

- `activateDefault` and `activate` are both overridden on the search results to call `close()` first, then run the original
- `window-created` and `app-state-changed` signals on `global.display` and `Shell.AppSystem` provide additional triggers
- `notify::key-focus` handler closes when focus leaves the widget tree, except for popup menus
- Backdrop `button-release-event` catches clicks outside the popup
- Esc key in captured-event closes the popup
- Ctrl+Space shortcut toggles the popup

## Why So Many Layers

Different result types behave differently. Application launches create windows and shift focus. Web search opens an external browser. Calculator results copy to clipboard without creating windows. Some results open popup menus. No single mechanism catches all cases reliably.
