# agents guide for spotlight

read this file before touching code it covers architecture design decisions code style and ego review constraints

## supplementary skills

the skills directory contains focused single topic skill files extracted from official gjs guide documentation these are reference material this file remains the single source of truth for project specific rules

actual skills available:
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

## what this extension is

spotlight is a compact launcher for gnome shell press a shortcut a centered translucent glass popup appears type and results show up in real time it permanently steals the overview search widgets overview itself stays functional only its search ui is replaced

## supported versions

gnome shell 45 46 47 48 49 50 listed in metadata.json under shell-version minimum is 45 because gnome shell 45 switched to es modules

wayland only x11 is not supported gnome shell 50 removed x11 entirely

## architecture

one popup permanently steals overview search entry and controller widgets are stolen once in enable returned once in disable open and close only reparent widgets between our content box and hidden state they never return to overview while extension is enabled

file layout:
- extension.js entry point
- lib/ui/ user interface components
- lib/core/ core infrastructure
- prefs.js prefs entry point
- prefs/ preference pages
- schemas/ gsettings schema
- scripts/ installer
- stylesheet.css styling

## process isolation

shell process runs extension.js and lib files it must not import Gtk Gdk Adw
prefs process runs prefs.js and prefs files it must not import St Clutter Meta Shell
ego review rejects violations

## signal management

use connectObject with this as owner disconnectObject this in destroy or disable cleans all
use plain connect with explicit id tracking only for signals that must persist across open close cycles

## popup positioning

positioned once at open based on empty state height grows downward from fixed anchor never reposition on size changes it causes visible drift

## click outside detection

transparent full screen st widget in chrome layer behind popup backdrop covers target monitor listens for button release event popup sits above backdrop in stack so clicks on popup work normally

## popup close mechanisms

popup closes on toggle shortcut escape click outside plus comprehensive activation close defense:
1. button press event on search results catches mouse clicks on any result
2. enter or space key capture when focus is on result buttons not entry
3. global display notify focus window tracks external app focus at window manager level

## object lifecycle

every object created in enable destroyed in disable every widget added to chrome removed every main loop source removed every signal disconnected if you add something add cleanup ego review rejects leaks

## module scope restrictions

no objects no signals no main loop sources at top level of any js file only static data structures arrays objects maps sets regexps are allowed

## code style

comments explain why not what lowercase minimal punctuation no block comment boxes no jsdoc no references to other projects no llm phrases like here we lets note that important todo fixme maximum three consecutive comment lines without code

enable and disable adjacent in extension.js split logic into small files each with single responsibility no typescript plain javascript no build step

## ego verified rules

no imports.gi use esm import gi name
console api with appropriate levels debug warn error not bare log
no run_dispose unless absolutely necessary
optional chaining only for genuinely potentially null objects never for guaranteed objects
no try catch around standard api calls only for file io json parsing external data
css only block comments never line comments
no defensive null checks that mask bugs

## keybinding

default shortcut ctrl space stored as control space super space is grabbed by gnome shell for input source switching on some setups
uses global display grab accelerator not main wm addKeybinding because addKeybinding can fail if schema not ready at enable time

## gsettings schema

schema id org.gnome.shell.extensions.spotlight path org gnome shell extensions spotlight
gschemas.compiled is not shipped gnome shell 44 plus compiles automatically on install

keys:
- toggle-shortcut type as default control space
- theme-preference type s default default dark light

## appearance theme

three modes controlled by theme preference gsettings key
dark default rgba 28 28 30 0 85 text f5f5f7
light rgba 255 255 255 0 88 text 1d1d1f
theme light class added to content container for light mode
applied in applyTheme called from doOpen before showing
when preference is default listens to org gnome desktop interface changed color scheme and updates live while open

## multi monitor

popup opens on monitor where cursor currently sits getTargetMonitor calls global get_pointer checks which monitor rectangle contains cursor coordinates falls back to primary monitor backdrop covers only target monitor users on other monitors can interact normally

## testing

every js file must parse as es module
schema must compile with glib compile schemas
test on gnome shell 50 wayland first
