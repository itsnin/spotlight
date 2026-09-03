# Spotlight

A compact, keyboard-driven launcher for GNOME Shell 45 through 50.

[Repository](https://github.com/itsnin/spotlight) • [GNOME Extensions](https://extensions.gnome.org/extension/10666/spotlight/)

**Version:** 2026.08.25

`Ctrl + Space`

<img width="1366" height="768" alt="Screenshot" src="https://github.com/user-attachments/assets/7d3d6cfb-86eb-44a7-83a0-f9810ded63f8" />

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

## Installation

### [GNOME Extensions](https://extensions.gnome.org/extension/10666/spotlight/) (recommended)

### curl

```bash
curl -sL https://raw.githubusercontent.com/itsnin/spotlight/main/scripts/build.sh | sh
gnome-extensions enable spotlight@nin
```

Log out and back in on Wayland before enabling.

## Preferences

```bash
gnome-extensions prefs spotlight@nin
```

- Toggle keyboard shortcut (default `Ctrl+Space`)
- Visual theme: Default (follows system), Dark, or Light

## Design

- **Translucent glass.** Dark `rgba(28, 28, 30, 0.85)` / Light `rgba(255, 255, 255, 0.88)`.
- **Compact.** 520 px wide, 380 px max height. Min resolution 1366×768.
- **36 px rounded corners.**
- **Fixed anchor.** Positioned once at open, grows downward. No drift.
- **Instant.** No animations.
- **Live theme.** Default mode follows system dark/light changes live.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
