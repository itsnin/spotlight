# agents guide for spotlight

this file is the single source of truth for any person ai or agent working on this extension read it fully before touching any code it covers design philosophy architecture gnome version support code style ego review constraints and the why behind every non-obvious decision

if you are an ai agent read the whole file do not skim

## what this extension is

spotlight is a compact launcher for gnome shell inspired by macos spotlight you press a shortcut a centered popup appears you type and results show up in real time it searches apps does math controls the system jumps to gnome settings panels and falls back to web search

the goal is to feel like macos spotlight not look like a gnome shell extension that means dark compact rounded no blur no overlay no border line just a floating input box with results below it

## design philosophy

### minimal ui no chrome

the popup has no title bar no close button no backdrop overlay clicking outside or pressing escape closes it the popup floats above all windows via the chrome layer it does not steal focus from the desktop in a destructive way it uses a modal grab to capture keyboard input while open and releases it on close

### dark not black

the background is `#1c1c1e` not pure black pure black looks harsh on oled and wrong on ips the text is `#f5f5f7` not pure white to reduce eye strain selection uses `rgba(255,255,255,0.12)` a subtle white overlay not the gnome blue accent this matches the macos spotlight dark appearance

### compact not full screen

the popup is 600px wide by default centered on the primary monitor it grows downward as results appear but never exceeds 400px in results height after which it scrolls this keeps it unobtrusive

### no blur no animations

gnome shell's blur effect is expensive on some hardware and adds visual noise spotlight does not use it the popup appears instantly with no fade-in or slide animation this is intentional macos spotlight is fast gnome shell extensions that animate feel slow

## gnome shell version support

### supported versions

spotlight supports gnome shell 45 46 47 48 49 and 50 listed in metadata.json under shell-version

the minimum is 45 because gnome shell 45 switched to es modules (import/export syntax) extensions using es modules cannot run on gnome shell 44 or earlier there is no way around this it is a hard requirement of the javascript engine

see https://gjs.guide/extensions/upgrading/gnome-shell-45.html#esm

### no x11 support

gnome shell 50 removed x11 support entirely spotlight does not support x11 on any version if you are on x11 use gnome's overview search instead do not add x11 compatibility code x11 is deprecated and will be removed from gnome shell entirely in future releases

### wayland only

spotlight is tested on wayland only the keybinding uses `global.display.grab_accelerator` which works on both wayland and x11 in theory but since we do not support x11 we do not test on it

### version-specific api notes

the codebase calls `set_vertical(true)` after `_init()` for st box layouts not `orientation: Clutter.Orientation.VERTICAL` inside the constructor the `orientation` property is not reliably settable on gnome shell 45 and 46 a real user report (issue #5 gnome shell 46.0 on ubuntu 24.04.4) hit `Error: No property orientation on Gjs_spotlight_nin_spotlightPopup_SpotlightPopup` when the constructor tried to set it

`vertical` and `set_vertical()` are confirmed to exist across the full 45 through 50 range so this is the correct choice do not switch back to `orientation` in the constructor without first confirming it against the actual minimum supported version not just the newest one

### single package for all versions

ego supports multi-versioning where you upload separate zips for different gnome versions spotlight does not do this one zip works on all supported versions if a future gnome version breaks something fix it in the same codebase do not maintain a fork

## architecture

### file layout

```
spotlight@nin/
    extension.js              entry point
    prefs.js                  preferences entry point
    spotlightPopup.js         main popup widget
    searchEntry.js            search input box
    resultsContainer.js       scrollable results area
    resultRow.js              single result row
    sectionHeader.js          section header label
    sectionTitles.js          result type to title mapping
    noResults.js              empty state widget
    appSearch.js              app search provider
    calculatorSearch.js       calculator provider
    systemActionsSearch.js    system actions provider
    settingsSearch.js         gnome settings provider
    webSearch.js              web search fallback
    searchController.js       orchestrates all providers
    keybinding.js             keybinding manager
    calculator.js             arithmetic parser
    stylesheet.css            spotlight styling
    metadata.json             extension metadata
    schemas/                  gsettings schema
    prefs/                    preference pages
        shortcutPage.js
        appearancePage.js
        webSearchPage.js
        aboutPage.js
```

### process isolation

gnome shell extensions run in two processes

- the shell process runs `extension.js` and all root-level js files it has access to `St` `Clutter` `Meta` `Shell` `GLib` `GObject` `Gio` and `Main` it must not import `Gtk` `Gdk` or `Adw` these conflict with clutter

- the preferences process runs `prefs.js` and `prefs/*.js` it has access to `Gtk` `Gdk` `Adw` `Gio` it must not import `St` `Clutter` `Meta` or `Shell` these conflict with gtk

never import a shell-only library in a prefs file or vice versa ego review rejects extensions that violate process isolation see https://gjs.guide/extensions/development/preferences.html

### search priority

results are combined in this order apps first then calculator then system actions then settings then web last web search only appears if nothing else matched this is intentional apps are the primary feature everything else is a fallback

the priority is set in `searchController.js` do not change it without reason

### signal management

all signal connections on gobjects use `connectObject` and `disconnectObject` not `connect` and `disconnect` this is a gnome shell 42+ api that auto-disconnects all signals connected with a given owner object see https://gjs.guide/extensions/upgrading/gnome-shell-42.html

in `disable()` or `destroy()` we call `disconnectObject(this)` which removes every signal connected with `this` as the owner this prevents signal leaks if you forget to disconnect one manually

a few connections use plain `connect` with manual disconnect instead of `connectObject`

- `global.display.connect('accelerator-activated')` in `keybinding.js` disconnected manually in `disable()`
- `global.stage.connect('notify::key-focus')` in `spotlightPopup.js` for focus-loss detection disconnected manually in `close()`
- `global.stage.connect('captured-event')` in `spotlightPopup.js` for stage-level key capture disconnected manually in `close()`

each of these tracks its own handler id in an instance field and disconnects it explicitly rather than relying on `disconnectObject(this)` if you add a new connection on `global.display` or `global.stage` follow the same pattern track the id and disconnect it manually do not assume `connectObject` covers it without checking first

### popup positioning

the popup is positioned once in `open()` via `_reposition()` based on the empty-state height just the search entry with no results the popup then grows downward from this fixed position as results appear

do not reposition the popup on `notify::allocation` or any other size-change signal doing so causes the popup to shift upward when results grow because the centering math recalculates with the new height and moves the top edge up the user perceives this as the popup drifting from center to upper side

if the monitor geometry changes while the popup is open for example the user changes resolution the popup will be repositioned on next open not live this is acceptable

### input capture and click outside to close

the popup does not use `Main.pushModal` a modal grab swallows pointer events before they reach the stage which makes click-outside detection impossible instead the popup uses two mechanisms working together

first a transparent full-screen reactive `St.Widget` called the backdrop is added to the chrome layer before the popup itself the backdrop covers the entire primary monitor and listens for `button-release-event` when the user clicks anywhere outside the popup the click lands on the backdrop and the popup closes the popup sits above the backdrop in the chrome stack so clicks on the popup itself are received normally

second the popup monitors `notify::key-focus` on `global.stage` if keyboard focus moves to an actor outside the popup for example via alt-tab the popup closes this is deferred via an idle source to avoid firing during the initial `grab_key_focus` call in `open()`

keyboard input is captured by calling `grab_key_focus()` on the search entry which directs all key events to the entry while it holds focus the escape key closes the popup arrow keys move the selection and enter activates the selected result

### object lifecycle

every object created in `enable()` is destroyed in `disable()` every widget added to the chrome layer is removed every main loop source is removed every signal is disconnected

the popup widget overrides `destroy()` to call `close()` first which removes the backdrop disconnects the focus handler and removes idle sources then it removes itself from the chrome layer and chains up to the parent destroy

if you add a new widget or source you must add cleanup for it in `disable()` or the relevant destroy method ego review rejects extensions that leak objects

### module-scope restrictions

gnome shell extensions must not create any objects connect any signals add any main loop sources or modify the shell during module initialization this means no `new SomeClass()` no `something.connect()` no `GLib.timeout_add()` at the top level of any js file

the only exception is static data structures like arrays objects maps sets and regexps

see https://gjs.guide/extensions/review-guidelines/review-guidelines.html#only-use-initialization-for-static-resources

`systemActionsSearch.js` calls `SystemActions.getDefault()` lazily inside each `activate()` arrow function not at module scope this is why the `SYSTEM_ACTIONS` array contains arrow functions that call `getDefault()` at invocation time not a module-level singleton variable

## code style

### comments

- all comments are lowercase no exceptions unless a capital letter is required to preserve meaning for example `curl -fsSL` must keep the capital `S` and `L` because they are case-sensitive flags
- no punctuation in comments no periods no commas no exclamation marks no question marks unless punctuation changes meaning
- explain why not what the code already shows what it does
- no block comment boxes no jsdoc no `/* */` banners use plain `//` comments only
- no references to other projects or extensions in comments
- no llm-smell phrases like "here we" "let's" "we need to" "note that" "important:" "todo" "fixme"
- for obscure or uncommon code provide both what and why for common code provide only why
- provide verified working links whenever possible prefer https://gjs.guide links over blog posts

### code structure

- split logic into many small files each with a single responsibility
- keep the entry point `extension.js` as small as possible it should only wire things together
- keep `enable()` and `disable()` next to each other in the entry point for easy review
- one concept per file one file per concept
- prefer pure functions with no side effects in utility files
- no typescript this is plain javascript no build step

### anti ai-code smells

- do not wrap standard api calls in try/catch blocks
- do not use try/catch to silence errors that should never happen return null instead
- do not use optional chaining `?.` or nullish coalescing `??` for methods that are guaranteed to exist
- do not add defensive null checks that mask bugs instead of handling them
- do not add "just in case" code for situations that cannot occur
- do not add comments that describe what a line does only describe why

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

see the `keybinding.js` file for the implementation

## clipboard access

spotlight writes to the clipboard when a calculator result is activated see `calculatorSearch.js` for where this happens the comment on that line is the disclosure

`metadata.json`'s description mentions this in passing as a feature not as a separate compliance section ego review requires the description to state that clipboard access occurs a plain reviewer passes this without needing a defense of why or reassurance about third parties do not add one

see https://gjs.guide/extensions/review-guidelines/review-guidelines.html#clipboard-access-must-be-declared

## gsettings schema

the schema id is `org.gnome.shell.extensions.spotlight` and the path is `/org/gnome/shell/extensions/spotlight/` both follow the gnome shell extension convention

the schema file is `schemas/org.gnome.shell.extensions.spotlight.gschema.xml` the filename must match the schema id pattern

the `web-search-engine` key uses `<choices>` not `<enum>` because the code reads and writes it as a string with `get_string()` and `set_string()` using an enum would require `get_enum()` and `set_enum()` instead

the `gschemas.compiled` binary is not shipped in the zip gnome shell 44 and later compiles schemas automatically on install shipping the compiled binary is unnecessary

see https://gjs.guide/extensions/development/preferences.html#gsettings

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

## adding a new search provider

1. create a new file at the root level for example `mySearch.js`
2. export a function that takes a query string and returns an array of result objects
3. each result object needs `type` `title` `icon` and `activate` properties
4. import your new provider in `searchController.js`
5. add it to the `runSearch` function in the correct priority order
6. add the type string to `sectionTitles.js` if you want a custom section header
7. do not create any module-scope instances use lazy calls inside callbacks

## adding a new ui component

1. create a new file at the root level for example `myWidget.js`
2. export a function that builds and returns the widget
3. import it in `spotlightPopup.js` where needed
4. use `connectObject` for all signal connections
5. ensure the widget is destroyed when the popup is destroyed

## contacts

- repository https://github.com/itsnin/spotlight
- security issues email ninx.sh@gmail.com
- ego page search for spotlight by nin

## license

gpl-3.0-or-later see the LICENSE file

this is compatible with gnome shell's gpl-2.0-or-later requirement
