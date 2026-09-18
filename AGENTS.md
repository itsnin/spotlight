# Agents Guide for Spotlight

This is the entrypoint for agents working on Spotlight. Read it before touching code, then read the relevant skill files under `.agent/skills/`. The implementation and skills are the source of truth for details; this file keeps only the project contract, behavior rules, and routing.

## Behavioral Guidelines

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Reproduce it, then make the fix, then verify it stays fixed"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

## Project Contract

Spotlight is a compact launcher for GNOME Shell. Press a shortcut, a translucent glass popup appears positioned 25 percent from the top of the monitor, type something and results show up in real time. It permanently steals the Overview search widgets — the Overview itself stays functional, only its search UI gets replaced.

Supported versions: GNOME Shell 45 through 51. Wayland only.

Version format: `YYYY.PATCH` where patch resets to `01` each calendar year. Examples: `2026.01`, `2026.99`, `2026.100`, then `2027.01`.

The durable architecture, popup behavior, overview search stealing, and animation approach live in the relevant skills listed below.

## Skill Routing

Read these first for every non-trivial change:

- [`extension-best-practices`](.agent/skills/extension-best-practices/SKILL.md) for popup positioning, animations, keybinding, multi-monitor behavior, and core design decisions.
- [`guidance-maintenance`](.agent/skills/guidance-maintenance/SKILL.md) for what belongs in agent guidance and what must stay out of it.
- [`verification-discipline`](.agent/skills/verification-discipline/SKILL.md) for evidence, scope, testing, and reporting claims.
- [`writing-tone`](.agent/skills/writing-tone/SKILL.md) for how to write docs, comments, commit messages, and explanations.
- [`code-review-checklist`](.agent/skills/code-review-checklist/SKILL.md) for the mandatory review criteria.

Then read the focused skill for the code being changed:

- Extension structure and entry points: [`extension-getting-started`](.agent/skills/extension-getting-started/SKILL.md)
- ESM imports: [`extension-esm-imports`](.agent/skills/extension-esm-imports/SKILL.md)
- Enable/disable lifecycle: [`extension-lifecycle`](.agent/skills/extension-lifecycle/SKILL.md)
- Signal cleanup: [`extension-signal-cleanup`](.agent/skills/extension-signal-cleanup/SKILL.md)
- GSettings: [`extension-gsettings`](.agent/skills/extension-gsettings/SKILL.md)
- Preferences: [`extension-prefs`](.agent/skills/extension-prefs/SKILL.md)
- Styling and CSS: [`extension-styling`](.agent/skills/extension-styling/SKILL.md)
- Debugging: [`extension-debugging`](.agent/skills/extension-debugging/SKILL.md)
- EGO review: [`extension-review-guidelines`](.agent/skills/extension-review-guidelines/SKILL.md)
- Metadata: [`extension-metadata`](.agent/skills/extension-metadata/SKILL.md)
- General guidelines: [`extension-guideline`](.agent/skills/extension-guideline/SKILL.md)
- Writing standards: [`extension-writing-standards`](.agent/skills/extension-writing-standards/SKILL.md)
- Overview search stealing: [`extension-overview-search-stealing`](.agent/skills/extension-overview-search-stealing/SKILL.md)
- Popup close defense: [`extension-popup-close-defense`](.agent/skills/extension-popup-close-defense/SKILL.md)
- Defensive programming: [`defensive-programming`](.agent/skills/defensive-programming/SKILL.md)
- Security anti-patterns: [`security-anti-patterns`](.agent/skills/security-anti-patterns/SKILL.md)
- Testing and linting: [`testing-and-linting`](.agent/skills/testing-and-linting/SKILL.md)

The `.agent/skills/` directory is the source of truth for the available skills.

## Working Rules

- Keep the entry point as wiring; component logic belongs in its module under `lib/`.
- Keep process isolation strict: shell process never imports `Gtk`, `Gdk`, or `Adw`. Prefs process never imports `St`, `Clutter`, `Meta`, or `Shell`.
- Keep `enable()` and `disable()` adjacent in `extension.js`.
- Every object created in `enable()` is destroyed in `disable()`. Every signal connected is disconnected. Every widget added to chrome is removed.
- Explain why in comments, not what the code already says. Avoid LLM-smell wording and unrelated cleanup.
- Inspect all callers and search for the same bug pattern elsewhere before fixing a bug.
- Read every changed line before reporting completion.
- Update guidance only when a durable contract or working standard changes. Do not add inventories, version snapshots, provider URLs, one-off fixes, or history.
- Do not modify README content beyond the smallest requested user-facing detail.
- Never name other extensions anywhere in the repo. Describe generically if a comparison is genuinely needed.

## Minimum Verification

Run `node --check` on every modified JavaScript file and `glib-compile-schemas --strict` when the schema changes. Use the smallest focused test that proves the requested behavior. Run broader checks when the change affects popup behavior, overview integration, or shared infrastructure. Report missing tools or unrun tests plainly.
