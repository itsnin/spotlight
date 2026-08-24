// spotlight - appearance preferences page
// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

// theme options default follows gnome system dark and light force specific
const THEMES = [
    { value: 'default', label: 'Default', subtitle: 'Follow GNOME system style' },
    { value: 'dark', label: 'Dark', subtitle: 'Always use dark appearance' },
    { value: 'light', label: 'Light', subtitle: 'Always use light appearance' },
];

export function buildAppearancePage(settings) {
    const groups = [];

    const appearanceGroup = new Adw.PreferencesGroup({
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
    appearanceGroup.add(themeRow);
    groups.push(appearanceGroup);

    // behavior group
    const behaviorGroup = new Adw.PreferencesGroup({
        title: 'Behavior',
        description: 'Clipboard and emoji selection behavior',
    });

    const pasteRow = new Adw.SwitchRow({
        title: 'Paste on select',
        subtitle: 'Automatically paste after selecting a clipboard entry or emoji',
    });
    settings.bind(
        'paste-on-select',
        pasteRow,
        'active',
        Gio.SettingsBindFlags.DEFAULT,
    );
    behaviorGroup.add(pasteRow);

    const historyRow = new Adw.SpinRow({
        title: 'Clipboard history size',
        subtitle: 'Maximum number of entries to keep in clipboard history',
        adjustment: new Gtk.Adjustment({
            lower: 5,
            upper: 100,
            step_increment: 1,
            page_increment: 5,
        }),
    });
    settings.bind(
        'clipboard-history-size',
        historyRow,
        'value',
        Gio.SettingsBindFlags.DEFAULT,
    );
    behaviorGroup.add(historyRow);
    groups.push(behaviorGroup);

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
