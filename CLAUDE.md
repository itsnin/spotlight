# AI Coding Agent Instructions — Spotlight

This file provides instructions for AI coding assistants working on the Spotlight GNOME Shell extension. Read AGENTS.md for the full technical specification.

## Project Identity

- **Name:** Spotlight — compact keyboard-driven launcher for GNOME Shell
- **UUID:** `spotlight@nin`
- **Supported versions:** GNOME Shell 45, 46, 47, 48, 49, 50
- **Default shortcut:** Ctrl+Space (search), Alt+1 (clipboard), Alt+2 (emoji)
- **License:** GPL-3.0-or-later

## Core Architecture

Spotlight has three independent features, each with its own popup window:

1. **Main search popup** (`spotlightPopup.js`) — permanently steals GNOME Overview's search entry and search controller. Benefits from all GNOME search providers automatically.
2. **Clipboard history** (`services/clipboard/`, `popup/clipboardPopup.js`, `popup/clipboardView.js`) — standalone popup via Alt+1.
3. **Emoji picker** (`services/emoji/`, `popup/emojiPopup.js`, `popup/emojiView.js`) — standalone popup via Alt+2.

## Non-Negotiable Coding Rules

1. **No `imports.gi.*` anywhere** — use ESM imports: `import Gio from 'gi://Gio'`
2. **No `console.log/warn/error`** — use `log()` for shell code
3. **No optional chaining (`?.`) or nullish coalescing (`??`)** for guaranteed methods/objects
4. **No `try/catch` around standard GNOME API calls** — only for genuinely fallible operations (file I/O, JSON parsing)
5. **`enable()` and `disable()` must be adjacent** in `extension.js`
6. **Everything created in `enable()` must be destroyed in `disable()`** — no exceptions
7. **Signals use `connectObject()`** (except `global.display`/`global.stage`)
8. **No module-scope instances, signals, or main-loop sources** — everything must be per-instance
9. **Shell files must NOT import `Gtk`/`Gdk`/`Adw`** — these are prefs-only
10. **Prefs files must NOT import `St`/`Clutter`/`Meta`/`Shell`** — these are shell-only
11. **CSS uses only `/* */` comments** — St does NOT support `//` comments
12. **Comments are lowercase with no punctuation** (unless meaning requires it)

## GNOME Shell Extension Specifics

- **PrefixedSettings** wraps `Gio.Settings` with key prefixes. For APIs that need a REAL `Gio.Settings` GObject (like `Main.wm.addKeybinding()`), call `.getRawSettings()`.
- **Schema:** single merged XML at `schemas/org.gnome.shell.extensions.spotlight.gschema.xml`. Key prefixes: `clipboard-*`, `emoji-*`, plus unprefixed `toggle-shortcut`, `clipboard-shortcut`, `emoji-shortcut`, `theme-preference`.
- **Lifecycle:** `enable()` is called when the extension is enabled. `disable()` is called when disabled or when the shell shuts down. If `enable()` throws, `disable()` is NOT called.
- **Never block the main thread** with synchronous file I/O or D-Bus calls.

## File Structure

```
extension.js              Entry point — enable/disable, shortcut registration
spotlightPopup.js         Main search popup
stylesheet.css            All styling
metadata.json             Extension metadata
popup/
    clipboardPopup.js     Standalone clipboard history popup
    clipboardView.js      Clipboard history list view
    emojiPopup.js         Standalone emoji picker popup
    emojiView.js          Emoji picker grid view
    overviewSearch.js     Steals/returns Overview search widgets
    themeManager.js       Theme detection (dark/light/system)
    popupBackdrop.js      Transparent click-outside detection
    popupPositioner.js    Sizes, centers, shows popups
services/
    prefixedSettings.js   Wraps Gio.Settings with key prefixing
    core/
        keybinding.js     Keybinding manager
        virtualKeyboard.js Virtual input device for paste simulation
    clipboard/            Clipboard history (manager, registry, keyboard, dialogs)
    emoji/                Emoji picker (data, UI components)
prefs.js                  Preferences window entry point
prefs/
    shortcutPage.js       Keyboard shortcut configuration
    appearancePage.js     Visual theme, clipboard/emoji behavior
    aboutPage.js          About section
schemas/                  GSettings schema XML (NOT pre-compiled)
data/
    emojis.json           Bundled emoji data
    emojis.db             SQLite emoji database (upstream)
locale/                   Gettext translation files
```

## Before Committing / Pushing

Always run these verification commands locally:

```bash
# Schema validation
glib-compile-schemas --strict schemas/

# JS syntax check (all files)
for f in $(find . -name "*.js" -not -path "./.git/*" -not -path "./services/emoji/libs/*"); do
    node --check "$f"
done

# Import resolution check
python3 -c "
import re,os
for root,dirs,files in os.walk('.'):
    if '.git' in root: continue
    for fn in files:
        if not fn.endswith('.js'): continue
        fp=os.path.join(root,fn)
        with open(fp,'r',errors='replace') as f: c=f.read()
        for imp in re.findall(r\"from\s+'(\.[^']+)'\",c):
            t=os.path.normpath(os.path.join(os.path.dirname(fp),imp))
            if not os.path.exists(t): print(f'MISSING: {fp}: {imp}')
"

# Anti-pattern checks
grep -rn "imports\.gi\." --include="*.js" . | grep -v '.git'   # Should be 0
grep -rn "console\." --include="*.js" . | grep -v '.git' | grep -v 'services/emoji/libs'  # Should be 0
grep -rn "run_dispose()" --include="*.js" . | grep -v '.git'  # Should be 0
```

## Git Identity

- **User:** amandaharlin
- **Email:** amanda.n.harlin@gmail.com

## When in Doubt

1. Check AGENTS.md for the full technical specification
2. Check existing code patterns in the file you're editing
3. Prefer simplicity over cleverness
4. If you're not confident about something, SAY SO explicitly rather than guessing
