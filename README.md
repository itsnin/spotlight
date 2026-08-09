# Spotlight

A compact, macOS Spotlight–inspired launcher for GNOME Shell 45 through 50.

**Repository:** https://github.com/itsnin/spotlight
**Version:** 30.7.2026

## Keyboard Shortcut

`Ctrl + Space`

<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/73934211-7584-4c00-a5b2-27dd88a6235b" />
<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/dde58067-3945-4b8e-ad26-89c13d60cb6b" />
<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/7529d643-d96b-4382-9d0e-085f35d90ccb" />
<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/53ed78a5-d143-4cac-9438-fa5175c34d00" />

## Overview

Spotlight is a keyboard-driven launcher that surfaces results the moment you begin typing. It searches installed applications with fuzzy matching, evaluates arithmetic expressions, exposes system power actions, navigates GNOME Settings panels, and falls back to web search when no local result matches. The popup is anchored at the center of the primary monitor, grows downward as results accumulate, and dismisses the instant you click elsewhere, press `Esc`, or toggle the shortcut again.

## Search Priority

Results are aggregated in the following order. Each category is rendered under its own section header, and web search appears only when every preceding category returned nothing.

1. **Applications** — Fuzzy-matched against every installed `.desktop` entry. Typing `ffx` surfaces Firefox; `gimp` surfaces GIMP. Ranking combines match score with usage frequency sourced from `Shell.AppUsage`, so frequently launched applications rise to the top.
2. **Calculator** — A recursive-descent arithmetic parser evaluates the input live. Pressing `Enter` copies the result to the clipboard. Supports `+`, `-`, `*`, `/`, `%`, parentheses, and unary negation.
3. **System Actions** — Lock, suspend, restart, shut down, log out, and switch user. These are routed through GNOME Shell's built-in `SystemActions` singleton, which handles policy and permission checks internally.
4. **GNOME Settings** — Direct navigation to any Settings panel (Wi-Fi, Bluetooth, Displays, Sound, Power, Keyboard, etc.) via `gnome-control-center`.
5. **Web Search** — A last-resort fallback that opens the configured search engine in the default browser. Supports Google, DuckDuckGo, Brave, Bing, and Startpage.

## Usage

Open the popup with `Ctrl + Space` and begin typing. Navigation is entirely keyboard-driven.

| Action | Input |
|---|---|
| Open Spotlight | `Ctrl + Space` |
| Launch an application | Type its name or abbreviation, then `Enter` |
| Evaluate an expression | Type the math, then `Enter` (result is copied to clipboard) |
| Lock the screen | Type `lock`, then `Enter` |
| Open Wi-Fi settings | Type `wifi`, then `Enter` |
| Search the web | Type a query with no local matches, then `Enter` |
| Traverse results | `↑` / `↓` arrow keys |
| Dismiss | `Esc`, `Ctrl + Space`, or click outside the popup |

## Installation

### Install [GNOME Shell Extension Manager](https://mattjakeman.com/apps/extension-manager/)



```bash
gnome-extensions install ~/Downloads/spotlight@nin.zip
#On Wayland sessions, log out and back in 
gnome-extensions enable spotlight@nin
``` 


## Preferences

```bash
gnome-extensions prefs spotlight@nin
```

Configurable options:

- The toggle keyboard shortcut (capture any key combination directly in the preferences window)
- Popup width (400–1200 px, default 600)
- Maximum results per category (1–20, default 6)
- Web search engine (Google, DuckDuckGo, Brave, Bing, Startpage)
- Whether to display the web search fallback at all

## Architecture

The codebase comprises 23 modular JavaScript files: 18 at the root level for the GNOME Shell process and 4 inside `prefs/` for the preferences (GTK4/Adwaita) process. This flat-root structure is a requirement of the GNOME Extensions website, which locates `extension.js` at the archive root. The preferences files reside in their own subdirectory to enforce process isolation — they execute in a separate GTK process and must never import shell-only libraries such as `St`, `Clutter`, `Meta`, or `Shell`.

| File | Responsibility |
|---|---|
| `extension.js` | Entry point — constructs the popup and registers the keybinding |
| `prefs.js` | Preferences window entry point |
| `spotlightPopup.js` | Popup widget — open/close, search rendering, keyboard navigation, click-outside dismissal |
| `searchEntry.js` | Search input with magnifying-glass icon |
| `resultsContainer.js` | Scrollable results area |
| `resultRow.js` | Single result row with icon, title, and interaction handling |
| `sectionHeader.js` | Section header label |
| `sectionTitles.js` | Maps result types to human-readable titles |
| `noResults.js` | Empty-state widget |
| `appSearch.js` | Fuzzy application search via `Shell.AppSystem` |
| `calculatorSearch.js` | Arithmetic evaluation and clipboard copy |
| `systemActionsSearch.js` | System actions via `Shell.SystemActions` singleton |
| `settingsSearch.js` | GNOME Settings panel search |
| `webSearch.js` | Web search fallback |
| `searchController.js` | Orchestrates all providers and merges results by priority |
| `keybinding.js` | Keybinding manager using `Meta.Display.grab_accelerator` |
| `calculator.js` | Recursive-descent arithmetic parser |
| `fuzzyMatcher.js` | Fuzzy string matching with positional scoring |
| `shellVersion.js` | GNOME Shell version detection for multi-version compatibility |
| `prefs/shortcutPage.js` | Keyboard shortcut configuration |
| `prefs/appearancePage.js` | Popup width and result limit controls |
| `prefs/webSearchPage.js` | Search engine selection |
| `prefs/aboutPage.js` | About section |

## Design Principles

- **Dark, not black.** Background `#1c1c1e` with text `#f5f5f7` — the same palette macOS Spotlight uses in dark mode. Pure black is harsh on OLED and inaccurate on IPS panels.
- **Compact.** 600 px wide by default, centered on the primary monitor. Results cap at 400 px height before scrolling engages.
- **Rounded.** 32 px corner radius on the popup, 16 px on individual result rows.
- **No blur, no overlay, no border.** The popup floats as a standalone element. No backdrop dimming, no Gaussian blur, no focus outline.
- **Fixed anchor.** The popup is positioned once at open time and grows downward from that anchor. It never drifts upward when results appear.
- **Instant.** No fade-in, no slide animation. The popup appears the same frame the shortcut is registered.

## Clipboard Access

This extension writes to the clipboard **only** when the user explicitly activates a calculator result by pressing `Enter` on a valid arithmetic expression. No clipboard data is ever read. No clipboard content is transmitted to any third party. This behavior is declared in `metadata.json` and is strictly user-initiated.

## License

GPL-3.0-or-later. See the [LICENSE](LICENSE) file for the full text.
