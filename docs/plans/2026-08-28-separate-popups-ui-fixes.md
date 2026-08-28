# Separate Popups & UI Fixes Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all reported UI issues and implement separate popups for clipboard/emoji instead of mode switching within the main Spotlight popup.

**Architecture:** Currently Spotlight has one popup with mode buttons that switch between search/clipboard/emoji views inside a content stack. New architecture: main Spotlight popup = search only. Clicking clipboard/emoji icons CLOSES the main popup and OPENS a new, separate popup dedicated to that feature. Each popup has its own window, positioning, and lifecycle.

**Tech Stack:** GNOME Shell 45+, GJS, St, Clutter, Gio, GLib

---

## Task 1: Fix Emoji Category Labels (show names, not just emoji icons)
**Files:**
- Modify: `popup/emojiView.js`

**Step 1: Understand current state**
Current code at `_tabsBox` creation uses `label: cat.icon` which shows only emoji. User wants category names visible.

**Step 2: Update category tabs to show names**
Change from emoji-only labels to show emoji + name, or name only. Original emoji-copy uses text labels. Use `cat.name` for the button label, keep emoji as icon or tooltip.

**Step 3: Verify syntax**
Run: `node --check popup/emojiView.js`
Expected: PASS

**Step 4: Commit**
```bash
git add popup/emojiView.js
git commit -m "fix: show emoji category names instead of just icons"
```

---

## Task 2: Fix Emoji Click Going to Search Box
**Files:**
- Modify: `popup/emojiView.js`

**Step 1: Diagnose root cause**
When `paste-on-select` is enabled, `_triggerPaste()` simulates Shift+Insert which pastes into whatever has keyboard focus. The main Spotlight search entry still has focus when emoji view is shown.

**Step 2: Fix: Unfocus search entry before paste / ensure clipboard copy works**
Before triggering paste, explicitly clear focus or ensure the target window has focus. Better: when emoji view is shown in its own popup (Task 3), the main popup's entry won't exist anymore. As interim fix, make sure `_closePopup()` is called BEFORE paste, or focus the stage first.

**Step 3: Verify syntax**
Run: `node --check popup/emojiView.js`
Expected: PASS

**Step 4: Commit**
```bash
git add popup/emojiView.js
git commit -m "fix: prevent emoji paste from going to search entry"
```

---

## Task 3: MAJOR ARCHITECTURAL CHANGE — Separate Popups for Clipboard and Emoji
**Files:**
- Modify: `spotlightPopup.js` — remove mode buttons, clipboard/emoji views, `_switchMode`
- Modify: `extension.js` — create separate popup instances, wire icon clicks to open/close
- Create: `popup/clipboardPopup.js` — standalone clipboard popup
- Create: `popup/emojiPopup.js` — standalone emoji popup
- Modify: `stylesheet.css` — add styles for new popups

**Step 3.1: Create standalone clipboard popup**
Create `popup/clipboardPopup.js` modeled after SpotlightPopup but simplified:
- No mode buttons
- Contains ClipboardView directly
- Has its own positioning (center screen)
- Has its own open/close lifecycle

**Step 3.2: Create standalone emoji popup**
Create `popup/emojiPopup.js` similarly:
- No mode buttons
- Contains EmojiView directly
- Center screen positioning
- Own open/close lifecycle

**Step 3.3: Simplify SpotlightPopup to search-only**
Remove from `spotlightPopup.js`:
- `_switchMode()` method
- `_buttonClipboard`, `_buttonEmoji`
- `_buttonsBox`
- `_clipboardView`, `_emojiView` references
- `_contentStack` view switching logic
- Mode-related code in `open()` method

Keep:
- Search bar
- Search results display
- Basic positioning and backdrop

**Step 3.4: Add mode buttons to panel / or keep in main popup as triggers**
The user sees the icons IN the main popup currently. We need to keep them there as TRIGGERS, but clicking them should:
1. Close main Spotlight popup
2. Open the dedicated clipboard/emoji popup

Alternative: Put icons in the top bar panel. But user's screenshot shows icons in the popup, so keep them there as trigger buttons that open separate windows.

**Step 3.5: Wire everything in extension.js**
- Create `_clipboardPopup` and `_emojiPopup` instances
- Connect mode button clicks to: `this._popup.close(); this._clipboardPopup.open();`
- Handle shortcuts: clipboard shortcut opens clipboard popup directly, emoji shortcut opens emoji popup directly
- Cleanup in disable: destroy all three popups

**Step 3.6: Verify all files**
Run:
```bash
node --check spotlightPopup.js
node --check popup/clipboardPopup.js
node --check popup/emojiPopup.js
node --check extension.js
```
Expected: All PASS

**Step 3.7: Commit**
```bash
git add spotlightPopup.js popup/clipboardPopup.js popup/emojiPopup.js extension.js stylesheet.css
git commit -m "feat: separate popups for clipboard and emoji features"
```

---

## Task 4: Fix Mode Button Positioning (icons too close / overlapping)
**Files:**
- Modify: `spotlightPopup.js` — adjust `_buttonsBox` styling, add padding/margins
- Modify: `stylesheet.css` — add proper spacing for `.spotlight-mode-button`

**Step 1: Add spacing between search bar and buttons**
Increase `spacing` in `_topBar` from 10px to 16px or more. Add left margin to `_buttonsBox`.

**Step 2: Make buttons larger with proper padding**
Increase button size from 16px icon to 18px or 20px. Add padding around buttons.

**Step 3: Verify syntax**
Run: `node --check spotlightPopup.js`
Expected: PASS

**Step 4: Commit**
```bash
git add spotlightPopup.js stylesheet.css
git commit -m "fix: improve mode button spacing and sizing"
```

---

## Task 5: Fix Search Results Cropping / Width Issues
**Files:**
- Modify: `spotlightPopup.js` — adjust container width or result item styling
- Modify: `stylesheet.css` — fix result item overflow

**Step 1: Diagnose cropping**
Popup is fixed at `width: 520`. Result items might have content that overflows. Need to ensure text wraps or is ellipsized.

**Step 2: Fix result item styling**
Ensure result items use `x_expand: true` and text labels use `ellipsize` or proper wrapping. Add `overflow: hidden` where needed.

**Step 3: Verify syntax**
Run: `node --check spotlightPopup.js`
Expected: PASS

**Step 4: Commit**
```bash
git add spotlightPopup.js stylesheet.css
git commit -m "fix: prevent search result content from being cropped"
```

---

## Task 6: Fix "Extra Search Bar" Issue
**Files:**
- Modify: `popup/overviewSearch.js` or `spotlightPopup.js` — ensure stolen overview widgets are properly hidden when not in search mode

**Step 1: Diagnose**
`OverviewSearch.steal(this)` reparents GNOME's overview search entry into Spotlight. When the views are shown, this stolen entry might still be visible. Need to ensure `this._search` (the stolen widget) is hidden when views are active.

**Step 2: Fix visibility management**
Ensure the stolen search entry is only visible when actually needed. With separate popups (Task 3), this becomes simpler since the main popup is search-only.

**Step 3: Verify**
Visual inspection after implementation.

**Step 4: Commit**
```bash
git add popup/overviewSearch.js spotlightPopup.js
git commit -m "fix: hide stolen overview search when not in search mode"
```

---

## Task 7: Fix Clipboard Popup Always Empty
**Files:**
- Debug: `services/clipboard/manager.js` — check `start()`, `_onClipboardChanged()`, Meta selection signal
- Debug: `services/clipboard/registry.js` — check `read()`, file paths
- Debug: `popup/clipboardView.js` — check `_refresh()`

**Step 1: Verify clipboard manager starts correctly**
Ensure `start()` is called, `_running` flag set, signal connected.

**Step 2: Verify Meta selection signal fires**
The `Meta.SelectionType.SELECTION_CLIPBOARD` owner-changed signal should fire on copy. Add logging temporarily to verify.

**Step 3: Verify registry read/write works**
Check `REGISTRY_PATH` is correct and writable. Ensure `_loadFromDisk()` properly populates `_history` and `_favorites`.

**Step 4: Verify clipboardView refresh**
Ensure `_refresh()` is called and properly accesses `getHistory()` / `getFavorites()`.

**Step 5: Fix any issues found**

**Step 6: Commit**
```bash
git add services/clipboard/manager.js services/clipboard/registry.js popup/clipboardView.js
git commit -m "fix: clipboard history not populating"
```

---

## Task 8: Full Verification & Schema Compilation
**Files:** All

**Step 1: Compile schema**
Run: `glib-compile-schemas --strict schemas/`
Expected: No errors

**Step 2: Check all JS syntax**
Run: `for f in $(find . -name "*.js" -not -path "./.git/*" -not -path "./services/emoji/libs/*"); do node --check "$f"; done`
Expected: All PASS

**Step 3: Check all imports resolve**
Run Python script to verify all relative import paths point to existing files.
Expected: All PASS

**Step 4: EGO checks**
Run: `grep -rn "console\."` and `grep -rn "run_dispose()"` on all JS files
Expected: Zero matches

**Step 5: Commit verification fixes if any**

---

## Task 9: Update Documentation & Comments
**Files:**
- Modify: `README.md` — update architecture description
- Update stale comments in modified files

**Step 1: Update README architecture section**
Reflect the new separate-popup architecture.

**Step 2: Update file header comments**
Ensure no stale references to old architecture.

**Step 3: Commit**
```bash
git add README.md
git commit -m "docs: update architecture documentation for separate popups"
```

---

## Task 10: Final Push
**Step 1: Push to develop**
```bash
git push origin develop
```

