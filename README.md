# Spotlight

A compact, keyboard-driven launcher for GNOME Shell 45 through 50.

[Repository](https://github.com/itsnin/spotlight) • [GNOME Extensions](https://extensions.gnome.org/extension/10666/spotlight/)

**Version:** 2026.08.25

## Keyboard Shortcut

`Ctrl + Space`

<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/73934211-7584-4c00-a5b2-27dd88a6235b" />

## Overview

Spotlight is a keyboard-driven launcher that surfaces results the moment you begin typing. It reuses GNOME's built-in search infrastructure to provide results from installed applications, calculator, files, system power actions, GNOME Settings panels, and any third-party search providers you have installed. The popup is anchored at the center of the monitor where the cursor currently sits, grows downward as results accumulate, and dismisses the instant you click elsewhere, press `Esc`, or toggle the shortcut again.

Spotlight replaces GNOME Overview search entirely. While Spotlight is enabled, Overview search is permanently disabled. The Overview itself remains fully functional — only its search UI is replaced.

## Search Providers

Spotlight uses GNOME's registered search providers. Results and their order are determined by GNOME Shell. Common providers include:

- **Applications** — Matched against every installed `.desktop` entry.
- **Calculator** — Arithmetic expressions evaluated by GNOME Calculator.
- **Files** — Indexed via Tracker, GNOME's file metadata system.
- **System Actions** — Lock, suspend, restart, shut down, log out.
- **GNOME Settings** — Direct navigation to any Settings panel.
- **Web Search** — Provided by your browser

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

- The toggle keyboard shortcut (default `Ctrl+Space`)
- Visual theme: Default (follows GNOME system style), Dark, or Light

Web search is provided by GNOME's registered search providers.

## Architecture

Spotlight permanently takes over GNOME Overview's search infrastructure. On enable, it steals the Overview's search entry and search controller widgets and hides them. When the popup opens, these already-stolen widgets are reparented into the popup. When the popup closes, they are removed from the popup but kept stolen and hidden. They are only returned to the Overview on disable.

This approach means Spotlight automatically benefits from every search provider registered with GNOME Shell, with zero custom provider code.

| File | Responsibility |
|---|---|
| `extension.js` | Entry point — constructs popup, delegates to modules |
| `spotlightPopup.js` | Popup lifecycle — open/close/destroy, delegates to helpers |
| `popup/overviewSearch.js` | Steals and returns Overview search widgets |
| `popup/themeManager.js` | Theme detection and application (dark/light/system) |
| `popup/popupBackdrop.js` | Transparent click-outside detection via chrome layer |
| `popup/popupPositioner.js` | Sizes, centers, and shows the popup via deferred idle callback |
| `services/keybinding.js` | Keybinding manager using `Meta.Display.grab_accelerator` |
| `prefs.js` | Preferences window entry point |
| `prefs/shortcutPage.js` | Keyboard shortcut configuration |
| `prefs/appearancePage.js` | Visual theme selection |
| `prefs/aboutPage.js` | About section |
## Design Principles

- **Dark, not black.** Background `#1c1c1e` with text `#f5f5f7`. Pure black is harsh on OLED and inaccurate on IPS panels.
- **Compact.** 520 px wide, 380 px max height, centered on the monitor where the cursor currently sits. Search results scroll internally via GNOME's built-in `St.ScrollView` when they exceed available space. Minimum supported resolution is 1366×768 — fits perfectly with 37 px bottom margin, zero cropping.
- **Extreme rounded corners.** 36 px border radius on the popup.
- **Solid dark background.** `#1c1c1e` with text `#f5f5f7` for maximum readability.
- **Fixed anchor.** The popup is positioned once at open time and grows downward from that anchor. It never drifts upward when results appear.
- **Instant.** No fade-in, no slide animation. The popup appears the same frame the shortcut is registered.

## License

GPL-3.0-or-later. See the [LICENSE](LICENSE) file for the full text.
