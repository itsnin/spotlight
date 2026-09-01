# extension-signal-cleanup

## connectObject
preferred pattern for all objects that support it pass this as final argument
disconnectObject this in destroy or disable cleans all handlers at once

## plain connect
required for global.display and global.stage which do not support connectObject
store handler id in this._someId call disconnect with explicit id in cleanup

## never mix
do not use plain connect for objects that support connectObject it causes leaks

## short lived widgets
plain connect is safe for short lived widgets gobject auto disconnects on finalize
