---
name: Bug Report
about: Report a bug in Spotlight for GNOME Shell
title: "[BUG] "
labels: bug
assignees: itsnin
---

## Describe the bug

A clear and concise description of what the bug is.

## To reproduce

Steps to reproduce the behavior:

1. Press `Ctrl+Space` to open Spotlight
2. Type `...`
3. Observe what happens

## Expected behavior

What you expected to happen instead.

## Screenshots

If applicable, add screenshots showing the issue.

## Environment

- **GNOME Shell version:** (e.g., 46, 47, 48, 49, 50)
- **Linux distribution:** (e.g., Fedora 41, Ubuntu 24.04, Arch)
- **Spotlight version:** (check `gnome-extensions info spotlight@nin` or look in preferences)
- **Display server:** Wayland (X11 is not supported)

## Logs

Run the following command and paste any lines containing `spotlight`:

```bash
journalctl -b /usr/bin/gnome-shell | grep spotlight
```

## Additional context

Add any other context about the problem here. If the issue is with a specific app not appearing in search results, mention the app name and what you typed.
