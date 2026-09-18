# Verification Discipline
Use evidence appropriate to the claim and the risk of the change.
## Before Coding
- Read the relevant implementation and its callers.
- Search for the same bug pattern elsewhere in the repository.
- State assumptions when they affect scope or behavior.
- Prefer a small reproduction or focused test for a bug fix.
## During Coding
- Keep every changed line traceable to the request or the verified fix.
- Check authoritative documentation when behavior is version-sensitive or externally defined.
- Treat search results, existing comments, and assumptions as hypotheses until the underlying source or code confirms them.
## Before Reporting
Label factual claims as one of:
- `Verified via [tool or source] just now`
- `From training data (may be outdated or wrong)`
- `Not verified — please confirm independently`
Use real source URLs only. Re-read the source before presenting a claim as verified, and mention plausible uncertainty instead of smoothing it over.
## Verification Scope
Run the smallest relevant checks first. For modified JavaScript, run `node --check`. For schema changes, verify XML structure and `glib-compile-schemas --strict`. For CSS changes, verify no `//` line comments.
- For GSettings schemas, verify XML validity, system compilation, schema resolution, and the read-back value before removing a working native fallback.
- For GNOME Shell API usage, verify against the actual GNOME Shell source or official GIR documentation, not third-party tutorials.
