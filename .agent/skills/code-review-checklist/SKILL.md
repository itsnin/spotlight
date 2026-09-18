# Code Review Checklist
Every JavaScript change must pass this review.
## Critical Correctness
- [ ] **Lifecycle symmetry** — every object created in `enable()` is destroyed in `disable()`. Every signal connected is disconnected. Every widget added to chrome is removed.
- [ ] **No GObject constructor JS-only properties** — `_foo` assigned inside `new St.Widget({...})` is forbidden. Assign as `item._foo = value` after construction.
- [ ] **No `try/catch` around standard API calls** — only for file I/O, JSON parsing, and genuinely external data.
- [ ] **Optional chaining only for genuinely potentially-null objects** — never for guaranteed methods or properties.
- [ ] **No module-scope instances, signals, or main-loop sources** — only static data structures at file scope.
## Process Isolation
- [ ] **Shell files do not import `Gtk`, `Gdk`, or `Adw`**
- [ ] **Prefs files do not import `St`, `Clutter`, `Meta`, or `Shell`**
- [ ] **No deprecated `imports.misc.` imports** — use ESM `gi://` and `resource://` imports only
## Signal Management
- [ ] **`connectObject` for per-open signals** that get cleaned together on close
- [ ] **Plain `connect` with explicit IDs** only for signals that must persist across open/close cycles
- [ ] **Never mix lifetimes on the same `(GObject, owner)` pair** — `disconnectObject(owner)` wipes ALL handlers for that owner
## Style and Maintainability
- [ ] **`enable()` and `disable()` are adjacent** in `extension.js`
- [ ] **Comments are sentence case** with proper nouns capitalized, light punctuation, lazy senior engineer style
- [ ] **Comments explain why**, not what the code already shows
- [ ] **No block of four or more consecutive comment lines** without intervening code
- [ ] **No LLM phrases** like "here we," "let's," "note that"
- [ ] **No references to other extensions by name** anywhere in code or docs
- [ ] **CSS uses only `/* */` block comments**, never `//` line comments
- [ ] **`-st-icon-style: requested`** on icon actors so symbolic icons render correctly
## Testing
- [ ] **All JS files parse as ES modules** — `node --check` passes
- [ ] **Schema compiles** with `glib-compile-schemas --strict`
- [ ] **Tested on GNOME Shell 50 Wayland** (or the version targeted by the change)
- [ ] **Tested opening Spotlight inside Overview and App Grid** — no black screen when typing
- [ ] **Enable → Disable → Enable cycle** works without restarting the shell
