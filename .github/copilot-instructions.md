# GitHub Copilot Instructions — Spotlight GNOME Shell Extension

## Project Overview

Spotlight is a compact keyboard-driven launcher for GNOME Shell. It permanently takes over the GNOME Overview's search infrastructure and provides dedicated popups for clipboard history and emoji picking.

## Key Rules

- **ESM imports only:** `import Gio from 'gi://Gio'`, never `imports.gi.Gio`
- **No `console.*`:** Use `log()` for shell code
- **No optional chaining (`?.`) or nullish coalescing (`??`)** for guaranteed objects
- **No `try/catch` around standard GNOME API calls**
- **`enable()` and `disable()` adjacent** in extension.js
- **Everything created in `enable()` destroyed in `disable()`**
- **Signals use `connectObject()`** (except `global.display`/`global.stage`)
- **No module-scope state** — everything per-instance
- **Process isolation:** Shell code never imports `Gtk`/`Gdk`/`Adw`; prefs code never imports `St`/`Clutter`/`Meta`/`Shell`
- **CSS uses only `/* */` comments**
- **Comments lowercase, no punctuation** (unless meaning requires it)

## Architecture

- `extension.js` — entry point, shortcut registration
- `spotlightPopup.js` — main search popup (steals GNOME Overview search)
- `services/clipboard/` — clipboard history feature
- `services/emoji/` — emoji picker feature
- `services/core/` — keybinding manager, virtual keyboard
- `services/prefixedSettings.js` — `Gio.Settings` wrapper with key prefixing; use `.getRawSettings()` for APIs needing real GObject
- `popup/` — popup UI components
- `prefs/` — preference pages
- `schemas/` — single merged GSettings schema XML

## Schema Key Prefixes

- `clipboard-*` — clipboard history settings
- `emoji-*` — emoji picker settings
- Unprefixed: `toggle-shortcut`, `clipboard-shortcut`, `emoji-shortcut`, `theme-preference`

## Verification Before Committing

```bash
glib-compile-schemas --strict schemas/
for f in $(find . -name "*.js" -not -path "./.git/*" -not -path "./services/emoji/libs/*"); do node --check "$f"; done
```

See AGENTS.md for full technical specification.
