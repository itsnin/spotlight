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
- Reads keyboard input via grab_accelerator
- Does NOT send any data over the network
- Does NOT use telemetry
- Does NOT execute arbitrary code from untrusted sources

## Security Best Practices

- All search happens locally on your machine
- No external databases or network connections
- No user data is stored persistently by this extension
- No external network connections are made
