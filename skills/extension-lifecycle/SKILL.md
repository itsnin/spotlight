# extension-lifecycle

## Enable/Disable Symmetry
`enable()` and `disable()` must be adjacent in `extension.js`.

## Construction Order
Create settings first, then managers, then UI widgets.

## Destruction Order
Destroy in reverse order of creation: UI first, then managers, then settings.

## Cleanup Completeness
Every object assigned to `this` in `enable()` must be set to null in `disable()`.

## GObject Dispose
Never call `run_dispose()` unless absolutely necessary. `destroy()` is sufficient for St widgets.

## Async Resources
Async initializers must have matching destroy that cancels pending operations.
