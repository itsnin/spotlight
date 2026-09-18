# Security Anti-Patterns
## Never Evaluate Untrusted Input as Code
`eval()` or `Function()` on user-controlled data becomes code execution. Safe alternatives: parse structured input explicitly, use allowlisted values, or dispatch through a lookup table.
## Command Injection via Shell
Never pass untrusted strings through a shell. Use direct API calls instead. When spawning subprocesses is genuinely needed, pass arguments as an array, not as a shell command string.
## Path Traversal
User-supplied paths must be validated against an allowlist or canonicalized before use.
```js
// DANGEROUS — user input can reach outside the intended directory
const target = '/usr/share/' + userInput;
// SAFER — canonicalize and verify prefix
const target = Gio.File.new_for_path('/usr/share/' + userInput).resolve_relative_path('.').get_path();
```
## Sensitive Data
- Never log passwords, API keys, tokens, or personal data.
- Never store credentials in extension settings or state files.
- Use the system keyring when persistent credential storage is genuinely required.
## Dangerous Patterns to Avoid
| Anti-Pattern | Safe Alternative |
|-------------|-----------------|
| `eval()` on untrusted input | Explicit parsing, allowlist dispatch |
| Shelling out with concatenated strings | Direct library API, argument arrays |
| InnerHTML with user content | `textContent` or DOM creation APIs |
| Loading remote code over HTTP | HTTPS only, with content verification |
| Storing secrets in GSettings | System keyring, or do not store |
## Extension Boundaries
- Do not expose extension internals through global objects that other extensions can tamper with.
- Validate the type and structure of any object received from another extension or external service before using it.
- Prefer `connectObject` with a scoped owner over plain `connect` on global objects when the handler lifetime is tied to a specific widget.
## GSettings Safety
- Schema paths must be hardcoded, not constructed from user input.
- Never write settings values that were not explicitly validated or allowlisted.
