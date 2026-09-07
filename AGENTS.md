# Agents Guide for Spotlight

Read this file before touching any code. It covers architecture, design decisions, code style and EGO review constraints.

## Supplementary Skills

The skills directory contains focused, single-topic skill files extracted from the official gjs.guide documentation. These serve as reference material while this file remains the single source of truth for project-specific rules.

Available skills:
- extension-getting-started
- extension-esm-imports
- extension-lifecycle
- extension-signal-cleanup
- extension-gsettings
- extension-prefs
- extension-styling
- extension-debugging
- extension-review-guidelines
- extension-best-practices
- extension-metadata
- extension-guideline
- extension-writing-standards
- extension-overview-search-stealing
- extension-popup-close-defense

## What This Extension Is

Spotlight is a compact launcher for GNOME Shell. Press a shortcut, a centered translucent glass popup appears, type something and results show up in real time. It permanently steals the Overview search widgets. The Overview itself stays functional, only its search UI gets replaced.

## Supported Versions

GNOME Shell 45, 46, 47, 48, 49, 50 and 51, listed in metadata.json under shell-version. The minimum is 45 because that is when GNOME Shell switched to ES modules.

Wayland only. X11 is not supported. GNOME Shell 50 removed X11 entirely.

## Architecture

One popup permanently steals the Overview search entry and controller. Widgets get stolen once in enable and returned once in disable. Open and close only reparent widgets between our content box and a hidden state. They never return to the Overview while the extension remains enabled.

File layout:
- extension.js: entry point
- lib/ui/: user interface components
- lib/core/: core infrastructure
- prefs.js: preferences entry point
- prefs/: preference pages
- schemas/: GSettings schema
- scripts/: installer
- stylesheet.css: styling

## Process Isolation

The shell process runs extension.js and the lib files. It must not import Gtk, Gdk or Adw. The prefs process runs prefs.js and the prefs files. It must not import St, Clutter, Meta or Shell. EGO review rejects violations.

## Signal Management

Use connectObject with this as the owner. Calling disconnectObject on this in destroy or disable cleans all handlers at once. Use plain connect with explicit ID tracking only for signals that must persist across open and close cycles.

## Popup Positioning

Positioned once at open based on the empty-state height. Grows downward from a fixed anchor. Never reposition on size changes because it causes visible drift.

## Click-Outside Detection

A transparent full-screen St widget sits in the chrome layer behind the popup. The backdrop covers the target monitor and listens for button-release events. The popup sits above the backdrop in the stacking order so clicks on the popup work normally.

## Workspace Thumbnail Scale

Workspace thumbnails in the overview are intentionally small by default. Spotlight increases _maxThumbnailScale from its default to 0.1, effectively doubling the maximum available size so thumbnails are actually usable on modern high-resolution displays. Applied to both the primary monitor thumbnails box and the SecondaryMonitorDisplay prototype method _getThumbnailsHeight for multi-monitor setups. Original values are backed up in stealOverviewSearch and restored in returnOverviewSearch.

## Workspace Thumbnail Background

GNOME Shell uses a solid grey color for workspace thumbnails by default. Spotlight overrides WorkspaceThumbnail.prototype._init to create a BackgroundManager for each thumbnail's contents container, which shows the actual wallpaper instead. Also overrides _onDestroy to clean up the BackgroundManager and its signal connections. Connects to loaded and changed signals on the BackgroundManager to queue relayout, working around a Shell 50 bug where thumbnails stay blank until something else forces a relayout.

## Overview Type-to-Search Interception

The GNOME overview has a start-typing-to-search feature. When Spotlight's popup is open and the user types, the entry receives keys through focus routing, the search controller activates, and the ControlsManager reacts to notify::search-active by calling _onSearchChanged(). This method fades out the app display and workspaces display (opacity to 0) and fades in the search controller. Since the search controller widgets were permanently stolen, fading it in renders as empty black space.

The fix overrides ControlsManager._onSearchChanged() on the instance at Main.overview._overview._controls. The override checks if the popup is visible and returns early if so, skipping the fade animations entirely. When the popup is not visible, it delegates to the original bound method. Root cause verified in actual GNOME Shell source: js/ui/overviewControls.js _onSearchChanged().

Stage key capture is still needed for when the popup is NOT visible — it consumes printable keys so typing in the overview does nothing. When the popup IS visible, it manually forwards keys to the entry because EVENT_STOP at capture phase prevents normal target-phase delivery.

## Popup Close Mechanisms

The popup closes on toggle shortcut, Escape or click outside, plus a comprehensive activation-close defense. First, button-press-event on the search results catches mouse clicks on any result. Second, Enter or Space key capture when focus sits on result buttons rather than the entry. Third, global.display notify::focus-window tracks external app focus at the window manager level.

## Object Lifecycle

Every object created in enable gets destroyed in disable. Every widget added to chrome gets removed. Every main loop source gets removed. Every signal gets disconnected. If you add something, add cleanup for it. EGO review rejects leaks.

## Module-Scope Restrictions

No objects, no signals, no main loop sources at the top level of any JS file. Only static data structures like arrays, objects, Maps, Sets and RegExps are allowed.

## Code Style

Comments should explain the reasons rather than just state the facts. They should be written in the style of an experienced but lazy senior engineer, using natural rather than forced grammar and employing capital letters when appropriate. Use only light punctuation and do not include any banners, JSDoc or references to other projects. Avoid phrases commonly associated with large language models such as here we, let us and note that. Also, do not have three comment lines in a row without any intervening code.

Enable and disable are adjacent in extension.js. Split logic into small files each with a single responsibility. No TypeScript. Plain JavaScript with no build step.

## EGO Verified Rules

No imports.gi, use ESM import gi://Name instead. Console API with appropriate levels like debug, warn and error rather than bare log. No run_dispose unless absolutely necessary. Optional chaining only for genuinely potentially-null objects, never for guaranteed objects. No try-catch around standard API calls, only for file I/O, JSON parsing and external data. CSS uses only block comments, never line comments. No defensive null checks that mask bugs.

## Keybinding

Default shortcut is Ctrl+Space, stored as Control+Space. Super+Space gets grabbed by GNOME Shell for input source switching on some setups. Uses global.display.grab_accelerator rather than Main.wm.addKeybinding because addKeybinding can fail if the schema is not ready at enable time.

## GSettings Schema

Schema ID is org.gnome.shell.extensions.spotlight. Path is /org/gnome/shell/extensions/spotlight/. The gschemas.compiled file is not shipped because GNOME Shell 44 and later compiles automatically on install.

Keys:
- toggle-shortcut of type as, default Control+Space
- theme-preference of type s, default default. Values are default, dark and light.

## Design

Translucent glass. Dark rgba(28, 28, 30, 0.85), light rgba(255, 255, 255, 0.88). Compact. 520 px wide, 380 px max height. Min resolution 1366 by 768. 36 px rounded corners. Fixed anchor. Positioned once at open, grows downward. No drift. Instant. No animations. Live theme. Default mode follows system dark and light changes live.

## Appearance Theme

Three modes controlled by the theme-preference GSettings key. Dark by default with background rgba(28,28,30,0.85) and text #f5f5f7. Light uses background rgba(255,255,255,0.88) and text #1d1d1f. The theme-light class gets added to the content container for light mode. Applied in _applyTheme which gets called from _doOpen before showing. When the preference is set to default, the code listens to org.gnome.desktop.interface changed::color-scheme and updates live while the popup is open.

## Multi-Monitor

The popup opens on the monitor where the cursor currently sits. getTargetMonitor calls global.get_pointer and checks which monitor rectangle contains the cursor coordinates. Falls back to the primary monitor. The backdrop covers only the target monitor so users on other monitors can interact normally.

## Testing

Every JS file must parse as an ES module. The schema must compile with glib-compile-schemas. Test on GNOME Shell 50 Wayland first.
