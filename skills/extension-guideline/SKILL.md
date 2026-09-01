# extension-guideline

## process isolation
shell no Gtk Gdk Adw prefs no St Clutter Meta Shell

## cleanup
everything created in enable destroyed in disable signals cleaned

## signals
connectObject preferred plain connect only for global.display global.stage

## esm
import gi://Name not imports.gi.Name

## constructor
no underscore properties in GObject constructors assign after

## css
only /* */ comments

## try catch
only file io json parsing regex

## optional chaining
prohibited for guaranteed objects
