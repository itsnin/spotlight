# Contributing to Spotlight

## Prerequisites

- GNOME Shell 45 or later
- JavaScript and GNOME Shell extension API knowledge
- Wayland session (X11 not supported)

## Getting Started

```bash
git clone https://github.com/itsnin/spotlight.git
cd spotlight
```

Install for testing:
```bash
scripts/build.sh
gnome-extensions enable spotlight@nin
```

Log out and back in on Wayland.

## Project Structure

- `extension.js` — entry point
- `lib/ui/` — UI components
- `lib/core/` — core services
- `prefs/` — preference pages (separate process)
- `schemas/` — GSettings schema
- `stylesheet.css` — styling

## Code Style

Read `AGENTS.md` for full rules. Key points:
- Comments explain why not what
- Lowercase minimal punctuation
- No references to other projects
- No LLM-generated phrasing
- enable and disable adjacent in extension.js
- Process isolation: shell no Gtk/Gdk/Adw, prefs no St/Clutter/Meta/Shell
- connectObject for signals, disconnectObject in destroy
- No module-scope objects or signals

## Testing

```bash
# JS syntax
for f in $(find . -name "*.js" -not -path "./.git/*" -not -path "./skills/*"); do node --check "$f"; done

# Schema
glib-compile-schemas schemas/

# Manual test on GNOME Shell 50 Wayland
```

## Submitting

1. Test locally
2. Run CI checks
3. Open a pull request

## Reporting Bugs

Open an issue on GitHub with:
- GNOME Shell version
- Distribution
- Steps to reproduce
- `journalctl -b /usr/bin/gnome-shell | grep spotlight`
