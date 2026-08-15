# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Spotlight, please report it responsibly.

- **Public issues:** Open an issue on the [Issues tab](https://github.com/itsnin/spotlight/issues) with the label `security`.
- **Private disclosure:** Email **ninx.sh@gmail.com** with a description of the vulnerability, steps to reproduce, and potential impact.

Please do not open public issues for vulnerabilities that could be exploited before a fix is released. Use private email for those.

## Scope

Spotlight is a GNOME Shell extension with a small attack surface:

- **Clipboard access:** Write-only, triggered exclusively by user action (pressing Enter on a calculator result). No clipboard data is ever read or transmitted.
- **Subprocess spawning:** `gnome-control-center` is spawned with hardcoded panel IDs from a fixed array. No user input reaches the command line.
- **Web search:** URLs are constructed with `encodeURIComponent`. No unescaped user input reaches the browser.
- **Network access:** None. The extension does not make any network requests.

## Supported versions

Only the latest release on the `main` branch receives security updates.
