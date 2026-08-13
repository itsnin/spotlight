---
name: gnome-extension-45-50
description: Platform rules, hard constraints, and common failure modes for building a GNOME Shell extension targeting shell-version 45 through 50. Covers ES modules, process isolation, cleanup discipline, deprecated APIs, X11/Wayland status, EGO review guidelines, and how to read shexli/static-analyzer findings correctly. Use this for any GNOME Shell extension project in this version range, regardless of what the extension does.
---

# gnome extension 45-50

this covers the platform itself - the rules that apply to any GNOME Shell extension
targeting shell-version 45 through 50, independent of what the extension does or how its
own codebase is organized. project-specific architecture (file layout, naming
conventions, which private-field syntax to use) belongs in that project's own AGENTS.md,
not here - this skill is the part that doesn't change between projects.

## the 45+ baseline

45 is the version GNOME Shell moved to ES modules. `imports.*`, `Lang.Class`, and the old
`init()` pattern are gone for good in 45+. don't write dual-format code to support
pre-45 - that's a real, deliberate scope decision a project should make explicitly if it
ever wants it, not a default. 50 is current as of this skill's writing; treat the
shell-version array in `metadata.json` as `["45", "46", "47", "48", "49", "50"]` unless a
project has a specific reason to narrow it, and if it does narrow it, that's a real
product decision worth writing down, not something to change quietly to dodge a lint
finding.

no deprecated modules, ever: no `ByteArray`, no `Lang`, no `Mainloop`, no `imports.*`. use
`console.*` instead of the old `log()` function - this is an actual documented port-guide
requirement, not a style preference.

## wayland and X11

GNOME Shell 50 has no X11 support left to fall back to - real APIs that depended on it
have been removed outright, not just deprecated. X11 as a display server is on a
published deprecation trajectory across the ecosystem, not a GNOME-only choice. if an API
only works under X11 (X11 window properties, XWayland-dependent input grabs, anything
requiring a display server assumption), it doesn't belong in new code for this version
range - not behind a fallback path, not behind a feature-detected branch. if a project
needs to support genuinely old GNOME versions where X11 was still the norm, that's a
separate, explicit scope decision, not something to smuggle in as a "just in case" path
in a 45-50 codebase.

## process isolation is absolute

`extension.js` runs inside the GNOME Shell process. `prefs.js` runs in a completely
separate GTK process. this isn't a convention, it's an actual hard boundary: mixing the
two crashes the respective process, not just throws a warning.

`extension.js` never imports `Gtk`, `Gdk`, or `Adw`. `prefs.js` never imports `Clutter`,
`Meta`, `St`, or `Shell`. any code genuinely shared between both files (a data
transformation, a pure function with no side effects) must avoid every import from both
lists - if it needs even one of them, it belongs in one file or the other, not in a
shared module.

## cleanup is the single most common rejection reason

this is worth treating as the top priority in any review pass, because it's the most
common real reason extensions get rejected: every signal connected in `enable()` gets
disconnected in `disable()`. every `GLib` timeout or idle source created gets removed.
every object created gets destroyed or nulled. `enable()` and `disable()` should be
strict mirrors of each other - everything created in one is undone in the other, in
reverse order.

a genuinely subtle failure mode worth knowing about specifically: a signal connected on
an object that is itself a plain `Signals.EventEmitter` (not a real GObject) does not get
automatically cleaned up just because a *different*, GObject-derived object containing it
gets destroyed. if a widget's own submenu, popup, or child object is a plain emitter
rather than a GObject, its signal handlers need an explicit disconnect - capture the
handler id and disconnect it on the parent's own real `destroy` signal, since that's the
one guaranteed to actually fire. this is exactly the kind of leak a static analyzer can
miss entirely (see the shexli section below), because it requires knowing which specific
object in a chain is a GObject and which is a plain emitter - that's not always visible
from the call site alone.

module-scope object instantiation is a related, real, cited finding: don't create
instances of objects in global/module scope. only use initialization for genuinely
static resources - if something needs to be created and torn down, it belongs inside
`enable()`/`disable()`, not at the top of the file.

## no defensive code against things that can't happen

this is called out explicitly in GNOME's own guidance as the clearest tell of low-effort
or unreviewed AI-generated code, and reviewers treat it as a real signal, not a nitpick.

no `try/catch` around calls that don't throw in normal operation - `destroy()`,
`connect()`, `disconnect()`, `abort()`, `GLib.Source.remove()` do not throw unhandled
exceptions in standard use. no `?.()` optional chaining or `typeof x === 'function'`
guards on methods that are guaranteed to exist on the target GNOME Shell versions. if a
method might genuinely not exist on some versions in the supported range (a real API
that was added or removed within 45-50), that's a legitimate feature-detection case - the
distinction is whether the uncertainty is real for the declared version range, not
whether it feels safer to guard everything by default.

## no eval, no shell-string interpolation

no `eval()`, ever - arithmetic or parsing needs are a solved problem with a real
recursive-descent parser, not a reason to reach for `eval()`.

no shell-string interpolation for spawning processes. always an argv array through
`Gio.Subprocess`, never a hand-built string handed to something that runs it through a
shell. a value interpolated into a shell command string is harmless right up until the
value stops being something fully controlled by the extension - build the habit of
avoiding it regardless of whether today's inputs are safe.

no synchronous D-Bus calls or synchronous file I/O in `extension.js`. it blocks the
compositor thread. everything touching D-Bus or the filesystem on the shell side is
async.

## external scripts and processes

use of external scripts and binaries is strongly discouraged, and where genuinely
unavoidable for the extension's purpose: no binary executables or libraries shipped in
the package, processes must be spawned carefully and exit cleanly, scripts should be
written in GJS unless a required capability is only available in another language, and
any script that does ship must be under an OSI-approved license. an extension may install
packages from well-known package registries but must require explicit user action to do
so - it can't silently install something on its own.

## no trademarked assets, no unnecessary files

no trademarked logos or assets bundled with the extension. don't ship files the
extension doesn't actually use - an unused stylesheet, a leftover `.pot` file, anything
not load-bearing for the extension's actual function is a real, cited review finding, not
a hypothetical one.

## settings schema conventions

schema id and path follow the extension's own namespace convention exactly and stay
internally consistent - `org.gnome.shell.extensions.<name>` as the id,
`/org/gnome/shell/extensions/<name>/` as the path. `settings-schema` is declared once in
`metadata.json` and `this.getSettings()` is called with no arguments everywhere else -
don't repeat the schema id as a separate module-level constant that could drift out of
sync with the declared one. the schema's filename should match its own schema id.

## never ship the compiled schema

`glib-compile-schemas` is fine, and necessary, to run locally for testing - it's how the
schema actually gets loaded when running the extension on a real machine. but
`schemas/gschemas.compiled` must not go into the zip that gets uploaded to EGO. EGO
compiles schemas server-side for 45+ packages, and shipping the compiled binary is a real,
commonly-cited review finding, not a theoretical one. treat this as an absolute packaging
rule regardless of how established or trusted a submitting account is - a soft "not
recommended, please remove" note from a reviewer is not the same as it being fine to
leave in.

## line length and readability

keep line length within a reasonable bound (roughly 200 characters) so a reviewer isn't
forced to scroll horizontally in EGO's review interface. write self-explanatory code with
clear names so comments explaining basic syntax or trivial operations aren't needed -
comments that just translate a line into english line-by-line are a real, cited review
friction point, not just unnecessary verbosity.

## reading shexli or any similar static analyzer correctly

`shexli` and tools like it do AST pattern-matching, not runtime reasoning - this is a
structural fact about how these tools work, not a guess about a specific tool's
implementation quality. that has two real consequences worth internalizing:

a flag can be a genuine false positive that's correct to keep as-is. if code
deliberately calls a removed-in-a-later-version API behind a real, working
feature-detection gate (checking for the presence of the newer method before falling
back to the older one), a pattern-matcher that only looks for the literal call cannot see
that gate - it will flag the call every time, and that's expected, not a bug in the
extension. the correct response to a flag like this is a clear comment at the call site
explaining exactly why the call is safe and version-gated, not a workaround. never
rewrite a flagged call as a dynamic/computed lookup (string-concatenated method names,
bracket-notation access built at runtime) specifically to make a pattern-matcher miss it
- that trades a flagged-but-explainable line for a genuinely obfuscated one, which is
strictly worse to hand a reviewer and violates the general "no obfuscated code" review
expectation directly. don't narrow a declared version-support range just to make a flag
disappear either - the supported range is a product decision, not something a linter
should be allowed to override.

a clean run is not proof of correctness. static pattern-matching can miss real bugs that
require understanding object relationships a pure AST scan can't see - the
plain-emitter-vs-GObject signal-leak case described above is a concrete example: the
literal `.connect()` call pattern looked identical to a hundred other safe ones, so a
pattern-matcher had nothing distinguishing to flag, even though the cleanup was
genuinely missing. don't treat an absence of findings as confirmation that cleanup is
correct - a manual pass specifically checking that every `.connect()` has a matching
`.disconnect()` reachable from a real destroy path is worth doing regardless of what the
analyzer reports.

most non-critical findings from these tools don't need to be engineered around, just
understood and left alone. the right level of concern for a finding in a
manual-review/advisory category is: understand why it fired, note it if it's worth
noting for future readers, and move on - not restructure working code to silence a tool
that is known, by its own design, to produce false positives.

## sources

the platform rules above (process isolation, cleanup requirements, deprecated APIs, the
45+ ESM cutover, external script rules, defensive-code guidance) are taken from the
current, official GNOME documentation and real review threads on extensions.gnome.org,
and are meant to be trusted rather than re-derived from scratch on every project:

- https://gjs.guide/extensions/ - general reference index
- https://gjs.guide/extensions/review-guidelines/review-guidelines.html - the actual EGO
  review rules
- https://gjs.guide/extensions/review-guidelines/best-practices.html - AI-generation-
  specific guidance
- https://gjs.guide/extensions/overview/updates-and-breakage.html - why extensions break
  and what avoids it
- https://gjs.guide/extensions/upgrading/gnome-shell-45.html - the 45 port guide
  (`console.*` vs `log()`, module changes)

when a specific project needs to verify a claim against the live guidelines page (a rule
that may have changed, or an edge case not covered here), fetch the actual page rather
than relying on this summary from memory - these guidelines are maintained documents and
can change between when this skill was written and when it's read.
