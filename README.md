<h1 align="center">Spotlight</h1>

<p align="center">
  <strong>A compact, keyboard-driven launcher for GNOME Shell 45 through 51.</strong>
</p>

<p align="center">
  <a href="https://github.com/itsnin/spotlight">Repository</a>
  •
  <a href="https://extensions.gnome.org/extension/10666/spotlight/">GNOME Extensions</a>
</p>

<p align="center">
  <strong>Version:</strong> 2026.10
  &nbsp;•&nbsp;
  <strong>Shortcut:</strong> <code>Ctrl + Space</code>
</p>

<img width="1366" height="768" alt="Screenshot" src="https://github.com/user-attachments/assets/7d3d6cfb-86eb-44a7-83a0-f9810ded63f8" />


## Installation

### [GNOME Extensions](https://extensions.gnome.org/extension/10666/spotlight/) (recommended)

### curl

```bash
curl -sL https://raw.githubusercontent.com/itsnin/spotlight/main/scripts/build.sh | sh
# Log out and back in on Wayland before enabling.
gnome-extensions enable spotlight@nin
```

## Preferences

```bash
gnome-extensions prefs spotlight@nin
```

- Toggle keyboard shortcut (default `Ctrl+Space`)
- Visual theme: Default (follows system), Dark, or Light


## Features

- Reuses GNOME's built-in search infrastructure
- Results from apps, calculator, files, system actions, settings, web search
- Centered popup, grows downward, never drifts
- Translucent glass appearance, dark and light modes
- Live system theme following when set to Default

## Usage

| Action | Input |
|---|---|
| Open Spotlight | `Ctrl + Space` |
| Launch app | Type name, `Enter` |
| Evaluate expression | Type math, `Enter` |
| Lock screen | Type `lock`, `Enter` |
| Open Wi-Fi settings | Type `wifi`, `Enter` |
| Search the web | Type query, `Enter` |
| Traverse results | `↑` / `↓` |
| Dismiss | `Esc`, `Ctrl + Space`, or click outside |

## Architecture

Spotlight permanently takes over GNOME Overview's search infrastructure. On enable, it steals the Overview's search entry and search controller widgets and hides them. When the popup opens, these already-stolen widgets are reparented into the popup. When the popup closes, they're removed from the popup but kept stolen and hidden. They're only returned to the Overview on disable.

This approach means Spotlight automatically benefits from every search provider registered with GNOME Shell, with zero custom provider code.

| File | Responsibility |
|---|---|
| `extension.js` | Entry point: constructs popup and keybinding manager, manages lifecycle |
| `lib/ui/spotlightPopup.js` | Main search popup lifecycle: open/close/destroy |
| `lib/ui/popupBackdrop.js` | Transparent click-outside detection via chrome layer |
| `lib/ui/popupPositioner.js` | Sizes, centers, and shows popup on the correct monitor |
| `lib/core/keybinding.js` | Keybinding manager via grab_accelerator |
| `prefs.js` | Preferences window entry point |
| `prefs/shortcutPage.js` | Keyboard shortcut configuration |
| `prefs/appearancePage.js` | Visual theme preference |
| `prefs/aboutPage.js` | About section |
| `schemas/*.gschema.xml` | GSettings schema definitions |

## Contributing

Contributions of all types are welcome — bug fixes, new features, documentation improvements, design proposals. Before starting, please read the [contributor guide](./CONTRIBUTING.md) and the [agent standards](./AGENTS.md) which describe the project's design philosophy, architecture, code style, and verification discipline.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Security

For security vulnerabilities, please do not open a public issue. See the [security policy](./SECURITY.md) for the private reporting process.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
