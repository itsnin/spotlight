# extension-best-practices

## structure
use lib/ for library code organized by concern lib/ui lib/core lib/utils
src/ implies a build step use lib for extensions without compilation

## GObject constructor
never pass underscore prefixed properties through GObject constructors assign after construction

## enable disable
enable and disable must be adjacent in extension.js every object created in enable must be destroyed in disable in reverse dependency order

## signals
use connectObject with this as owner for all signals on objects supporting it
connectObject works on global.display and global.stage in gnome shell 45 plus
use plain connect with explicit id tracking only for signals that must persist across open close cycles

## key events
use notify_keyval with Clutter.KEY_ symbols not notify_key with hardware keycodes

## icons
use symbolic icons St.Icon with icon_name never unicode characters

## optional chaining
prohibited for guaranteed objects only allowed for genuinely potentially null objects

## try catch
only for file io json parsing regex never wrap standard gnome api calls

## process isolation
shell process must never import Gtk Gdk Adw
prefs process must never import St Clutter Meta Shell

## css
only block comments /* */ never line comments //

## method verification
verify every called method exists on the target class before calling

## settings assignment
when adapting constructors assign this._settings before any method call that needs it

## gnome search results activation
when overriding gnome search results behavior override both activateDefault and activate
activateDefault handles enter on first result activate handles tab selected specific results

## st widget style class check
use has_style_class_name className not style_class includes className
string includes can false match on longer class names like popup menu item
## activation close comprehensive
notify key focus only tracks focus within the shell stage
mouse clicks on result buttons stay within the stage and do not trigger close
use global display notify focus window to detect external app focus at window manager level
this catches all cases web search existing browser new tab copy to clipboard any external activation
connect in doOpen disconnect in doClose guard with this visible check close when focus window is not null