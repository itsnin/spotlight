---
name: Pull Request
about: Submit a change to Spotlight
title: ""
labels: ""
assignees: itsnin
---

## Description

Briefly describe what this PR changes and why.

## Type of change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Code style cleanup (no functional changes)

## Checklist

- [ ] Code follows the project's comment style (lowercase, no punctuation, explain why not what)
- [ ] No `try`/`catch` wrappers around standard API calls
- [ ] No optional chaining (`?.`) or nullish coalescing (`??`) for guaranteed methods
- [ ] `enable()` and `disable()` are adjacent in `extension.js`
- [ ] Every object created in `enable()` is destroyed in `disable()`
- [ ] Every signal connection uses `connectObject()` (except `global.display` and `global.stage` which use plain `connect()`)
- [ ] No objects, signals, or main-loop sources created at module scope
- [ ] Shell files do not import `Gtk`, `Gdk`, or `Adw`
- [ ] Prefs files do not import `St`, `Clutter`, `Meta`, or `Shell`
- [ ] Tested on GNOME Shell 50 under Wayland
- [ ] All JavaScript files parse as ES modules (`gjs -c "Reflect.parse(readFile('extension.js'), { target: 'module' })"`)

## Testing

Describe how you tested the changes. Which GNOME Shell versions did you test on? What scenarios did you verify?

## Related issues

Link any issues this PR addresses (e.g., `Fixes #123`).
