# Contributing to Spotlight

Thank you for your interest in contributing to Spotlight. This document outlines the development workflow, project architecture, code style conventions, and testing procedures expected of all contributions.

## Prerequisites

- GNOME Shell 45 or later (45, 46, 47, 48, 49, and 50 are all supported)
- A text editor with ES module support
- Working knowledge of JavaScript and the GNOME Shell extension API
- A Wayland session for testing (X11 is not supported)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/itsnin/spotlight.git
cd spotlight
```

2. Build and install the extension for testing:

```bash
scripts/build.sh
```

3. Restart GNOME Shell and enable the extension:

```bash
gnome-extensions enable spotlight@nin
```

On Wayland, restarting GNOME Shell requires logging out and logging back in.

## Project Structure

Spotlight permanently takes over GNOME Overview's search infrastructure. On enable, it steals the Overview's search entry and search controller widgets and hides them. When the popup opens, these already-stolen widgets are reparented into the popup. When the popup closes, they are removed from the popup but kept stolen and hidden. They are only returned to the Overview on disable.

The codebase follows a structured layout. `extension.js` and `prefs.js` reside at the repository root where GNOME expects them, while supporting modules are organized into logical subdirectories. UI components live under `lib/ui/`, core services under `lib/core/`, and preference pages under `prefs/`. The preferences files are isolated because they execute in a separate GTK4 process and must not import shell-only libraries (`St`, `Clutter`, `Meta`, `Shell`), just as shell-side files must not import GTK-only libraries (`Gtk`, `Gdk`, `Adw`). Large modules are split into smaller single-responsibility files for maintainability.

### Entry Points

- **`extension.js`** — Main entry point. Constructs the popup widget, permanently steals Overview search, and registers the keybinding manager.
- **`prefs.js`** — Preferences window entry point. Imports the individual preference pages.

### UI Components

All UI components live under `lib/ui/`:

- **`lib/ui/spotlightPopup.js`** — Main popup lifecycle. Steals overview search widgets, manages open/close/destroy.
- **`lib/ui/popupBackdrop.js`** — Transparent full-screen widget in chrome layer. Detects clicks outside popup.
- **`lib/ui/popupPositioner.js`** — Sizes, centers, and shows popup via deferred idle callback.

### Services

- **`lib/core/keybinding.js`** — Keybinding manager using `Meta.Display.grab_accelerator`.

### Preference Pages

Each preference page resides in its own file under `prefs/`, since these run exclusively in the preferences process and must remain isolated from shell-only code:

- **`prefs/shortcutPage.js`** — Keyboard shortcut capture and configuration.
- **`prefs/appearancePage.js`** — Visual theme selection (Default, Dark, Light).
- **`prefs/aboutPage.js`** — About section.

## Search Providers

Spotlight does not implement custom search providers. It reuses GNOME Overview's entire search infrastructure by stealing its widgets. This automatically gives every search provider registered with GNOME Shell:

- Calculator via gnome-calculator search provider
- Applications via Shell.AppSystem
- Files via Tracker
- Settings via gnome-control-center search provider
- System actions via GNOME Shell built-in provider
- Any third-party search providers the user has installed

Search priority and behavior are entirely controlled by GNOME Shell, not by Spotlight.

## Code Style

### Comments

- All comments must be **lowercase** with **no punctuation**, unless a capital letter or punctuation mark is required to preserve meaning. For example, `curl -fsSL` must retain the capital `S` and `L` because they are case-sensitive command-line flags.
- Explain **why**, not **what**. The code itself already describes what it does; comments should illuminate the reasoning behind non-obvious decisions.
- No block-comment boxes, no JSDoc annotations, no `/* */` banners. Use plain `//` comments exclusively.
- No references to other projects or extensions within comments by name.
- No LLM-generated phrasing such as "here we", "let's", "we need to", "note that", "important:", "TODO", or "FIXME".
- For obscure or uncommon code, provide both **what** and **why**. For conventional code, provide only **why**.
- Wherever possible, include verified working links to the official GNOME Shell extension documentation at `https://gjs.guide`.
- Maximum three consecutive comment lines without intervening code. The fourth line must be code, or the structure must be refactored to interleave comments and code. Comments are annotations adjacent to the code they describe, not standalone paragraphs.

### Code Structure

- Split logic into many small files, each bearing a single responsibility.
- Keep the entry point (`extension.js`) as minimal as possible — it should only wire components together.
- Keep `enable()` and `disable()` adjacent to each other in the entry point to facilitate review of cleanup logic.
- One concept per file; one file per concept.
- Prefer pure functions with no side effects in utility modules.
- No TypeScript. This is plain JavaScript with no build step.

### Anti AI-Code Smells

The following patterns are prohibited:

- Wrapping standard API calls in `try`/`catch` blocks. Methods such as `destroy()`, `connect()`, `disconnect()`, `abort()`, and `GLib.Source.remove()` do not throw unhandled exceptions during normal operation.
- Using `try`/`catch` to silence errors that should never occur. Return `null` or handle the error explicitly instead.
- Using optional chaining (`?.`) or nullish coalescing (`??`) for methods or properties that are guaranteed to exist.
- Adding defensive null checks that mask bugs rather than handling them.
- Writing "just in case" code for situations that cannot occur.
- Adding comments that describe what a line does — only describe why.

### Review Discipline

- Before producing final output, read every single line you have written.
- Look for potential issues on every line, not merely the line currently being edited.
- When fixing a bug, verify whether the same bug pattern exists elsewhere in the codebase.
- Do not assume a fix works — validate it against the actual code.

### Process Isolation

GNOME Shell extensions execute across two distinct processes:

- **The shell process** runs `extension.js` and all root-level JavaScript files. It has access to `St`, `Clutter`, `Meta`, `Shell`, `GLib`, `GObject`, `Gio`, and `Main`. It must never import `Gtk`, `Gdk`, or `Adw` — these conflict with Clutter.
- **The preferences process** runs `prefs.js` and `prefs/*.js`. It has access to `Gtk`, `Gdk`, `Adw`, and `Gio`. It must never import `St`, `Clutter`, `Meta`, or `Shell` — these conflict with GTK.

Never import a shell-only library in a preferences file, or vice versa. EGO review will reject any extension that violates process isolation.

### Module-Scope Restrictions

GNOME Shell extensions must not create any objects, connect any signals, add any main-loop sources, or modify the shell during module initialization. This means no `new SomeClass()`, no `something.connect()`, and no `GLib.timeout_add()` at the top level of any JavaScript file.

The only exception is static data structures — arrays, plain objects, `Map`, `Set`, and `RegExp` instances. All dynamically allocated memory must be released in `disable()`.

See https://gjs.guide/extensions/review-guidelines/review-guidelines.html#only-use-initialization-for-static-resources

### Signal Management

All signal connections on GObjects use `connectObject()` and `disconnectObject()` — the convenience API introduced in GNOME Shell 42 that auto-disconnects every signal registered with a given owner object. In `disable()` or `destroy()`, call `disconnectObject(this)` to release every signal connected with `this` as the owner.

See https://gjs.guide/extensions/upgrading/gnome-shell-42.html

### Object Lifecycle

Every object created in `enable()` must be destroyed in `disable()`. Every widget added to the chrome layer must be removed. Every main-loop source must be removed. Every signal must be disconnected.

The popup widget overrides `destroy()` to call `close()` first — which removes the backdrop and idle sources — then removes itself from the chrome layer and chains up to the parent destroy. Stolen Overview search widgets are returned to the Overview in `returnOverviewSearch()` called from `disable()`.

## Adding a New UI Component

1. Create a new file under `lib/ui/`, for example `lib/ui/myWidget.js`.
2. Export a function that constructs and returns the widget.
3. Import it in `spotlightPopup.js` where needed.
4. Use `connectObject()` for all signal connections.
5. Ensure the widget is destroyed when the popup is destroyed.

## Testing

### Static Analysis

Run the EGO-style static analyzer to verify module-scope compliance, absence of deprecated imports, process isolation, and metadata well-formedness:

```bash
gjs -c "Reflect.parse(readFile('extension.js'), { target: 'module' })"
```

### Schema Validation

Compile the GSettings schema to confirm the XML is valid:

```bash
glib-compile-schemas schemas/
```

### Syntax Verification

Every JavaScript file must parse as an ES module. A syntax error in any file will cause GNOME Shell to fail loading the extension silently.

### Manual Testing

Test on GNOME Shell 50 under Wayland first, then validate on at least one older supported version. The extension must behave identically across all supported versions.

## Submitting Changes

1. Implement your changes following the code style above.
2. Test locally on GNOME Shell 50.
3. Run static analysis and resolve any reported issues.
4. Run a GJS parse check and resolve any syntax errors.
5. Open a pull request with a clear description of what changed and why.

## Reporting Bugs

Open an issue on GitHub with the following information:

- GNOME Shell version
- Linux distribution
- Steps to reproduce
- Expected behavior versus actual behavior
- Relevant logs from `journalctl -b /usr/bin/gnome-shell | grep spotlight`
