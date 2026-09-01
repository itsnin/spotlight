// spotlight - emoji preferences page
// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { PrefixedSettings } from '../services/prefixedSettings.js';

const SKIN_TONES = [
    { value: 0, label: 'Default' },
    { value: 1, label: 'Light' },
    { value: 2, label: 'Medium-Light' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Medium-Dark' },
    { value: 5, label: 'Dark' },
];

const GENDERS = [
    { value: 0, label: 'Default' },
    { value: 1, label: 'Woman' },
    { value: 2, label: 'Man' },
    { value: 3, label: 'Person' },
];

export function buildEmojiPage(rawSettings) {
    const settings = new PrefixedSettings(rawSettings, 'emoji-');
    const groups = [];

    // defaults group
    const defaultsGroup = new Adw.PreferencesGroup({
        title: 'Defaults',
        description: 'Default modifiers for applicable emojis',
    });

    const skinRow = new Adw.ComboRow({
        title: 'Skin tone',
        subtitle: 'Default skin tone for people emojis',
        model: Gtk.StringList.new(SKIN_TONES.map(s => s.label)),
    });
    settings.bind('skin-tone', skinRow, 'selected', Gio.SettingsBindFlags.DEFAULT);
    defaultsGroup.add(skinRow);

    const genderRow = new Adw.ComboRow({
        title: 'Gender',
        subtitle: 'Default gender for applicable emojis',
        model: Gtk.StringList.new(GENDERS.map(g => g.label)),
    });
    settings.bind('gender', genderRow, 'selected', Gio.SettingsBindFlags.DEFAULT);
    defaultsGroup.add(genderRow);

    groups.push(defaultsGroup);

    // display group
    const displayGroup = new Adw.PreferencesGroup({
        title: 'Display',
        description: 'How the emoji picker looks and behaves',
    });

    const sizeRow = new Adw.SpinRow({
        title: 'Emoji size',
        subtitle: 'Size of emoji buttons in pixels',
        adjustment: new Gtk.Adjustment({
            lower: 16, upper: 96, step_increment: 2, page_increment: 8,
        }),
    });
    settings.bind('emojisize', sizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(sizeRow);

    const columnsRow = new Adw.SpinRow({
        title: 'Emoji columns',
        subtitle: 'Number of emojis per row in the grid',
        adjustment: new Gtk.Adjustment({
            lower: 4, upper: 20, step_increment: 1, page_increment: 2,
        }),
    });
    settings.bind('nbcols', columnsRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(columnsRow);

    const keepOpenRow = new Adw.SwitchRow({
        title: 'Keep emoji panel open',
        subtitle: 'Keep the emoji panel open after selecting an emoji (allows picking multiple)',
    });
    settings.bind('keep-open', keepOpenRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(keepOpenRow);

    groups.push(displayGroup);

    return groups;
}
