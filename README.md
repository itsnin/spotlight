# spotlight

a compact launcher for gnome shell 50

**repo:** https://github.com/itsnin/spotlight
**version:** release 30.7.2026

## shortcut

ctrl + space

<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/73934211-7584-4c00-a5b2-27dd88a6235b" />
<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/dde58067-3945-4b8e-ad26-89c13d60cb6b" />
<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/7529d643-d96b-4382-9d0e-085f35d90ccb" />
<img width="1366" height="768" alt="screenshot" src="https://github.com/user-attachments/assets/53ed78a5-d143-4cac-9438-fa5175c34d00" />

## what it does

type something and spotlight searches in this order

1. **apps** - the main feature type an app name or abbreviation and press enter to launch it uses fuzzy matching so ffx finds firefox
2. **calculator** - type math like 12 * 8 + 3 and press enter to copy the result to your clipboard
3. **system actions** - type lock suspend restart shutdown or logout to control your system via dbus
4. **settings** - type wifi bluetooth display etc to jump straight to that gnome settings panel
5. **web search** - if nothing else matches you get a web search link as a last resort

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
gnome-extensions install ~/Downloads/spotlight@ninx.zip
#then log out and back in if you are on wayland
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

the codebase is split into 22 modular javascript files across 5 directories following the pattern used by mature extensions like dash-to-dock

```
spotlight/
├── extension.js              entry point (60 lines)
├── prefs.js                  preferences window entry point (29 lines)
├── ui/                       popup widget and all ui components
│   ├── spotlightPopup.js     main popup widget
│   ├── searchEntry.js        search entry with icon
│   ├── resultsContainer.js   scrollable results area
│   ├── resultRow.js          single result row builder
│   ├── sectionHeader.js      section header label
│   ├── sectionTitles.js      title mapping
│   └── noResults.js          empty state widget
├── search/                   individual search providers one per file
│   ├── appSearch.js          fuzzy app search via shell appsystem
│   ├── calculatorSearch.js   arithmetic evaluator
│   ├── systemActionsSearch.js dbus system actions (lock suspend restart etc)
│   ├── settingsSearch.js     gnome settings panel search
│   └── webSearch.js          web search fallback
├── services/                 core services
│   ├── searchController.js   orchestrates all search providers
│   └── keybinding.js         keybinding manager via mutter
├── utils/                    utility functions
│   ├── calculator.js         recursive descent arithmetic parser
│   └── fuzzyMatcher.js       fuzzy string matching with scoring
├── preferences/              individual preference pages
│   ├── shortcutPage.js       keyboard shortcut configuration
│   ├── appearancePage.js     popup width and max results
│   ├── webSearchPage.js      search engine picker
│   └── aboutPage.js          about section
├── stylesheet.css            dark theme styling
├── metadata.json             extension metadata
└── schemas/                  gsettings schema
```

each file has a single responsibility making the code easy to review and maintain

## design

- dark gray background #1c1c1e not pure black
- very rounded corners 32px on popup 16px on rows
- subtle white overlay for selected items not blue
- no blur no backdrop no border line
- always centered on the primary monitor
- compact 600px wide

## license

gpl-3.0-or-later see the license file
