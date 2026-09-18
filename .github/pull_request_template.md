## Description
Briefly describe what this PR changes and why.
## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Code style cleanup
## Review Checklist
Reviewer must verify against `.agent/skills/code-review-checklist/SKILL.md`. Minimum requirements:
- [ ] All JS files pass `node --check` syntax validation
- [ ] Schema compiles with `glib-compile-schemas --strict`
- [ ] Comments explain why, use sentence case, and stay concise
- [ ] No block of four or more consecutive comment lines without intervening code
- [ ] No references to other extensions by name anywhere in code or docs
- [ ] `enable()` and `disable()` are adjacent in `extension.js`
- [ ] All objects created in `enable()` are destroyed in `disable()`
- [ ] Shell files do not import `Gtk`/`Gdk`/`Adw`; prefs files do not import `St`/`Clutter`/`Meta`/`Shell`
- [ ] No JS-only properties in GObject constructors
- [ ] Tested on GNOME Shell 45-51 Wayland
- [ ] Tested opening Spotlight inside Overview and App Grid, no black screen when typing
## Testing
How did you test? Which GNOME Shell versions?
