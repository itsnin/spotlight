---
name: extension-signal-cleanup
description: Signal connection patterns and cleanup discipline. Covers connectObject/disconnectObject, manual ID tracking, and which pattern to use when.
---

# signal cleanup

## connectObject for long lived objects

for signals on objects that outlive our extension like `global.stage` `global.display` `Shell.AppSystem` use `connectObject` and `disconnectObject`

this is a gnome shell 42+ api that auto disconnects all signals connected with a given owner object

```javascript
// connecting
global.stage.connectObject('notify::key-focus', this._onKeyFocusChanged, this);

// bulk cleanup in destroy or disable
global.stage.disconnectObject(this);
```

all signals connected with `this` as the owner are removed in one call prevents leaks if you forget one manually

## plain connect for short lived widgets

for signals connected to widgets our code creates and destroys plain `connect` is safe

gobject automatically disconnects all signal handlers when the emitting object is finalized

```javascript
// safe because button is destroyed by our code
button.connect('clicked', () => this._onClicked());
```

## manual id tracking for settings and selection objects

some objects like `Gio.Settings` and `Meta.Selection` work correctly with plain `connect` but require manual id tracking for cleanup

```javascript
// connecting store the returned id
this._settingsChangedId = this._settings.connect('changed::key', callback);

// cleanup use the id to disconnect
this._settings.disconnect(this._settingsChangedId);
this._settingsChangedId = 0;
```

## global.stage and global.display special case

`global.stage` and `global.display` exist for the entire shell lifetime

they do not get destroyed when our extension is disabled so signals on them must be explicitly disconnected

use `connectObject` for these it is the safest pattern

## never forget the owner parameter

when using `connectObject` always pass `this` as the final parameter

without it `disconnectObject(this)` will not find and remove the signal

## signal on plain emitters vs gobjects

a signal connected on a plain `Signals.EventEmitter` not a real gobject does not get automatically cleaned up when a parent gobject is destroyed

these need explicit disconnect capture the handler id and disconnect on the parents real destroy signal

## source

extracted from gjs.guide documentation and gnome shell source patterns verified via docs-gnome-extension repo
