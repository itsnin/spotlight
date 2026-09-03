# extension-signal-cleanup

## connectObject
Preferred pattern for all objects that support it. Pass `this` as the final argument.
`disconnectObject(this)` in `destroy()` or `disable()` cleans all handlers at once.

## Plain Connect
Use plain `connect` for signals that need to stay connected across open/close cycles.
Store the handler ID in `this._someId`. Call `disconnect` with the explicit ID in cleanup.
Example: overview key capture in Spotlight that persists while the extension is enabled.

## Never Mix
Don't use plain `connect` for objects that support `connectObject`, it causes leaks.

## Short-Lived Widgets
Plain `connect` is safe for short-lived widgets. GObject auto-disconnects on finalize.
