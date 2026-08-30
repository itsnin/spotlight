# agents guide for spotlight

this file is the single source of truth for any person ai or agent working on this extension read it fully before touching any code it covers design philosophy architecture gnome version support code style ego review constraints and the why behind every non-obvious decision

if you are an ai agent read the whole file do not skim

## supplementary skills reference

the `skills/` directory contains focused single topic skill files extracted from the official gjs.guide documentation

each skill covers one specific area in depth:

- `skills/extension-getting-started/` — basic setup required files directory structure
- `skills/extension-esm-imports/` — es module import rules process isolation
- `skills/extension-lifecycle/` — enable disable symmetry cleanup discipline
- `skills/extension-signal-cleanup/` — connectobject signal patterns and cleanup
- `skills/extension-glib-sources/` — timeout_add idle_add source removal
- `skills/extension-gsettings/` — schema conventions binding metadata integration
- `skills/extension-prefs/` — fillPreferencesWindow adw gtk4 process isolation
- `skills/extension-styling/` — stylesheet.css st css limitations box model
- `skills/extension-translations/` — gettext marking strings pot files
- `skills/extension-debugging/` — looking glass journalctl nested shell
- `skills/extension-review-guidelines/` — ego review rules rejection reasons
- `skills/extension-best-practices/` — ai specific guidance code quality
- `skills/extension-metadata/` — metadata.json fields conventions validation
- `skills/extension-injection/` — injectionmanager method patching patterns
- `skills/extension-accessibility/` — atk roles states relationships

these skills are supplementary reference material this file agemt.md remains the single source of truth for project specific rules architecture and design decisions

## what this extension is

spotlight is a compact launcher for gnome shell inspired by a keyboard-driven launcher design you press a shortcut a centered popup appears you type and results show up in real time

the goal is to feel like a dedicated launcher not look like a generic shell extension that means dark compact rounded solid dark background no title bar no chrome just a floating input box with results below it

## design philosophy

### minimal ui no chrome

the popup has no title bar no close button no backdrop overlay clicking outside or pressing escape closes it the popup floats above all windows via the chrome layer keyboard input is captured via grab_key_focus on the entry and stage level captured-event while open and released on close

### dark not black

the background is `#1c1c1e` not pure black pure black looks harsh on oled and wrong on ips the text is `#f5f5f7` not pure white to reduce eye strain selection uses `rgba(255,255,255,0.12)` a subtle white overlay not the gnome blue accent this matches a clean dark appearance

### compact not full screen

the popup is 520px wide centered on the monitor where the cursor currently sits it grows downward as results appear but never exceeds 380px total height fits minimum supported resolution 1366x768 with 37px bottom margin zero cropping results scroll internally via gnome built in StScrollView this keeps it unobtrusive across all supported resolutions

### solid dark background no animations

the popup uses a solid dark background color #1c1c1e for maximum readability no blur or transparency effects the popup appears instantly with no fade-in or slide animation this is intentional instant response feels fast extensions that animate feel slow

## gnome shell version support

### supported versions

spotlight supports gnome shell 45 46 47 48 49 and 50 listed in metadata.json under shell-version

the minimum is 45 because gnome shell 45 switched to es modules import export syntax extensions using es modules cannot run on gnome shell 44 or earlier there is no way around this it is a hard requirement of the javascript engine

see https://gjs.guide/extensions/upgrading/gnome-shell-45.html#esm

### no x11 support

gnome shell 50 removed x11 support entirely spotlight does not support x11 on any version if you are on x11 use gnome's overview search instead do not add x11 compatibility code x11 is deprecated and will be removed from gnome shell entirely in future releases

### wayland only

spotlight is tested on wayland only the keybinding uses `global.display.grab_accelerator` which works on both wayland and x11 in theory but since we do not support x11 we do not test on it

### version-specific api notes

the codebase calls `set_vertical(true)` after `_init()` for st box layouts not `orientation: Clutter.Orientation.VERTICAL` inside the constructor the `orientation` property is not reliably settable on gnome shell 45 and 46 a real user report hit `Error: No property orientation` when the constructor tried to set it

`vertical` and `set_vertical()` are confirmed to exist across the full 45 through 50 range so this is the correct choice do not switch back to `orientation` in the constructor without first confirming it against the actual minimum supported version not just the newest one

similarly `St.BoxLayout` has no `spacing` gobject property and no `set_spacing()` method spacing must be set via css using the `style` property for example `box.style = 'spacing: 10px;'` real user reports hit both `Error: No property spacing on StBoxLayout` and `TypeError: set_spacing is not a function` always use css for spacing

also `padding_top` `padding_bottom` `margin_top` `margin_bottom` and other box model properties are css properties not gobject properties they must be set via the `style` property not in the constructor real user report hit `Error: No property padding_top on StBoxLayout`

general rule if a property sounds like css it probably is css use `actor.style = 'property: value;'` not constructor properties only use constructor properties that are explicitly documented in the official st or clutter api docs

keybinding validation in preferences uses two layers first require at least one modifier to prevent bare keys like g or space that would cause accidental triggering during typing second validate via `Gtk.accelerator_valid(keyval, modifiers)` which rejects modifier only keys and other invalid combinations note `Gtk.accelerator_valid` does not reject bare alphanumeric keys it only rejects modifier only keys so the manual modifier check is still required

### single package for all versions

ego supports multi-versioning where you upload separate zips for different gnome versions spotlight does not do this one zip works on all supported versions if a future gnome version breaks something fix it in the same codebase do not maintain a fork

## architecture

### three separate popups search clipboard and emoji

spotlight has three independent popup windows

- main spotlight popup search only contains the search bar no mode buttons
- clipboard popup dedicated standalone window for clipboard history opened via shortcut
- emoji popup dedicated standalone window for emoji picker opened via shortcut

the main popup is search only keyboard shortcuts open dedicated feature popups directly

### spotlight is first-class overview search is second-class

on enable spotlight permanently steals the overview's search entry and search controller and hides them overview search is gone for as long as spotlight is enabled the overview itself stays functional window picker app grid workspaces only its search ui is permanently hijacked

when the popup opens spotlight reparents the already-stolen widgets into its popup when the popup closes spotlight removes them from the popup but keeps them stolen and hidden they are only returned to the overview on disable

this is achieved through two methods on SpotlightPopup

- `stealOverviewSearch()` called once from extension.enable()
- `returnOverviewSearch()` called once from extension.disable()

the popup open and close methods only reparent widgets between our content box and a hidden state they never return widgets to the overview

### file layout

```
spotlight/
    extension.js              entry point constructs popups delegates to modules
    prefs.js                  preferences entry point
    spotlightPopup.js         main search popup open close destroy lifecycle
    stylesheet.css            spotlight styling
    metadata.json             extension metadata
    popup/                    popup components split for maintainability
        overviewSearch.js     steals and returns overview search widgets
        themeManager.js       theme detection and application
        popupBackdrop.js      transparent click outside detection
        popupPositioner.js    positions centers and shows the popup
        clipboardPopup.js     standalone clipboard history popup
        emojiPopup.js         standalone emoji picker popup
        clipboardView.js      clipboard history list view
        emojiView.js          emoji selector grid view
    services/
        prefixedSettings.js   shared utility wraps Gio.Settings with key prefix
        core/
            keybinding.js     keybinding manager
            virtualKeyboard.js virtual input device for paste simulation
        clipboard/
            constants.js      clipboard settings key names
            entry.js          DEPRECATED merged into registry.js
            manager.js        clipboard history tracking deduplication
            registry.js       disk persistence and ClipboardEntry class
            keyboard.js       virtual keyboard helper
            confirmDialog.js  confirmation dialog helper
            stylesheet.css    clipboard-specific styles
        emoji/
            data.js           emoji data loading tagging search popularity
            emojiButton.js    individual emoji button (from upstream, unused)
            emojiCategory.js  emoji category component (from upstream, unused)
            emojiOptionsBar.js skin tone options bar (from upstream, unused)
            emojiSearchItem.js search item (from upstream, unused)
            handlers/sql.js   sqlite handler (from upstream, unused)
            libs/sql.js       sql.js library (from upstream, unused)
            stylesheet.css    emoji-specific styles
    schemas/                  gsettings schema single merged schema
        org.gnome.shell.extensions.spotlight.gschema.xml
    prefs/                    preference pages
        shortcutPage.js
        appearancePage.js
        aboutPage.js
    data/
        emojis.json           bundled emoji data unicode plus keywords
        emojis.db             sqlite database (from upstream, unused)
    locale/                   translation source files gettext
        spotlight.pot         translation template
    scripts/
        build.sh              curl installer downloads from main branch
```

### process isolation

gnome shell extensions run in two processes

- the shell process runs `extension.js` and all root-level js files it has access to `St` `Clutter` `Meta` `Shell` `GLib` `GObject` `Gio` and `Main` it must not import `Gtk` `Gdk` or `Adw` these conflict with clutter
- the preferences process runs `prefs.js` and `prefs/*.js` it has access to `Gtk` `Gdk` `Adw` `Gio` it must not import `St` `Clutter` `Meta` or `Shell` these conflict with gtk

never import a shell-only library in a prefs file or vice versa ego review rejects extensions that violate process isolation see https://gjs.guide/extensions/development/preferences.html

### search providers

spotlight does not implement custom search providers instead it reuses gnome overview's entire search infrastructure by stealing its widgets this automatically gives every search provider registered with gnome

- calculator via gnome-calculator search provider
- applications via Shell.AppSystem
- files via tracker
- settings via gnome-control-center search provider
- system actions via gnome shell built-in provider
- any third-party search providers the user has installed

search priority and behavior are entirely controlled by gnome shell not by spotlight

### signal management

for signals on long lived objects like `global.stage` `global.display` `Shell.AppSystem` that outlive our extension use `connectObject` and `disconnectObject` this is a gnome shell 42 plus api that auto-disconnects all signals connected with a given owner object see https://gjs.guide/extensions/upgrading/gnome-shell-42.html

in `disable()` or `destroy()` we call `disconnectObject(this)` which removes every signal connected with `this` as the owner this prevents signal leaks if you forget to disconnect one manually

for signals connected to short lived widgets like buttons list items that our code destroys plain `connect` is safe because gobject automatically disconnects all signal handlers when the emitting object is finalized verified via https://discourse.gnome.org/t/run-dispose-in-gjs/16722 and official gobject signal documentation

do not use plain `connect` for signals from long lived objects always use `connectObject` for those

### prefixed settings utility

since all features share one gsettings schema feature-specific keys use name prefixes to avoid collisions the `PrefixedSettings` class in `services/prefixedSettings.js` wraps a `Gio.Settings` object and transparently prepends a prefix to every key access

```javascript
import { PrefixedSettings } from '../prefixedSettings.js';
const settings = new PrefixedSettings(baseSettings, 'clipboard-');
settings.get_int('history-size'); // reads schema key clipboard-history-size
settings.set_boolean('private-mode', true); // writes schema key clipboard-private-mode
```

all methods of `Gio.Settings` are proxied `get_boolean` `set_boolean` `get_int` `set_int` `get_string` `set_string` `get_strv` `set_strv` `get_value` `set_value` `connect` `disconnect` `bind` `reset` `has_key`

always use `PrefixedSettings` for feature-specific settings never access prefixed keys directly with string concatenation

### popup positioning

the popup is positioned once in `open()` via `PopupPositioner.showCentered()` based on the empty-state height just the search entry with no results the popup then grows downward from this fixed position as results appear

do not reposition the popup on `notify::allocation` or any other size-change signal doing so causes the popup to shift upward when results grow because the centering math recalculates with the new height and moves the top edge up the user perceives this as the popup drifting from center to upper side

if the monitor geometry changes while the popup is open for example the user changes resolution the popup will be repositioned on next open not live this is acceptable

### input capture and click outside to close

the popup does not use `Main.pushModal` a modal grab swallows pointer events before they reach the stage which makes click-outside detection impossible instead the popup uses two mechanisms working together

first a transparent full-screen reactive `St.Widget` called the backdrop is added to the chrome layer before the popup itself the backdrop covers the entire target monitor and listens for `button-release-event` when the user clicks anywhere outside the popup the click lands on the backdrop and the popup closes the popup sits above the backdrop in the chrome stack so clicks on the popup itself are received normally

second the popup monitors `notify::key-focus` on `global.stage` if keyboard focus moves to an actor outside the popup for example via alt-tab the popup closes unless focus moves to a popup-menu which some results open and should not dismiss us

keyboard input is captured by calling `grab_key_focus()` on the search entry which directs all key events to the entry while it holds focus the escape key closes the popup arrow keys move the selection and enter activates the selected result all handled internally by gnome's search widgets

### object lifecycle

every object created in `enable()` is destroyed in `disable()` every widget added to the chrome layer is removed every main loop source is removed every signal is disconnected

the popup widget overrides `destroy()` to call `close()` first which removes the backdrop disconnects the focus handler and removes idle sources then it removes itself from the chrome layer and chains up to the parent destroy

if you add a new widget or source you must add cleanup for it in `disable()` or the relevant destroy method ego review rejects extensions that leak objects

### module-scope restrictions

gnome shell extensions must not create any objects connect any signals add any main loop sources or modify the shell during module initialization this means no `new SomeClass()` no `something.connect()` no `GLib.timeout_add()` at the top level of any js file

the only exception is static data structures like arrays objects maps sets and regexps

see https://gjs.guide/extensions/review-guidelines/review-guidelines.html#only-use-initialization-for-static-resources

## code style

### comments

comments should read like a thoughtful engineer speaking to a colleague across the table not a linter reciting grammar rules the goal is clarity and warmth not mechanical perfection

guiding principles:
- favor lowercase and minimal punctuation as a default baseline it keeps comments visually quiet and scannable
- capitalization and punctuation are not forbidden they are permitted when they genuinely serve clarity proper nouns acronyms code symbols and the occasional question mark or exclamation that captures the right tone are all acceptable
- a stray capital letter or period is better than stilted unreadable prose do not contort sentences to satisfy an absolute rule
- explain why not what the code already shows what it does
- no block comment boxes no jsdoc no `/* */` banners use plain `//` comments only
- no references to other projects or extensions in comments by name
- no llm-smell phrases like "here we" "let's" "we need to" "note that" "important:" "todo" "fixme"
- for obscure or uncommon code provide both what and why for common code provide only why
- provide verified working links whenever possible prefer https://gjs.guide links over blog posts
- maximum three consecutive comment lines without intervening code the fourth line must be code or the structure must be refactored to interleave comments and code comments are annotations not paragraphs

### code structure

- split logic into many small files each with a single responsibility
- keep the entry point `extension.js` as small as possible it should only wire things together
- keep `enable()` and `disable()` next to each other in the entry point for easy review
- one concept per file one file per concept
- prefer pure functions with no side effects in utility files
- no typescript this is plain javascript no build step

### ego verified coding rules

these rules are verified against the official ego review guidelines
source: https://gjs.guide/extensions/review-guidelines/review-guidelines.html
source: https://gjs.guide/extensions/review-guidelines/best-practices.html

#### no `imports.gi.*` use esm
always use es module syntax `import Gio from 'gi://Gio'` never the legacy `imports.gi.Gio`
gnome shell 45 switched to es modules and the legacy syntax is deprecated

#### use `log()` not `console.log`
in the gnome shell process `console` is not a standard global always use `log()` for logging

#### no `run_dispose()` unless absolutely necessary
extensions should not call `GObject.Object.run_dispose()` unless absolutely necessary
if absolutely necessary any call must have a comment explaining the real world situation that makes it a requirement

#### optional chaining `?.` nuanced rule
do not use optional chaining or nullish coalescing for guaranteed methods or built in apis
the ego guideline specifically prohibits redundant checks on objects that are guaranteed to exist
example prohibited: `this._keyboard?.destroy()` where `_keyboard` is always created in the constructor

optional chaining is allowed and encouraged for genuinely potentially null objects
example allowed: `focussedWindow?.get_wm_class()` where `focussedWindow` comes from `tracker.focus_window` which can return null

if an object is guaranteed to exist call it directly without guards
if an object can genuinely be null optional chaining is cleaner than verbose ternary checks

#### avoid unnecessary try catch wrappers
do not wrap standard api calls in try/catch blocks
standard methods like `destroy()` `connect()` `disconnect()` `addChrome()` `set_position()` do not throw
try/catch is legitimate only for genuine external failure points:
- file io loading saving to disk files can be deleted corrupt or permission denied
- json parsing of data that originated outside our code
- clipboard reading content owned by other applications
- settings string values that users could manually edit
when catching always explain why the operation can genuinely fail

#### css uses only `/* */` comments
the st stylesheet parser does not support `//` line comments only `/* */` block comments
this is a technical requirement of the st css parser not a style preference

#### do not mask bugs with defensive code
do not add defensive null checks that mask bugs instead of handling them
do not add "just in case" code for situations that cannot occur
do not add comments that describe what a line does only describe why

### review discipline

- before producing final output read every single line you wrote
- look for potential issues on every line not just the line you are currently editing
- when fixing a bug check whether the same bug pattern exists elsewhere in the codebase
- do not assume a fix works verify it against the actual code

## keybinding

the default shortcut is `Ctrl+Space` stored in gsettings as `['<Control>space']`

`Super+Space` is grabbed by gnome shell for input source switching on some setups and `grab_accelerator` fails silently when this happens use `Ctrl+Space` instead users can change it in preferences

the keybinding uses `global.display.grab_accelerator()` not `Main.wm.addKeybinding()` because `addKeybinding` can fail if the schema is not ready at enable time `grab_accelerator` is more reliable

the popup can be closed in three ways pressing the toggle shortcut again pressing `Escape` or clicking outside the popup bounds

clipboard history opens via its own dedicated shortcut default Alt 1
emoji picker opens via its own dedicated shortcut default Alt 2

see the `keybinding.js` file for the implementation

## gsettings schema

the schema id is `org.gnome.shell.extensions.spotlight` and the path is `/org/gnome/shell/extensions/spotlight/` both follow the gnome shell extension convention

the schema file is `schemas/org.gnome.shell.extensions.spotlight.gschema.xml` the filename must match the schema id pattern

the `gschemas.compiled` binary is not shipped in the zip gnome shell 44 and later compiles schemas automatically on install shipping the compiled binary is unnecessary

see https://gjs.guide/extensions/development/preferences.html#gsettings

### schema keys

all keys live in a single merged schema `org.gnome.shell.extensions.spotlight` feature-specific keys use name prefixes

core spotlight keys
- `toggle-shortcut` type `as` default `['<Control>space']` keyboard shortcut to open and close the popup
- `theme-preference` type `s` default `'default'` controls visual theme
  - `'default'` follows gnome system color scheme via `org.gnome.desktop.interface color-scheme`
  - `'dark'` always uses dark appearance
  - `'light'` always uses light appearance
- `clipboard-shortcut` type `as` default `['<Alt>1']` keyboard shortcut to open clipboard popup
- `emoji-shortcut` type `as` default `['<Alt>2']` keyboard shortcut to open emoji popup

clipboard keys prefixed with `clipboard-` accessed via `PrefixedSettings(settings, 'clipboard-')`
- `clipboard-history-size` type `i` default `20` range `5-100` maximum number of clipboard entries
- `clipboard-paste-on-select` type `b` default `false` automatically paste after selecting entry
- `clipboard-strip-text` type `b` default `true` strip whitespace from text entries
- `clipboard-private-mode` type `b` default `false` do not track clipboard history
- `clipboard-move-item-first` type `b` default `true` move selected entry to top of history
- `clipboard-notify-on-copy` type `b` default `true` show notification on copy
- `clipboard-confirm-on-clear` type `b` default `true` confirm before clearing history
- `clipboard-cache-only-favorite` type `b` default `false` only persist favorites to disk
- `clipboard-excluded-apps` type `as` default `[]` wm classes to exclude from tracking
- plus 30+ more clipboard settings see schema xml for complete list

emoji keys prefixed with `emoji-` accessed via `PrefixedSettings(settings, 'emoji-')`
- `emoji-emojisize` type `i` default `24` emoji grid size in pixels
- `emoji-nbcols` type `i` default `8` number of columns in emoji grid
- `emoji-skin-tone` type `i` default `0` range `0-5` default skin tone
- `emoji-gender` type `i` default `0` range `0-2` default gender
- `emoji-paste-on-select` type `b` default `true` paste after selecting emoji
- `emoji-keep-open` type `b` default `false` keep emoji picker open after selection
- `emoji-recently-used` type `as` default `[]` recently used emojis

## appearance theme

the popup supports three theme modes controlled by the `theme-preference` gsettings key

dark is the default stylesheet colors background `#1c1c1e` text `#f5f5f7` selection `rgba(255,255,255,0.12)`

light mode is applied by adding the `theme-light` style class to the content container
light colors background `#ffffff` text `#1d1d1f` selection `rgba(0,122,255,0.12)`

the theme class is applied in `_applyTheme()` called from `_doOpen()` before the popup is shown

theme is determined once at open time it does not update live if the system theme changes while the popup is open

## multi monitor behavior

the popup always opens on the monitor where the cursor currently sits

`PopupPositioner.getTargetMonitor()` calls `global.get_pointer()` and checks which monitor rectangle contains the cursor coordinates

falls back to `Main.layoutManager.primaryMonitor` if cursor position cannot be determined

the backdrop covers only the target monitor users on other monitors can interact normally

## testing

### static analysis

run the ego-style static analyzer to check for module-scope issues deprecated imports process isolation violations and metadata well-formedness

the analyzer is not shipped with the extension it lives in the development environment if you do not have it use `gjs -c` to parse each file

```bash
gjs -c "Reflect.parse(readFile('extension.js'), { target: 'module' })"
```

### schema validation

compile the schema to verify the xml is valid

```bash
glib-compile-schemas schemas/
```

### syntax check

every js file must parse as an es module if any file has a syntax error gnome shell will fail to load the extension silently

### manual testing

test on gnome shell 50 wayland first then test on at least one older version if possible the extension should work identically across all supported versions
