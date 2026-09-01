# extension-best-practices

## GObject constructor rule

never pass custom underscore prefixed properties through GObject constructors they get silently dropped and cause null reference crashes

set custom properties after construction via assignment

wrong:
```javascript
new MyClass({ _customProp: value });
```

right:
```javascript
const obj = new MyClass();
obj._customProp = value;
```

## enable and disable must be adjacent

enable and disable methods must be kept next to each other in extension.js for easy review

every object created in enable must be destroyed in disable in reverse order of dependency

## signal cleanup with connectObject

always use connectObject with this as the final argument for signals on objects that outlive the handler

this lets disconnectObject(this) clean up all handlers in one call during disable

never use plain connect for signals on objects that support connectObject

exceptions: global.display and global.stage do not support connectObject use plain connect with explicit ID tracking and disconnect

## use notify_keyval not notify_key

when simulating key events use notify_keyval with Clutter.KEY_* symbols not notify_key with raw hardware keycodes

hardware keycodes vary by keyboard layout and silently fail on non us keyboards

## use symbolic icons not unicode characters

buttons in the shell ui should use St.Icon with proper icon_name symbolic icons from the gnome icon theme

## optional chaining prohibited for guaranteed objects

optional chaining is only allowed for genuinely nullable objects never for objects that are guaranteed to exist by construction

using it for guaranteed objects masks bugs and makes failures silent

## try catch only for file io and parsing

never wrap standard gnome api calls in try catch

try catch is allowed only for file io json parsing regex operations and other genuinely fallible external operations

## process isolation

shell process files must never import Gtk Gdk or Adw

preferences process files must never import St Clutter Meta or Shell

## css comments

css must use only block comments /* */ never line comments //

## verify called methods exist

when one class calls methods on another object grep for every method call and verify the target class implements it

missing methods cause undefined is not a function crashes at runtime

## when adapting constructors assign settings before any method call

if a class receives settings via constructor and stores it as this._settings the assignment must happen before any method call that might need it

helper methods like _loadSettings called during _init will crash if this._settings is not yet assigned

## process isolation

shell process files must never import Gtk Gdk or Adw

preferences process files must never import St Clutter Meta or Shell

## css comments

css must use only block comments /* */ never line comments //
