---
name: extension-injection
description: InjectionManager for patching GNOME Shell class methods. When to use it, arrow vs function expression, and proper cleanup.
---

# injection manager

## purpose

gnome shell extensions often need to modify default shell behavior

`InjectionManager` is a convenience class for patching class methods

methods are overridden in `enable()` and restored in `disable()`

## basic usage

```javascript
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Panel} from 'resource:///org/gnome/shell/ui/panel.js';

export default class ExampleExtension extends Extension {
    enable() {
        this._injectionManager = new InjectionManager();

        this._injectionManager.overrideMethod(Panel.prototype, 'toggleCalendar',
            originalMethod => {
                return (...args) => {
                    console.debug('toggling calendar');
                    originalMethod.call(Main.panel, ...args);
                };
            });
    }

    disable() {
        this._injectionManager.clear();
        this._injectionManager = null;
    }
}
```

## arrow function vs function expression

whether you use an arrow function or a function expression changes what `this` refers to

### arrow function preserves outer this

```javascript
originalMethod => {
    return (...args) => {
        // this refers to the extension instance
        console.debug(this.metadata.name);
        originalMethod.call(Main.panel, ...args);
    };
}
```

### function expression gets dynamic this

```javascript
originalMethod => {
    return function (...args) {
        // this refers to the object the method was called on
        console.debug(this);
        originalMethod.call(this, ...args);
    };
}
```

choose based on whether you need access to the extension instance or the target object

## api

### overrideMethod(prototype, methodName, createOverrideFunc)

modify replace or inject a method

- `prototype` the object or prototype being modified
- `methodName` the name of the method as a string
- `createOverrideFunc` receives the original method and returns the new method

### restoreMethod(prototype, methodName)

restore a single specific method to its original

### clear()

restore all original methods and clear all overrides

call this in `disable()`

## cleanup discipline

always call `clear()` in `disable()` and null out the injection manager reference

## when to use injection

use injection when you genuinely need to change existing shell behavior

prefer cleaner approaches when possible adding ui elements listening to signals etc

## source

extracted from gjs.guide extension api reference verified via docs-gnome-extension repo
