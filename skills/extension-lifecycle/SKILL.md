---
name: extension-lifecycle
description: Extension lifecycle discipline: enable/disable symmetry, constructor rules, object destruction, and cleanup order. The single most common reason for EGO rejection.
---

# lifecycle discipline

## the three fundamental rules

1. never create or modify anything before `enable()` is called
2. use `enable()` to create objects connect signals and add main loop sources
3. use `disable()` to cleanup everything done in `enable()`

these are not suggestions they are ego review requirements

## constructor rules

the constructor is called once when the extension is loaded not when enabled

allowed in constructor:
- call `super(metadata)`
- setup translations via `initTranslations()`
- create static data structures only plain js objects arrays maps regexps

forbidden in constructor:
- creating any gobject instances `new St.Widget()` `new Gio.Settings()` etc
- connecting any signals
- adding any main loop sources
- modifying gnome shell in any way

## enable and disable must be adjacent

keep `enable()` and `disable()` methods next to each other in the class definition

this allows reviewers to easily verify the cleanup symmetry at a glance

## everything created in enable must be destroyed in disable

every object every signal every source must have a matching cleanup

```javascript
enable() {
    this._widget = new St.Widget();
    this._handlerId = global.settings.connect('changed::key', () => {});
    this._sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {});
}

disable() {
    if (this._sourceId) {
        GLib.Source.remove(this._sourceId);
        this._sourceId = null;
    }
    if (this._handlerId) {
        global.settings.disconnect(this._handlerId);
        this._handlerId = null;
    }
    this._widget?.destroy();
    this._widget = null;
}
```

## destroy order in custom destroy() methods

follow this exact order:

1. remove active timeouts and glib sources
2. disconnect all signal handlers
3. release child references and resources
4. call `super.destroy()` as the final step

```javascript
destroy() {
    if (this._sourceId) {
        GLib.Source.remove(this._sourceId);
        this._sourceId = null;
    }
    // disconnect signals here
    // release child resources here
    super.destroy();
}
```

## override destroy() directly not connect to destroy signal

correct: override the `destroy()` method on your subclass

wrong: connect a listener to the `destroy` signal and clean up there

## after destroy null out the reference

after calling `destroy()` on an object set the reference to `null`

this prevents accidental use after free and helps garbage collection

## no _destroyed or _enabled flags

do not use boolean flags like `this._destroyed` to guard against race conditions

after calling `destroy()` the instance should be nulled out and never used again

## module scope restrictions

never create gobject instances at module scope never connect signals at module scope never add main loop sources at module scope

only static data structures are allowed at module scope

## source

extracted from gjs.guide review guidelines and best practices verified via docs-gnome-extension repo
