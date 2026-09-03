# extension-signal-cleanup

## connectObject
Preferred pattern for all objects that support it. Pass 'this' as final argument.
disconnectObject(this) in destroy or disable cleans all handlers at once.

## Plain connect
Use plain connect for signals that need to stay connected across open/close cycles.
Store handler ID in this._someId. Call disconnect with explicit ID in cleanup.
Example: overview key capture in Spotlight that persists while extension is enabled.

## Never mix
Don't use plain connect for objects that support connectObject — it causes leaks.

## Short-lived widgets
Plain connect is safe for short-lived widgets. GObject auto-disconnects on finalize.
