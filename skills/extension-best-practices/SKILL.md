---
name: extension-best-practices
description: AI-specific best practices and code quality patterns for GNOME Shell extensions. What to avoid, what to prefer.
---

# best practices

## submissions require maintainership

publishing on ego is an agreement to maintain the extension for gnome users

if the author does not know how to read or debug javascript they should keep the generated extension for personal local use and not upload to ego

## avoid unnecessary try catch wrappers

do not wrap functions in try catch blocks if they never throw errors during normal execution

standard methods like `destroy()` `connect()` `disconnect()` `abort()` and `GLib.Source.remove()` do not throw unhandled exceptions

wrong:
```javascript
try {
    GLib.Source.remove(this._sourceId);
} catch (e) {
}
```

right:
```javascript
GLib.Source.remove(this._sourceId);
```

try catch is legitimate only for genuine external failure points file i o json parsing of external data

## avoid unnecessary checks

do not use optional chaining or function type checks for guaranteed methods or built in apis

wrong:
```javascript
this.beep?.();  // beep is defined in the same class guaranteed to exist
```

right:
```javascript
this.beep();
```

optional chaining is allowed for genuinely potentially null objects like `focussedWindow?.get_wm_class()`

## no _destroyed flags

do not use boolean flags like `this._destroyed` to guard against race conditions

after calling `destroy()` the instance should be nulled out and never used again

## no js-only properties in gobject constructors

gobject constructors only accept registered gobject properties

never pass arbitrary javascript properties like `_entry` `_data` `_item` through the constructor params object

these are not registered as gobject properties and will throw "no property _x on TypeName" at runtime

wrong:
```javascript
const item = new St.BoxLayout({
    _entry: entry,       // ❌ JS-only property, not a GObject property
    style: 'padding: 6px;',
    style_class: 'button',
});
```

right:
```javascript
const item = new St.BoxLayout({
    style: 'padding: 6px;',
    style_class: 'button',
});
item._entry = entry;  // ✅ assign as regular JS property after construction
```

this rule applies to all gobject derived classes: `St.*` `Clutter.*` `Gio.*` `Adw.*` `Gtk.*`

legitimate constructor properties are things like `style` `style_class` `visible` `reactive` `can_focus` `vertical` `text` `label` `icon_name` `layout_manager` `width` `height` `x_expand` `y_expand` `x_align` `y_align` `title` `subtitle` `model` `selected` `adjustment` `value`

## verify called methods actually exist

before calling a method on an object verify the method is actually defined on that class

this is especially important when adapting code patterns from one class to another

wrong:
```javascript
// spotlightPopup uses positioner.showCentered() which exists
// clipboardPopup copies the pattern but calls centerOnPrimary() which does NOT exist
this._positioner = new PopupPositioner();
this._positioner.centerOnPrimary(this);  // ❌ TypeError: centerOnPrimary is not a function
```

right:
```javascript
// either add the missing method to the class, or use an existing one
this._positioner = new PopupPositioner();
this._positioner.centerOnPrimary(this);  // ✅ method was added to PopupPositioner class
```

node --check cannot catch this since it is a runtime type error. static code review must catch it.

## override destroy() directly not connect to signal

override `destroy()` on your subclass do not connect a listener to the `destroy` signal

## icons vs emojis

use `St.Icon` or `icon_name` properties for shell ui icons
use `Gtk.Image` for preferences ui icons
never use unicode emojis as icons

## line length

keep lines within roughly 200 characters so reviewers do not need to scroll horizontally

## comments

write self explanatory code with clear names so redundant comments are unnecessary

comments that explain basic javascript syntax or translate code line by line are not allowed

## helper functions over code duplication

avoid copying identical code blocks extract repetitive logic into modular helper functions

## keep entry point small

avoid putting thousands of lines into extension.js split logic into smaller modules

large entry points make reviewing cleanup extremely difficult

## keep enable and disable close

keep `enable()` and `disable()` methods next to each other for easy review

## modules over single file

putting all logic into one large file makes maintenance and review difficult

extremely large files can even freeze the ego review ui while loading diffs

## avoid spaghetti cleanup

every class must be responsible for managing its own resources

initializing in one class and cleanup in another makes leaks extremely difficult to review

## keep timeout removal next to creation

if a function creates a timer place the existing source removal directly adjacent to the creation line

## source

extracted from official gjs.guide best practices verified via docs-gnome-extension repo
