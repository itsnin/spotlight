# Security Policy

## Supported Versions

Only the latest release on the `develop` branch is actively supported.

| Branch | Supported |
|--------|-----------|
| develop | ✅ |
| main | ✅ (stable releases) |

## Reporting a Vulnerability

If you find a security vulnerability, please report it privately by emailing the maintainer rather than opening a public issue.

This extension:
- Runs inside the GNOME Shell process
- Reads clipboard contents
- Does NOT send any data over the network
- Does NOT use telemetry
- Does NOT execute arbitrary code from untrusted sources

## Security Best Practices

- Clipboard data stays on your machine
- SQLite database for emojis is read-only (shipped with the extension)
- Clipboard history is stored locally in your extension data directory
- No external network connections are made
