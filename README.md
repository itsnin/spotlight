# Spotlight

A compact, macOS Spotlight–inspired launcher for GNOME Shell 45 through 50.

[Repository](https://github.com/itsnin/spotlight) • [GNOME Extensions](https://extensions.gnome.org/extension/10666/spotlight/)

**Version:** 2026.08.22

## Keyboard Shortcut

`Ctrl + Space`

<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/73934211-7584-4c00-a5b2-27dd88a6235b" />

## Overview

Spotlight is a keyboard-driven launcher that surfaces results the moment you begin typing. It reuses GNOME's built-in search infrastructure to provide results from installed applications, calculator, files, system power actions, GNOME Settings panels, and any third-party search providers you have installed. The popup is anchored at the center of the primary monitor, grows downward as results accumulate, and dismisses the instant you click elsewhere, press `Esc`, or toggle the shortcut again.

Spotlight replaces GNOME Overview search entirely. While Spotlight is enabled, Overview search is permanently disabled. The Overview itself remains fully functional — only its search UI is replaced.

## Search Providers

Spotlight uses GNOME's registered search providers. Results and their order are determined by GNOME Shell. Common providers include:

- **Applications** — Matched against every installed `.desktop` entry.
- **Calculator** — Arithmetic expressions evaluated by GNOME Calculator.
- **Files** — Indexed via Tracker, GNOME's file metadata system.
- **System Actions** — Lock, suspend, restart, shut down, log out.
- **GNOME Settings** — Direct navigation to any Settings panel.
- **Web Search** — Provided by your browser (Firefox, Epiphany) or search provider extensions when installed.

## Usage

Open the popup with `Ctrl + Space` and begin typing. Navigation is entirely keyboard-driven.

| Action | Input |
|---|---|
| Open Spotlight | `Ctrl + Space` |
| Launch an application | Type its name or abbreviation, then `Enter` |
| Evaluate an expression | Type the math, then `Enter` |
| Lock the screen | Type `lock`, then `Enter` |
| Open Wi-Fi settings | Type `wifi`, then `Enter` |
| Search the web | Type a query with no local matches, then `Enter` |
| Traverse results | `↑` / `↓` arrow keys |
| Dismiss | `Esc`, `Ctrl + Space`, or click outside the popup |

## Installation

### [Install from GNOME Extensions](https://extensions.gnome.org/extension/10666/spotlight/)

### [Install GNOME Shell Extension Manager](https://mattjakeman.com/apps/extension-manager/)

```bash
gnome-extensions install ~/Downloads/spotlight@nin.zip
# On Wayland sessions, log out and back in
gnome-extensions enable spotlight@nin
```

## Preferences

```bash
gnome-extensions prefs spotlight@nin
```

Configurable options:
- The toggle keyboard shortcut (default `Ctrl+Space`, also supports `Alt+Space` PowerToys Run style)

**About Alt+Space:** GNOME Shell uses Alt+Space for the window menu by default. When you set Alt+Space as your Spotlight shortcut, the extension temporarily disables the window menu keybinding so Spotlight can receive the key. The original window menu keybinding is automatically restored when you change the shortcut or disable the extension. This matches how PowerToys Run works on Windows.

Web search is provided by GNOME's registered search providers. Install Firefox, Epiphany, or a search provider extension to enable web search results.

## Architecture

Spotlight permanently takes over GNOME Overview's search infrastructure. On enable, it steals the Overview's search entry and search controller widgets and hides them. When the popup opens, these already-stolen widgets are reparented into the popup. When the popup closes, they are removed from the popup but kept stolen and hidden. They are only returned to the Overview on disable.

This approach means Spotlight automatically benefits from every search provider registered with GNOME Shell, with zero custom provider code.

| File | Responsibility |
|---|---|
| `extension.js` | Entry point — constructs popup, steals Overview search, registers keybinding |
| `prefs.js` | Preferences window entry point |
| `spotlightPopup.js` | Popup lifecycle — steal/return Overview search, open/close/destroy |
| `popupBackdrop.js` | Transparent click-outside detection via chrome layer |
| `popupPositioner.js` | Sizes, centers, and shows the popup via deferred idle callback |
| `keybinding.js` | Keybinding manager using `Meta.Display.grab_accelerator` |
| `prefs/shortcutPage.js` | Keyboard shortcut configuration |
| `prefs/aboutPage.js` | About section |

## Design Principles

- **Dark, not black.** Background `#1c1c1e` with text `#f5f5f7`. Pure black is harsh on OLED and inaccurate on IPS panels.
- **Compact.** 520 px wide, 380 px max height, centered on the primary monitor. Search results scroll internally via GNOME built-in St.ScrollView when they exceed available space. Minimum supported resolution is 1366×768 fits perfectly with 37 px bottom margin zero cropping.
- **Extreme rounded corners.** 36 px border radius on the popup.
- **Frosted glass.** `Shell.BlurEffect` in background mode with a translucent tint layer.
- **Fixed anchor.** The popup is positioned once at open time and grows downward from that anchor. It never drifts upward when results appear.
- **Instant.** No fade-in, no slide animation. The popup appears the same frame the shortcut is registered.

## License

GPL-3.0-or-later. See the [LICENSE](LICENSE) file for the full text.
