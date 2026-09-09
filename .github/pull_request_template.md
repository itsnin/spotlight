## Description

Briefly describe what this PR changes and why.

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Code style cleanup

## Checklist

- [ ] Comments are natural, human style : capitals where they make sense, light punctuation
- [ ] No `try`/`catch` around standard API calls
- [ ] No `?.` or `??` for guaranteed methods
- [ ] `enable()` and `disable()` are adjacent
- [ ] All objects created in `enable()` are destroyed in `disable()`
- [ ] Signals use `connectObject()` (except `global.display`/`global.stage`)
- [ ] No module-scope instances, signals, or main-loop sources
- [ ] Shell files don't import `Gtk`/`Gdk`/`Adw`
- [ ] Prefs files don't import `St`/`Clutter`/`Meta`/`Shell`
- [ ] No JS-only properties (like `_entry`, `_data`) in GObject constructors : assign with `item._prop = value` after construction
- [ ] Tested on GNOME Shell 45-51 Wayland
- [ ] Tested opening Spotlight inside Overview and App Grid, no black screen when typing
- [ ] All JS files parse as ES modules

## Testing

How did you test? Which GNOME Shell versions?
