# extension-review-guidelines

## Hard rejections
- Module-scope instances or signals
- Process isolation violations (Gtk in shell, St in prefs)
- Deprecated imports (imports.misc.lang etc)
- Missing cleanup (objects created in enable not destroyed in disable)
- CSS line comments (//)
- GObject constructor with JS-only properties

## Metadata rules
- UUID must be valid email-like format
- Shell version must be valid GNOME versions
- Version name max 16 characters

## Legal
- Code and assets must be compatible with declared license
- No trademark or copyright violations
