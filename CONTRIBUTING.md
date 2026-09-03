# Contributing to Spotlight

## Prerequisites

GNOME Shell 45 or later, working knowledge of JavaScript and the GNOME Shell extension API, and a Wayland session for testing since X11 is not supported.

## Getting Started

Clone the repository and step into it. Then run the build script to install for testing, enable the extension and log out and back in on Wayland before using it.

## Project Structure

extension.js serves as the entry point. UI components live under lib/ui, core services under lib/core and preference pages under prefs in a separate process. The schemas directory holds the GSettings schema and stylesheet.css contains the styling.

## Code Style

Read AGENTS.md for the full rules. Comments explain the reasons rather than just stating facts, written in a natural style with capitals where they make sense and light punctuation. No references to other projects, no AI-generated phrasing. Enable and disable sit adjacent in extension.js. Process isolation means shell code gets no Gtk, Gdk or Adw while prefs code gets no St, Clutter, Meta or Shell. Signals use connectObject with disconnectObject in destroy. No module-scope objects or signals.

## Testing

Check that every JS file parses correctly and that the schema compiles. Test manually on GNOME Shell 50 Wayland.

## Submitting

Test locally, run the CI checks and open a pull request.

## Reporting Bugs

Open an issue on GitHub with the GNOME Shell version, the Linux distribution, steps to reproduce and the output of journalctl filtered for gnome-shell and spotlight.
