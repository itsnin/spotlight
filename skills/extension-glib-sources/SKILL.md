---
name: extension-glib-sources
description: GLib main loop sources: timeout_add, idle_add, source removal patterns, and cleanup discipline.
---

# glib sources

## all sources must be removed in disable

every main loop source created must be removed in `disable()` or the relevant `destroy()` method

this applies even if the callback will eventually return `false` or `GLib.SOURCE_REMOVE`

## timeout_add

```javascript
import GLib from 'gi://GLib';

// creating store the id
this._sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
    // do something
    return GLib.SOURCE_CONTINUE; // or SOURCE_REMOVE for one shot
});

// cleanup
if (this._sourceId) {
    GLib.Source.remove(this._sourceId);
    this._sourceId = null;
}
```

## idle_add

```javascript
this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
    // do something once when idle
    return GLib.SOURCE_REMOVE;
});

// cleanup
if (this._idleId) {
    GLib.Source.remove(this._idleId);
    this._idleId = null;
}
```

## one shot sources still need tracking

even sources that return `GLib.SOURCE_REMOVE` must have their ids tracked

if disable is called before the source fires the source must be explicitly removed

## keep removal next to creation

if a function can be called multiple times and creates a timer remove any existing source before creating a new one

place the removal check directly next to the creation line

```javascript
// correct removal adjacent to creation
if (this._sourceId) {
    GLib.Source.remove(this._sourceId);
    this._sourceId = null;
}
this._sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5, () => {
    // ...
});
```

separating removal from creation by many lines makes review difficult

## source return values

- `GLib.SOURCE_CONTINUE` true — keep the source alive
- `GLib.SOURCE_REMOVE` false — remove the source after this callback

## never block the main thread

never use synchronous file i/o or synchronous d-bus calls in glib source callbacks

they block the entire compositor thread

## source

extracted from gjs.guide review guidelines and best practices verified via docs-gnome-extension repo
