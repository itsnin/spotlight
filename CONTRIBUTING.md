# contributing to spotlight

thanks for your interest in contributing to spotlight

## prerequisites

- gnome shell 50
- a text editor with es module support
- basic knowledge of javascript and gnome shell extension apis

## getting started

1. clone the repository

```bash
git clone https://github.com/itsnin/spotlight.git
cd spotlight
```

2. copy the extension to your local extensions directory to test

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/spotlight@ninx
cp -r * ~/.local/share/gnome-shell/extensions/spotlight@ninx/
glib-compile-schemas ~/.local/share/gnome-shell/extensions/spotlight@ninx/schemas/
```

3. restart gnome shell and enable the extension

```bash
gnome-extensions enable spotlight@ninx
```

## project structure

all 22 javascript files are at the root level in a flat structure this is required by the gnome extensions website which looks for extension.js at the root of the zip

### entry points

- `extension.js` — main entry point creates the popup and registers the keybinding
- `prefs.js` — preferences window entry point imports the preference pages

### ui components

these files build the visual elements of the popup

- `spotlightPopup.js` — the main popup widget handles open close search rendering and keyboard navigation
- `searchEntry.js` — search entry box with magnifying glass icon
- `resultsContainer.js` — scrollable results area
- `resultRow.js` — builds a single result row with icon title and click handling
- `sectionHeader.js` — section header label for categorizing results
- `sectionTitles.js` — maps result types to display titles
- `noResults.js` — empty state widget shown when search returns nothing

### search providers

each search type lives in its own file and exports a function that takes a query string and returns an array of result objects

- `appSearch.js` — fuzzy app search via shell appsystem
- `calculatorSearch.js` — arithmetic evaluation and clipboard copy
- `systemActionsSearch.js` — dbus system actions lock suspend restart etc
- `settingsSearch.js` — gnome settings panel search
- `webSearch.js` — web search fallback

### services

- `searchController.js` — orchestrates all search providers and combines results in priority order
- `keybinding.js` — keybinding manager using mutter grab_accelerator

### utilities

pure functions with no side effects

- `calculator.js` — recursive descent arithmetic parser
- `fuzzyMatcher.js` — fuzzy string matching with scoring

### preference pages

each preference page is in its own file

- `shortcutPage.js` — keyboard shortcut configuration
- `appearancePage.js` — popup width and max results
- `webSearchPage.js` — search engine picker
- `aboutPage.js` — about section

## code style

- all comments must be lowercase with no punctuation
- no block comment boxes or jsdoc blocks use plain `//` comments only
- explain why not what
- do not wrap standard api calls in try-catch blocks
- do not use optional chaining for guaranteed methods
- keep enable and disable next to each other in the entry point
- split logic into modules keep the entry point small
- no references to other extensions in comments or code
- this is a plain javascript project no typescript no build step

## adding a new search provider

1. create a new file at the root level for example `mySearch.js`
2. export a function that takes a query string and returns an array of result objects
3. each result object needs `type` `title` `icon` and `activate` properties
4. import your new provider in `searchController.js`
5. add it to the `runSearch` function in the correct priority order
6. add the type string to `sectionTitles.js` if you want a custom section header

## adding a new ui component

1. create a new file at the root level for example `myWidget.js`
2. export a function that builds and returns the widget
3. import it in `spotlightPopup.js` where needed

## testing before submitting

run shexli to check for review issues

```bash
pip install shexli
shexli path/to/extension
```

the result should be 0 errors and 0 warnings

also test with gjs to make sure the code parses

```bash
gjs -c "Reflect.parse(readFile('extension.js'), { target: 'module' })"
```

## submitting changes

1. make your changes following the code style above
2. test locally on gnome shell 50
3. run shexli and fix any issues
4. run gjs parse and fix any errors
5. open a pull request with a clear description of what you changed and why

## reporting bugs

open an issue on github with
- gnome shell version
- distro
- steps to reproduce
- expected behavior vs actual behavior
- any relevant logs from `journalctl -b /usr/bin/gnome-shell | grep spotlight`
