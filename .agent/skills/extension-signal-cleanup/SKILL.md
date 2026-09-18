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

## Scope Safety in Cleanup Functions

Never reference module imports or closure variables in cleanup functions that may be called from a different scope. If a signal needs a settings object for cleanup, store it on the owner (e.g. `popup._ifaceSettings`) and access it through the owner parameter, or pass it as an explicit argument. A bare `ifaceSettings` reference inside a cleanup function that does not import or receive it will throw `ReferenceError` at disable time.
