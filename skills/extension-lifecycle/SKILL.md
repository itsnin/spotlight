# extension-lifecycle

## enable disable symmetry
enable and disable must be adjacent in extension.js

## construction order
create settings first then managers then ui widgets

## destruction order
destroy in reverse order of creation ui first then managers then settings

## cleanup completeness
every object assigned to this in enable must be set to null in disable

## GObject dispose
never call run_dispose unless absolutely necessary destroy is sufficient for st widgets

## async resources
async initializers must have matching destroy that cancels pending operations
