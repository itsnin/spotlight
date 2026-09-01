# Contributing to Spotlight

## Coding Standards

This project follows strict GNOME Shell extension coding standards. Before submitting code, please read:

- **AGENTS.md** in the project root — the master AI coding rules and architectural decisions
- **skills/extension-best-practices/SKILL.md** — common pitfalls and what to avoid
- **skills/extension-lifecycle/SKILL.md** — enable/disable symmetry and cleanup discipline
- **skills/extension-signal-cleanup/SKILL.md** — signal connection patterns
- **skills/extension-glib-sources/SKILL.md** — timeout_add, idle_add, and source removal
- **skills/extension-gsettings/SKILL.md** — GSettings schema conventions and PrefixedSettings pattern
- **skills/extension-prefs/SKILL.md** — preferences window and process isolation rules
- **skills/extension-esm-imports/SKILL.md** — ESM import rules and process isolation
- **skills/extension-review-guidelines/SKILL.md** — official EGO review guidelines

## Before Submitting

1. Run the CI checks locally:
   ```bash
   # Check JS syntax
   for f in $(find . -name "*.js" -not -path "./.git/*" -not -path "./services/emoji/libs/*"); do node --check "$f"; done
   
   # Check schema compiles
   glib-compile-schemas --strict schemas/
   ```

2. Verify the checklist in the pull request template

3. Test on GNOME Shell 45-50

## Crash Reports

When reporting a crash, always include:
```bash
journalctl -b /usr/bin/gnome-shell | grep spotlight
```

## Commit Messages

Use the imperative mood. Reference the component being changed. Examples:
- `Fix: GObject constructor crash in clipboardView`
- `Add: centerOnPrimary method to PopupPositioner`
- `Cleanup: remove dead emojiCategory.js`
- `Docs: update skills with undefined method lesson`
