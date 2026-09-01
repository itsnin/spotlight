---
name: extension-getting-started
description: Basic setup, directory structure, and required files for GNOME Shell extensions targeting 45+. Covers the absolute minimum every extension must have.
---

# getting started

## the two required files

every extension needs exactly two files to be recognized by gnome shell

1. `metadata.json` — extension identity and metadata
2. `extension.js` — the extension entry point exporting an Extension subclass

## directory structure

the extension directory name must match the uuid exactly

```
~/.local/share/gnome-shell/extensions/example@gjs.guide/
    extension.js      # required
    metadata.json     # required
    prefs.js          # optional preferences
    stylesheet.css    # optional styling
    schemas/          # optional gsettings
    locale/           # optional translations
```

## metadata.json minimum

```json
{
    "uuid": "example@gjs.guide",
    "name": "Example Extension",
    "description": "An example extension",
    "shell-version": [ "45" ],
    "url": "https://github.com/example/repo"
}
```

## extension.js minimum

```javascript
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class ExampleExtension extends Extension {
    enable() {
        // create objects connect signals add main loop sources here
    }

    disable() {
        // destroy everything created in enable()
    }
}
```

## uuid format

must be `extension-id@namespace`

- extension-id part: letters numbers period underscore hyphen only
- namespace part: letters numbers period underscore hyphen only
- must not use `gnome.org` as namespace
- common patterns: `name@username.github.io` or `name@username.gmail.com`

## shell-version conventions

- gnome 40+: use just the major version like `"45"` not `"45.0"`
- our project supports: `["45", "46", "47", "48", "49", "50"]`
- must not claim to support future versions not yet released

## constructor vs enable

the constructor is called once when the extension is loaded not when it is enabled

- constructor: only setup translations or static data
- constructor: must not create objects connect signals or modify shell
- enable: where all actual work happens
- enable may be called multiple times over the extension lifetime

## testing

wayland: run nested shell with `dbus-run-session gnome-shell --devkit --wayland`
x11: alt+f2 then `r` to restart shell
logs: `journalctl -f -o cat /usr/bin/gnome-shell`

## source

extracted from gjs.guide getting started documentation verified via docs-gnome-extension repo
