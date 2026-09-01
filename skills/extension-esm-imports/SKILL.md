---
name: extension-esm-imports
description: ES module import rules, import path conventions, and process isolation requirements for GNOME Shell 45+ extensions.
---

# esm imports

gnome shell 45 switched to es modules the legacy `imports.*` system is gone

## correct import syntax

always use es module import statements never `imports.gi.*` or `imports.misc.*`

```javascript
// gi libraries
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

// gnome shell modules
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

// prefs only libraries
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
```

## process isolation is absolute

two completely separate processes with conflicting libraries

### shell process (extension.js and all files it imports)

allowed libraries:
- `gi://Gio`, `gi://GLib`, `gi://GObject`
- `gi://St`, `gi://Clutter`, `gi://Meta`, `gi://Shell`
- `resource:///org/gnome/shell/*`

forbidden libraries:
- `gi://Gtk` forbidden
- `gi://Gdk` forbidden
- `gi://Adw` forbidden

importing these in the shell process will crash it not just warn

### preferences process (prefs.js and files in prefs/)

allowed libraries:
- `gi://Gio`, `gi://GLib`, `gi://GObject`
- `gi://Adw`, `gi://Gtk`, `gi://Gdk`

forbidden libraries:
- `gi://St` forbidden
- `gi://Clutter` forbidden
- `gi://Meta` forbidden
- `gi://Shell` forbidden

## shared modules

code shared between shell and prefs must never import from either forbidden list

if a shared module needs even one shell-only or prefs-only library it belongs in one process not shared

## deprecated modules never use

| deprecated | replacement |
|---|---|
| `ByteArray` | `TextDecoder` / `TextEncoder` |
| `Lang` | es6 classes and `Function.prototype.bind()` |
| `Mainloop` | `GLib.timeout_add()` `setTimeout()` etc |

## relative imports

use relative paths for importing project modules

```javascript
import { PrefixedSettings } from '../prefixedSettings.js';
import { Keyboard } from './keyboard.js';
```

## source

extracted from gjs.guide documentation verified via docs-gnome-extension repo
