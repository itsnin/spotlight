# Defensive Programming
Keep behavior predictable and safe when external systems or user input fail.
## Validate Inputs
Validate argument count, type, numeric ranges, and allowlisted values before using input in an API call. Reject invalid input with a clear message.
```js
if (typeof accelerator !== 'string' || accelerator.length === 0)
    return false;
```
## Check Dependencies
Check required objects and methods before first use. A genuinely required capability must fail clearly; an optional component may report the absence and continue only when that is an intentional contract.
```js
if (!Main.overview.searchEntry) {
    console.warn('Spotlight: overview search entry not found');
    return;
}
```
## Temporary Resources
Use `GLib.idle_add` with `GLib.SOURCE_REMOVE` for one-shot callbacks. Always store signal IDs that use plain `connect` and disconnect them explicitly. Never rely on garbage collection for cleanup.
## Idempotency
A second enable or disable should converge on the same state. Check before stealing widgets, overriding prototypes, or connecting signals. Avoid broad cleanup globs and make each cleanup target explicit.
## Actor Safety
- Guard against missing actors when traversing the overview hierarchy — `Main.overview._overview?._controls?._thumbnailsBox` with explicit existence checks, not optional chaining on guaranteed paths.
- Verify `monitorIndex` is within valid range before creating a `BackgroundManager` for that monitor.
- Guard `get_preferred_height` return values with `Number.isFinite()` before using them in layout calculations.
## Hard and Optional Failures
Required setup failures must stop before later code runs against an incomplete environment. Optional component failures need a concise warning and a safe continuation path. Do not hide a failure with an unconditional `true`.
## Logging
Log enough context to identify the failed component. Use appropriate `console` levels (`debug`, `warn`, `error`) rather than bare `log`. Never log sensitive data.
