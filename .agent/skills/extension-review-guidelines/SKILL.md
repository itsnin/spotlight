# extension-review-guidelines

## Hard Rejections
- Module-scope instances or signals
- Process isolation violations (Gtk in shell, St in prefs)
- Deprecated imports (`imports.misc.lang` etc.)
- Missing cleanup (objects created in `enable()` not destroyed in `disable()`)
- CSS line comments (`//`)
- GObject constructor with JS-only properties

## Metadata Rules
- UUID must be valid email-like format
- Shell version must be valid GNOME versions
- Version name max 16 characters

## Legal
- Code and assets must be compatible with the declared license
- No trademark or copyright violations

## In Spotlight

Before submitting to EGO, verify: no `Gtk`/`Gdk`/`Adw` imports in shell process files, no `St`/`Clutter`/`Meta`/`Shell` imports in prefs files, no module-scope instances or signals, all objects created in `enable()` are destroyed in `disable()`, `try`/`catch` only wraps file I/O or JSON parsing, optional chaining only for genuinely nullable objects, comments explain reasons not facts, maximum two consecutive comment lines without code. The CI workflow validates most of these automatically.
