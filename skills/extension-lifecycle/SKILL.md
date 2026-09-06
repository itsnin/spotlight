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

## In Spotlight

`enable()` and `disable()` are adjacent in `extension.js`. In `enable()` we create the popup, steal overview search widgets permanently, set up the keybinding manager, and connect to GSettings. In `disable()` we disconnect all signals via `disconnectObject`, disable the keybinding manager, return the stolen search widgets to the overview via `returnOverviewSearch()`, destroy the popup, and null out all references. The popup has its own sub-lifecycle: `stealOverviewSearch` runs once, `open`/`close` run many times, `destroy` runs once.
