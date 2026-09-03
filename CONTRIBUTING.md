# Contributing to Spotlight

## Prerequisites

- GNOME Shell 45 or later
- Working knowledge of JavaScript and the GNOME Shell extension API
- A Wayland session for testing (X11 is not supported)

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

Log out and back in on Wayland before enabling.

## Project Structure

- `extension.js` — entry point
- `lib/ui/` — UI components
- `lib/core/` — core services
- `prefs/` — preference pages (separate process)
- `schemas/` — GSettings schema
- `stylesheet.css` — styling

## Code Style

Read `AGENTS.md` for the full rules. Key points:

- Comments explain why, not what
- Natural, human style — capitals where they make sense, light punctuation
- No references to other projects
- No AI-generated phrasing
- `enable()` and `disable()` are adjacent in `extension.js`
- Process isolation: shell no Gtk/Gdk/Adw, prefs no St/Clutter/Meta/Shell
- `connectObject` for signals, `disconnectObject` in `destroy()`
- No module-scope objects or signals

## Testing

```bash
# JS syntax
for f in $(find . -name "*.js" -not -path "./.git/*" -not -path "./skills/*"); do node --check "$f"; done

# Schema
glib-compile-schemas schemas/
```

Test manually on GNOME Shell 50 Wayland.

## Submitting

1. Test locally
2. Run CI checks
3. Open a pull request

## Reporting Bugs

Open an issue on GitHub with:
- GNOME Shell version
- Linux distribution
- Steps to reproduce
- `journalctl -b /usr/bin/gnome-shell | grep spotlight`
