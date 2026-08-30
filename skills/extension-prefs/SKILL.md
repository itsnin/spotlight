---
name: extension-prefs
description: Preferences window implementation using GTK4 and Adwaita. Covers fillPreferencesWindow, process isolation, and common widget patterns.
---

# preferences

## process isolation

prefs run in a completely separate gtk process not the gnome shell process

allowed: `Adw` `Gtk` `Gdk` `Gio`
forbidden: `St` `Clutter` `Meta` `Shell`

## implement fillPreferencesWindow

this is the recommended method for gnome 42+

```javascript
import Adw from 'gi://Adw';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class ExamplePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Appearance'),
        });
        page.add(group);

        const row = new Adw.SwitchRow({
            title: _('Show Indicator'),
            subtitle: _('Whether to show the panel indicator'),
        });
        group.add(row);

        window._settings = this.getSettings();
        window._settings.bind('show-indicator', row, 'active',
            Gio.SettingsBindFlags.DEFAULT);
    }
}
```

## common adw widgets

- `Adw.PreferencesPage` — a page in the window
- `Adw.PreferencesGroup` — a group of related rows
- `Adw.SwitchRow` — boolean toggle row
- `Adw.SpinRow` — numeric spinner row
- `Adw.EntryRow` — text entry row
- `Adw.ComboRow` — dropdown selection row
- `Adw.ActionRow` — generic row with activatable action

## binding settings

use `Gio.Settings.bind()` to connect settings keys directly to widget properties

```javascript
this._settings.bind('key-name', widget, 'widget-property',
    Gio.SettingsBindFlags.DEFAULT);
```

## debugging prefs

prefs logs appear in the gjs process not gnome shell

```bash
journalctl -f -o cat /usr/bin/gjs
```

## directory layout

prefs specific modules should reside inside a `prefs/` directory to make process isolation obvious to reviewers

files shared between shell and prefs must never import from either forbidden library list

## source

extracted from gjs.guide preferences documentation verified via docs-gnome-extension repo
