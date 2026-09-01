// spotlight - appearance preferences page
// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

const THEMES = [
    { value: 'default', label: 'Default', subtitle: 'Follow GNOME system style' },
    { value: 'dark', label: 'Dark', subtitle: 'Always use dark appearance' },
    { value: 'light', label: 'Light', subtitle: 'Always use light appearance' },
];

export function buildAppearancePage(settings) {
    const groups = [];

    const appearanceGroup = new Adw.PreferencesGroup({
        title: 'Appearance',
        description: 'Visual theme for the Spotlight popup',
    });

    const themeRow = new Adw.ComboRow({
        title: 'Theme',
        subtitle: 'Dark, light, or follow system',
    });
    const list = new Gtk.StringList();
    for (const t of THEMES)
        list.append(t.label);
    themeRow.set_model(list);
    themeRow.set_selected(themeValueToIndex(settings.get_string('theme-preference')));
    themeRow.connect('notify::selected', () => {
        settings.set_string('theme-preference', themeIndexToValue(themeRow.get_selected()));
    });
    appearanceGroup.add(themeRow);

    groups.push(appearanceGroup);

    return groups;
}

function themeValueToIndex(value) {
    for (let i = 0; i < THEMES.length; i++) {
        if (THEMES[i].value === value)
            return i;
    }
    return 0;
}

function themeIndexToValue(idx) {
    if (idx >= 0 && idx < THEMES.length)
        return THEMES[idx].value;
    return 'default';
}
