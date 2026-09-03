# Agents Guide for Spotlight

Read this file before touching code. It covers architecture, design decisions, code style, and EGO review constraints.

## Supplementary Skills

The `skills/` directory contains focused, single-topic skill files extracted from official gjs.guide documentation. These are reference material. This file remains the single source of truth for project-specific rules.

Available skills:
- extension-getting-started
- extension-esm-imports
- extension-lifecycle
- extension-signal-cleanup
- extension-gsettings
- extension-prefs
- extension-styling
- extension-debugging
- extension-review-guidelines
- extension-best-practices
- extension-metadata
- extension-guideline

## What This Extension Is

Spotlight is a compact launcher for GNOME Shell. Press a shortcut, a centered translucent glass popup appears, type, and results show up in real time. It permanently steals the Overview search widgets. The Overview itself stays functional; only its search UI is replaced.

## Supported Versions

GNOME Shell 45, 46, 47, 48, 49, 50, listed in metadata.json under `shell-version`. Minimum is 45 because GNOME Shell 45 switched to ES modules.

Wayland only. X11 is not supported. GNOME Shell 50 removed X11 entirely.

## Architecture

One popup permanently steals the Overview search entry and controller. Widgets are stolen once in `enable()`, returned once in `disable()`. Open and close only reparent widgets between our content box and a hidden state. They never return to the Overview while the extension is enabled.

File layout:
- `extension.js`: entry point
- `lib/ui/`: user interface components
- `lib/core/`: core infrastructure
- `prefs.js`: preferences entry point
- `prefs/`: preference pages
- `schemas/`: GSettings schema
- `scripts/`: installer
- `stylesheet.css`: styling

## Process Isolation

Shell process runs `extension.js` and `lib/` files. It must not import Gtk, Gdk, or Adw.
Prefs process runs `prefs.js` and `prefs/` files. It must not import St, Clutter, Meta, or Shell.
EGO review rejects violations.

## Signal Management

Use `connectObject` with `this` as owner. `disconnectObject(this)` in `destroy()` or `disable()` cleans all handlers at once.
Use plain `connect` with explicit ID tracking only for signals that must persist across open/close cycles.

## Popup Positioning

Positioned once at open based on empty-state height. Grows downward from a fixed anchor. Never reposition on size changes, it causes visible drift.

## Click-Outside Detection

Transparent full-screen St widget in the chrome layer, behind the popup. Backdrop covers the target monitor and listens for `button-release-event`. The popup sits above the backdrop in the stacking order, so clicks on the popup work normally.

## Popup Close Mechanisms

Popup closes on toggle shortcut, Escape, or click outside, plus a comprehensive activation-close defense:
1. `button-press-event` on search results, catches mouse clicks on any result
2. Enter or Space key capture when focus is on result buttons (not the entry)
3. `global.display` `notify::focus-window`, tracks external app focus at window manager level

## Object Lifecycle

Every object created in `enable()` is destroyed in `disable()`. Every widget added to chrome is removed. Every main loop source is removed. Every signal is disconnected. If you add something, add cleanup. EGO review rejects leaks.

## Module-Scope Restrictions

No objects, no signals, no main loop sources at the top level of any JS file. Only static data structures, arrays, objects, Maps, Sets, RegExps, are allowed.

## Code Style

Comments explain why, not what. Write like a lazy senior engineer: natural, not forced grammar. Use capitals where they make sense, proper nouns, acronyms, start of sentences. Light punctuation. Periods at the end of complete thoughts. No banners, no JSDoc, no references to other projects. No LLM phrases like "here we," "let's," "note that," "important," "TODO," "FIXME." Maximum three consecutive comment lines without intervening code.

`enable()` and `disable()` are adjacent in `extension.js`. Split logic into small files, each with a single responsibility. No TypeScript. Plain JavaScript, no build step.

## EGO Verified Rules

- No `imports.gi.*`: use ESM `import 'gi://Name'`
- Console API with appropriate levels: `debug`, `warn`, `error`. Not bare `log`.
- No `run_dispose()` unless absolutely necessary
- Optional chaining only for genuinely potentially-null objects. Never for guaranteed objects.
- No try/catch around standard API calls. Only for file I/O, JSON parsing, external data.
- CSS only uses block comments. Never line comments.
- No defensive null checks that mask bugs.

## Keybinding

Default shortcut: Ctrl+Space, stored as `['<Control>space']`. Super+Space is grabbed by GNOME Shell for input source switching on some setups.
Uses `global.display.grab_accelerator()`, not `Main.wm.addKeybinding()`, because `addKeybinding` can fail if the schema isn't ready at enable time.

## GSettings Schema

Schema ID: `org.gnome.shell.extensions.spotlight`. Path: `/org/gnome/shell/extensions/spotlight/`.
`gschemas.compiled` is not shipped. GNOME Shell 44+ compiles automatically on install.

Keys:
- `toggle-shortcut`: type `as`, default `['<Control>space']`
- `theme-preference`: type `s`, default `'default'`. Values: `'default'`, `'dark'`, `'light'`

## Appearance Theme

Three modes, controlled by the `theme-preference` GSettings key:
- Dark (default): background `rgba(28, 28, 30, 0.85)`, text `#f5f5f7`
- Light: background `rgba(255, 255, 255, 0.88)`, text `#1d1d1f`

The `theme-light` class is added to the content container for light mode. Applied in `_applyTheme()`, called from `_doOpen()` before showing.
When preference is `'default'`, listens to `org.gnome.desktop.interface` `changed::color-scheme` and updates live while open.

## Multi-Monitor

Popup opens on the monitor where the cursor currently sits. `getTargetMonitor()` calls `global.get_pointer()` and checks which monitor rectangle contains the cursor coordinates. Falls back to the primary monitor. Backdrop covers only the target monitor. Users on other monitors can interact normally.

## Testing

Every JS file must parse as an ES module.
Schema must compile with `glib-compile-schemas`.
Test on GNOME Shell 50 Wayland first.
