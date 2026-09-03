# extension-signal-cleanup

## connectObject

This is the preferred pattern for all objects that support it. Pass this as the final argument and calling disconnectObject on this in destroy or disable cleans all handlers at once.

## Plain Connect

Use plain connect for signals that need to stay connected across open and close cycles. Store the handler ID in this._someId and call disconnect with the explicit ID during cleanup. An example would be the overview key capture in Spotlight that persists while the extension is enabled.

## Never Mix

Do not use plain connect for objects that support connectObject because it causes leaks.

## Short-Lived Widgets

Plain connect is safe for short-lived widgets because GObject auto-disconnects on finalize.
