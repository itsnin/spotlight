# extension-signal-cleanup

## connectObject

This is the preferred pattern for all objects that support it. Pass this as the final argument and calling disconnectObject on this in destroy or disable cleans all handlers at once.

## Plain Connect

Use plain connect for signals that need to stay connected across open and close cycles. Store the handler ID in this._someId and call disconnect with the explicit ID during cleanup. An example would be the overview key capture in Spotlight that persists while the extension is enabled.

## Never Mix Lifetimes

Never mix persistent and ephemeral signals on the same `(GObject, owner)` pair. `disconnectObject(owner)` removes ALL handlers for that owner on that object at once. If some signals must persist across open/close cycles while others are installed per-open, use plain `connect` with explicit ID tracking for one lifetime and `connectObject` for the other. Or use different owner objects for each lifetime scope.

Do not use plain connect for objects that support connectObject when the lifetimes match, because it causes leaks.

## Short-Lived Widgets

Plain connect is safe for short-lived widgets because GObject auto-disconnects on finalize.

## In Spotlight

`connectObject` is used throughout `lib/popup/behavior/` and `lib/popup/widget/` for signals on `global.stage`, `this._ifaceSettings`, and the search actor. The persistent `window-created` and `app-state-changed` on `global.display` use plain `connect` with explicit IDs because they share the same owner as the ephemeral defense-layer `notify::focus-window` signal and would otherwise get wiped on every close. The popup widget itself is at `lib/popup/widget/spotlightPopup.js`. For `global.stage` captured-event handlers in the overview key capture, plain `connect` with explicit ID tracking is used because those signals persist across open and close cycles and only disconnect in `returnOverviewSearch`.
