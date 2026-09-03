// spotlight - appearance preferences page
// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

// Theme options: 'default' follows GNOME system, 'dark' and 'light' force specific.
const THEMES = [
    { value: 'default', label: 'Default', subtitle: 'Follow GNOME system style' },
    { value: 'dark', label: 'Dark', subtitle: 'Always use dark appearance' },
    { value: 'light', label: 'Light', subtitle: 'Always use light appearance' },
];

export function buildAppearancePage(settings) {
    const group = new Adw.PreferencesGroup({
        title: 'Appearance',
        description: 'Choose the visual style',
    });

    const themeRow = new Adw.ComboRow({
        title: 'Theme',
        subtitle: 'Dark, light, or follow system',
    });

    const list = new Gtk.StringList();
    for (const t of THEMES)
        list.append(t.label);
    themeRow.set_model(list);

    const current = settings.get_string('theme-preference');
    themeRow.set_selected(themeValueToIndex(current));

    themeRow.connect('notify::selected', () => {
        settings.set_string(
            'theme-preference',
            themeIndexToValue(themeRow.get_selected()),
        );
    });

    group.add(themeRow);
    return group;
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
