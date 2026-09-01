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

## maximize reuse of upstream code

when adapting features from other extensions keep as much of the original code as possible

only make the minimal changes needed to integrate with spotlight architecture

do not rewrite entire classes from scratch if the upstream version works with minor adaptation

preserving upstream logic makes it easier to merge upstream fixes and reduces the chance of introducing new bugs

wrong:
```javascript
// rewriting emoji category management from scratch with arrays and manual loops
// when upstream already has a well tested EmojiCategory class
this._categoryGrids = [];
this._tabButtons = [];
// ... 100 lines of manual category management
```

right:
```javascript
// import the upstream EmojiCategory class directly
// adapt only the parts that depend on PopupMenu architecture
import { EmojiCategory } from '../services/emoji/emojiCategory.js';
this._emojiCategories = [];
for (let i = 0; i < 9; i++) {
    this._emojiCategories[i] = new EmojiCategory(this._context, ...);
}
```

## dedicated paste buttons must always paste

the paste button must always trigger a paste regardless of the paste on select user setting

the paste on select setting controls whether clicking the main item body auto pastes

the dedicated paste button is an explicit user request to paste and must not be gated

wrong:
```javascript
// paste button uses same method as item click which checks the setting
pasteBtn.connect('clicked', () => this._selectAndPaste(entry));
// _selectAndPaste only pastes if paste-on-select is true
```

right:
```javascript
// paste button calls a dedicated method that always pastes
pasteBtn.connect('clicked', () => this._pasteEntry(entry));
// _pasteEntry: copies + closes popup + always triggers paste
```

## use notify_keyval not notify_key for virtual keyboard events

`notify_key` takes hardware keycodes which vary between keyboard layouts

`notify_keyval` takes symbolic key names like `Clutter.KEY_Shift_L` which work across all keyboards

using raw hardware keycodes like 42 and 110 will silently fail on non us keyboard layouts

wrong:
```javascript
VirtualKeyboard().notify_key(eventTime, 42, Clutter.KeyState.PRESSED);  // hardware keycode!
```

right:
```javascript
VirtualKeyboard().notify_keyval(eventTime, Clutter.KEY_Shift_L, Clutter.KeyState.PRESSED);  // portable symbol
```

## stop_signal_emission must be called during the signal emission

calling `actor.stop_signal_emission('button-press-event')` from inside a `clicked` handler has no effect

the `button-press-event` signal has already finished propagating by the time `clicked` fires

if you need to prevent event propagation connect to `button-press-event` directly and return `Clutter.EVENT_STOP`

## verify upstream-called methods exist on host class

when extracting upstream classes that receive a context object (this.emojiCopy, this.extension), audit every method and property the upstream widgets call on that context

search all upstream files for pattern contextObject.methodName( and contextObject.propertyName

common missing methods when integrating emoji-copy:
- _onSearchTextChanged() — called by emojiCategory and emojiSearchItem
- clearCategories() — called by emojiCategory

if any method is missing the extension will crash at runtime with undefined is not a function

## verify gettext import when extracting code

when extracting code from an upstream extension.js that uses _() for translations ensure the gettext import is included in the extracted file

the original extension.js imports gettext but classes extracted from it may leave the import behind

grep -c "_(" thefile.js — if count > 0 verify gettext is imported

## Registry constructor uses parameter destructuring

clipboard Registry constructor expects { settings, uuid } via object destructuring

extra properties in the params object are harmless but settings and uuid must be present
## prefs UI must expose all merged schema keys

when merging upstream settings into spotlights schema create corresponding prefs pages

use PrefixedSettings in prefs pages too so the UI code can use unprefixed key names

for each setting type use the appropriate Adw widget:
- type=b boolean -> Adw.SwitchRow bound to active property
- type=i integer -> Adw.SpinRow with appropriate Gtk.Adjustment range bound to value
- type=s string choice -> Adw.ComboRow with Gtk.StringList
- type=s free text -> Adw.EntryRow bound to text
- type=as string array -> Adw.EntryRow with comma separated conversion

## schema attribute order varies when parsing

when programmatically parsing gschema xml handle both attribute orders:
`<key name="x" type="y">` and `<key type="y" name="x">`

regex must match either pattern to avoid missing keys

## PrefixedSettings must implement Gio.Settings.bind

when prefs pages use settings.bind() to bind widgets directly to gsettings keys the PrefixedSettings wrapper must implement the bind method

bind translates the key name with prefix and delegates to underlying settings:
```javascript
bind(name, object, property, flags) {
    return this._settings.bind(this._key(name), object, property, flags);
}
```

without bind prefs windows crash with settings.bind is not a function

## when adapting constructors assign settings before any method call

when extracting a class that receives settings via a constructor parameter and stores it as this._settings ensure the assignment happens BEFORE any method call that might need it

the _init method may call helper methods like _loadSettings during construction

wrong:
```javascript
_init(params) {
    super._init(...);
    this._createWidgets();
    this._loadSettings();  // CRASH: this._settings not assigned yet
    this._settings = params.settings;  // too late
}
```

right:
```javascript
_init(params) {
    super._init(...);
    this._settings = params.settings;  // assign FIRST
    this._createWidgets();
    this._loadSettings();  // safe: this._settings exists
}
```

## child schemas prevent flat schema merging

if an upstream extension uses settings.get_child(schemaName) with separate child schema IDs you cannot practically flatten all keys into a single prefixed schema

child schemas are separate schema definitions referenced by ID from the parent schema

keep the upstream schema xml files verbatim in schemas directory and compile them alongside spotlight schema

this is not bundling a separate extension it is just using multiple schema definitions within one extension

## GResource files must be placed at extension path

extensions that bundle css icons or other resources via GResource expect the gresource files at a specific path

the theme manager typically does Gio.resource_load(this.ext.path + /theme.gresource)

copy the gresource files to the extension root directory

## upstream extension classes may need getLogger override

when instantiating an upstream Extension subclass check if it calls this.getLogger() in enable()

the Extension base class provides this method but when adapting you may need to override it with a simple console wrapper:
```javascript
instance.getLogger = () => ({
    debug: (...a) => console.debug('[name]', ...a),
    info: (...a) => console.info('[name]', ...a),
    warning: (...a) => console.warn('[name]', ...a),
    error: (...a) => console.error('[name]', ...a),
});
```

## metadata must include nested metadata object with name

some upstream code accesses this.ext.metadata.name for notification titles and panel button labels

the metadata adapter must include a nested metadata property:
```javascript
const metadata = {
    uuid: 'upstream-uuid',
    path: this.path,
    dir: this.dir,
    metadata: { name: 'Upstream Name', uuid: 'upstream-uuid', version: 1 },
};
```

## use symbolic icons not unicode characters for buttons

buttons in the shell ui should use `St.Icon` with proper `icon_name` symbolic icons from the gnome icon theme

never use unicode characters like 📋 ✎ ★ ✕ as button labels they render inconsistently across fonts and look unprofessional

gnome provides hundreds of consistent symbolic icons in the `/usr/share/icons/` theme

wrong:
```javascript
const btn = new St.Button({ label: '📋' });  // ❌ unicode character
```

right:
```javascript
const btn = new St.Button({
    child: new St.Icon({
        icon_name: 'edit-paste-symbolic',  // ✅ proper symbolic icon
        icon_size: 14,
    }),
});
```

common icon names:
- paste: `edit-paste-symbolic`
- edit: `document-edit-symbolic`
- delete: `edit-delete-symbolic`
- pin: `view-pin-symbolic`
- image: `image-x-generic-symbolic`
- search: `edit-find-symbolic`
- clear/trash: `user-trash-symbolic`
- private/security: `security-medium-symbolic`
- refresh: `view-refresh-symbolic`
- settings: `preferences-system-symbolic`

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
