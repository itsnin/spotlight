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

## EGO Verified Rules
No `imports.gi` — use ESM `import gi://Name` instead. Console API with appropriate levels like `debug`, `warn` and `error` rather than bare `log`. No `run_dispose` unless absolutely necessary. Optional chaining only for genuinely potentially-null objects, never for guaranteed objects. No `try`/`catch` around standard API calls, only for file I/O, JSON parsing, and genuinely external data. CSS uses only `/* */` block comments, never `//` line comments. No defensive null checks that mask bugs.
