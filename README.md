# Spotlight

A compact, keyboard-driven launcher for GNOME Shell 45 through 50.

[Repository](https://github.com/itsnin/spotlight) • [GNOME Extensions](https://extensions.gnome.org/extension/10666/spotlight/)

**Version:** 2026.08.30

## Keyboard Shortcut

`Ctrl + Space`


<img width="1366" height="768" alt="Screenshot From 2026-08-24 19-35-43" src="https://github.com/user-attachments/assets/7d3d6cfb-86eb-44a7-83a0-f9810ded63f8" />


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

### [Install from GNOME Extensions](https://extensions.gnome.org/extension/10666/spotlight/) (recommended)

### Install via curl

```bash
curl -sL https://raw.githubusercontent.com/itsnin/spotlight/main/scripts/build.sh | sh
#On Wayland, log out and back in before enabling the extension
gnome-extensions enable spotlight@nin
```

## Preferences

```bash
gnome-extensions prefs spotlight@nin
```

Configurable options:

- The toggle keyboard shortcut (default `Ctrl+Space`)
- Visual theme: Default (follows GNOME system style), Dark, or Light
- Clipboard history behavior, search options, display toggles
- Emoji defaults, grid size, and interaction behavior

Web search is provided by GNOME's registered search providers.

## Optional Built-in Features

Spotlight includes several optional features that can be individually enabled or disabled in preferences. When disabled they have zero impact on the system.

| Feature | Description | Default |
|---|---|---|
| **Caffeine** | Prevent screen blanking and auto-suspend | Off |
| **Workspaces Bar** | Replace top-panel workspace indicator with an i3-like workspaces bar | Off |
| **Disable Dash** | Hide the GNOME dash dock in the overview | Off |

### Caffeine
When enabled, adds a top-panel indicator and Quick Settings toggle to prevent the screen from blanking and the system from auto-suspending. Supports full-screen apps, MPRIS media players, application triggers, timers, and configurable preferences.

### Workspaces Bar
When enabled, replaces the default GNOME workspace indicator with a customizable i3-like workspaces bar in the top panel. Features include add/remove/rename workspaces, drag-and-drop reordering, smart workspace names, keyboard shortcuts, scroll-wheel navigation, and full appearance customization. Three dedicated preferences pages (Appearance, Behavior, Shortcuts) provide complete configuration.

### Disable Dash
When enabled, hides the GNOME dash dock in the Activities overview. Adjusts window preview overlap to maintain proper layout when the dash is hidden.

## Build Note
Compiled GSettings schemas (`gschemas.compiled`) are **not shipped** in the repository. GNOME Shell automatically compiles all schema XML files from the `schemas/` directory at extension install time. This follows GNOME extension best practices.

## Architecture

Spotlight permanently takes over GNOME Overview's search infrastructure. On enable, it steals the Overview's search entry and search controller widgets and hides them. When the popup opens, these already-stolen widgets are reparented into the popup. When the popup closes, they are removed from the popup but kept stolen and hidden. They are only returned to the Overview on disable.

This approach means Spotlight automatically benefits from every search provider registered with GNOME Shell, with zero custom provider code.

| File | Responsibility |
|---|---|
| `extension.js` | Entry point — constructs popup, delegates to modules, manages standalone features |
| `spotlightPopup.js` | Popup lifecycle — open/close/destroy, delegates to helpers |
| `popup/overviewSearch.js` | Steals and returns Overview search widgets |
| `popup/themeManager.js` | Theme detection and application (dark/light/system) |
| `popup/popupBackdrop.js` | Transparent click-outside detection via chrome layer |
| `popup/popupPositioner.js` | Sizes, centers, and shows the popup via deferred idle callback |
| `popup/clipboardView.js` | Clipboard history view with favorites, tags, edit, private mode |
| `popup/emojiView.js` | Emoji picker with categories, skin tones, gender, tooltips |
| `services/keybinding.js` | Keybinding manager using `Meta.Display.grab_accelerator` |
| `services/clipboardManager.js` | Clipboard history tracking, favorites, persistence |
| `services/clipboardEntry.js` | Clipboard entry class with tag support |
| `services/clipboardRegistry.js` | Disk persistence for clipboard history |
| `services/emojiData.js` | Emoji database, search, modifiers, recently used |
| `services/virtualKeyboard.js` | Virtual input device for paste-on-select simulation |
| `services/core/` | Core Spotlight services — keybinding, virtual keyboard |
| `services/clipboard/` | Clipboard history feature — entry, manager, registry, keyboard, dialogs |
| `services/emoji/` | Emoji picker feature — data manager, UI components |
| `services/caffeine/` | Caffeine feature — indicator, inhibitor manager, MPRIS |
| `services/workspaces/` | Workspaces bar feature — UI, services, utils, styles |
| `prefs.js` | Preferences window entry point — includes workspaces bar prefs pages |
| `prefs/shortcutPage.js` | Keyboard shortcut configuration |
| `prefs/appearancePage.js` | Visual theme, clipboard, emoji, standalone feature toggles |
| `prefs/aboutPage.js` | About section |
| `prefs/caffeine/` | Caffeine preferences pages |
| `prefs/workspaces/` | Workspaces bar preferences pages |
| `schemas/*.gschema.xml` | GSettings schema definitions (not pre-compiled) |
## Design Principles

- **Dark, not black.** Background `#1c1c1e` with text `#f5f5f7`. Pure black is harsh on OLED and inaccurate on IPS panels.
- **Compact.** 520 px wide, 380 px max height, centered on the monitor where the cursor currently sits. Search results scroll internally via GNOME's built-in `St.ScrollView` when they exceed available space. Minimum supported resolution is 1366×768 — fits perfectly with 37 px bottom margin, zero cropping.
- **Extreme rounded corners.** 36 px border radius on the popup.
- **Solid dark background.** `#1c1c1e` with text `#f5f5f7` for maximum readability.
- **Fixed anchor.** The popup is positioned once at open time and grows downward from that anchor. It never drifts upward when results appear.
- **Instant.** No fade-in, no slide animation. The popup appears the same frame the shortcut is registered.

## License

GPL-3.0-or-later. See the [LICENSE](LICENSE) file for the full text.
