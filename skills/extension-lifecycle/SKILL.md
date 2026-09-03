# extension-lifecycle

## Enable/disable symmetry
enable and disable must be adjacent in extension.js.

## Construction order
Create settings first, then managers, then UI widgets.

## Destruction order
Destroy in reverse order of creation: UI first, then managers, then settings.

## Cleanup completeness
Every object assigned to this in enable must be set to null in disable.

## GObject dispose
Never call run_dispose() unless absolutely necessary. destroy() is sufficient for St widgets.

## Async resources
Async initializers must have matching destroy that cancels pending operations.
