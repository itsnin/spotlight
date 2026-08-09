# spotlight

a compact launcher for gnome shell 50 inspired by macos spotlight

**repo:** https://github.com/itsnin/spotlight
**version:** 30.7.2026

## shortcut

ctrl + space

<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/73934211-7584-4c00-a5b2-27dd88a6235b" />
<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/dde58067-3945-4b8e-ad26-89c13d60cb6b" />
<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/7529d643-d96b-4382-9d0e-085f35d90ccb" />
<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/53ed78a5-d143-4cac-9438-fa5175c34d00" />

## what it does

type something and spotlight searches in this order

1. **apps** — the main feature type an app name or abbreviation and press enter to launch it uses fuzzy matching so ffx finds firefox
2. **calculator** — type math like 12 * 8 + 3 and press enter to copy the result to your clipboard
3. **system actions** — type lock suspend restart shutdown logout or switch user to control your system
4. **settings** — type wifi bluetooth display etc to jump straight to that gnome settings panel
5. **web search** — if nothing else matches you get a web search link as a last resort

## how to use

open it with ctrl + space then just start typing

| what you want | what to do |
|---|---|
| open spotlight | ctrl + space |
| launch an app | type the name or abbreviation then enter |
| do math | type the expression then enter |
| lock screen | type lock then enter |
| open wifi settings | type wifi then enter |
| search the web | type something with no app matches then enter |
| move up down | arrow keys |
| close | esc |

## install

```bash
#Install [GNOME Shell Extension Manager](https://mattjakeman.com/apps/extension-manager/)
gnome-extensions install ~/Downloads/spotlight@ninx.zip
# then log out and back in if you are on wayland
gnome-extensions enable spotlight@ninx
```

or install manually

```bash
cd ~/Downloads
unzip spotlight@ninx.zip -d spotlight@ninx
mkdir -p ~/.local/share/gnome-shell/extensions/
mv spotlight@ninx ~/.local/share/gnome-shell/extensions/
```

then log out and back in and run

```bash
gnome-extensions enable spotlight@ninx
```

## preferences

open with

```bash
gnome-extensions prefs spotlight@ninx
```

you can change
- the keyboard shortcut
- popup width
- max results per category
- web search engine
- toggle web search on or off

## architecture

the codebase is 22 modular javascript files 18 at the root level for the shell process and 4 inside `prefs/` for the preferences process the flat structure is required by the gnome extensions website which looks for extension.js at the root of the zip the prefs files live in their own directory because they run in a separate gtk process and must not import shell-only libraries like st clutter meta or shell

each file has a single responsibility

| file | what it does |
|---|---|
| `extension.js` | entry point creates popup and registers keybinding |
| `prefs.js` | preferences window entry point |
| `spotlightPopup.js` | main popup widget handles open close search rendering |
| `searchEntry.js` | search entry with magnifying glass icon |
| `resultsContainer.js` | scrollable results area |
| `resultRow.js` | builds a single result row with icon and text |
| `sectionHeader.js` | section header label |
| `sectionTitles.js` | maps result types to display titles |
| `noResults.js` | empty state widget |
| `appSearch.js` | fuzzy app search via shell appsystem |
| `calculatorSearch.js` | arithmetic evaluation and clipboard copy |
| `systemActionsSearch.js` | system actions lock suspend restart etc, via the shell's SystemActions singleton |
| `settingsSearch.js` | gnome settings panel search |
| `webSearch.js` | web search fallback |
| `searchController.js` | orchestrates all search providers combines results |
| `keybinding.js` | keybinding manager using mutter grab_accelerator |
| `calculator.js` | recursive descent arithmetic parser |
| `fuzzyMatcher.js` | fuzzy string matching with scoring |
| `prefs/shortcutPage.js` | keyboard shortcut configuration |
| `prefs/appearancePage.js` | popup width and max results |
| `prefs/webSearchPage.js` | search engine picker |
| `prefs/aboutPage.js` | about section |

## design

- dark gray background #1c1c1e not pure black
- very rounded corners 32px on popup 16px on rows
- subtle white overlay for selected items not blue
- no blur no backdrop no border line
- always centered on the primary monitor
- compact 600px wide

## license

gpl-3.0-or-later see the license file
