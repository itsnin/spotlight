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
    settings.bind('clipboard-paste-on-select', pasteRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(pasteRow);

    const historyRow = new Adw.SpinRow({
        title: 'Clipboard history size',
        subtitle: 'Maximum number of entries to keep in clipboard history',
        adjustment: new Gtk.Adjustment({
            lower: 5, upper: 100, step_increment: 1, page_increment: 5,
        }),
    });
    settings.bind('clipboard-history-size', historyRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(historyRow);

    const moveFirstRow = new Adw.SwitchRow({
        title: 'Move selected to top',
        subtitle: 'Move items to the top of the list when selected',
    });
    settings.bind('clipboard-move-item-first', moveFirstRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(moveFirstRow);

    const stripRow = new Adw.SwitchRow({
        title: 'Strip whitespace',
        subtitle: 'Remove leading and trailing whitespace from copied text',
    });
    settings.bind('clipboard-strip-text', stripRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(stripRow);

    const cacheFavRow = new Adw.SwitchRow({
        title: 'Cache only favorites',
        subtitle: 'Only persist pinned favorites to disk non favorites are memory only',
    });
    settings.bind('clipboard-cache-only-favorites', cacheFavRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(cacheFavRow);

    groups.push(behaviorGroup);

    // clipboard search group
    const searchGroup = new Adw.PreferencesGroup({
        title: 'Clipboard search',
        description: 'Search behavior in clipboard history',
    });

    const regexRow = new Adw.SwitchRow({
        title: 'Regex search',
        subtitle: 'Allow regular expressions in clipboard search',
    });
    settings.bind('clipboard-regex-search', regexRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    searchGroup.add(regexRow);

    const caseRow = new Adw.SwitchRow({
        title: 'Case sensitive search',
        subtitle: 'Make clipboard search case sensitive',
    });
    settings.bind('clipboard-case-sensitive-search', caseRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    searchGroup.add(caseRow);

    groups.push(searchGroup);

    // clipboard confirmation group
    const confirmGroup = new Adw.PreferencesGroup({
        title: 'Clipboard confirmations',
        description: 'Confirmation dialogs for destructive actions',
    });

    const confirmClearRow = new Adw.SwitchRow({
        title: 'Confirm clear history',
        subtitle: 'Show confirmation dialog when clearing clipboard history',
    });
    settings.bind('clipboard-confirm-clear', confirmClearRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    confirmGroup.add(confirmClearRow);

    const confirmPinnedRow = new Adw.SwitchRow({
        title: 'Confirm delete pinned',
        subtitle: 'Show confirmation dialog when deleting a pinned favorite item',
    });
    settings.bind('clipboard-confirm-pinned-delete', confirmPinnedRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    confirmGroup.add(confirmPinnedRow);

    groups.push(confirmGroup);

    // clipboard display group
    const clipDisplayGroup = new Adw.PreferencesGroup({
        title: 'Clipboard display',
        description: 'Show or hide interface elements',
    });

    const pinnedBottomRow = new Adw.SwitchRow({
        title: 'Pinned items on bottom',
        subtitle: 'Display the pinned favorites section below the history section',
    });
    settings.bind('clipboard-pinned-on-bottom', pinnedBottomRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    clipDisplayGroup.add(pinnedBottomRow);

    const showPinRow = new Adw.SwitchRow({
        title: 'Show pin button',
        subtitle: 'Show the pin favorite button on each clipboard item',
    });
    settings.bind('clipboard-show-pin-button', showPinRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    clipDisplayGroup.add(showPinRow);

    const showDeleteRow = new Adw.SwitchRow({
        title: 'Show delete button',
        subtitle: 'Show the delete button on each clipboard item',
    });
    settings.bind('clipboard-show-delete-button', showDeleteRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    clipDisplayGroup.add(showDeleteRow);

    const showPasteRow = new Adw.SwitchRow({
        title: 'Show paste button',
        subtitle: 'Show the paste button on each clipboard item',
    });
    settings.bind('clipboard-paste-button', showPasteRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    clipDisplayGroup.add(showPasteRow);

    const showEditRow = new Adw.SwitchRow({
        title: 'Show edit button',
        subtitle: 'Show the edit button on text clipboard items',
    });
    settings.bind('clipboard-show-edit-button', showEditRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    clipDisplayGroup.add(showEditRow);

    const showTagRow = new Adw.SwitchRow({
        title: 'Show tag button',
        subtitle: 'Show the tag button on each clipboard item',
    });
    settings.bind('clipboard-show-tag-button', showTagRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    clipDisplayGroup.add(showTagRow);

    groups.push(clipDisplayGroup);

    // emoji defaults group
    const emojiGroup = new Adw.PreferencesGroup({
        title: 'Emoji defaults',
        description: 'Skin tone and gender modifiers for applicable emojis',
    });

    const toneLabels = [
        'Default (no tone)',
        'Light',
        'Medium light',
        'Medium',
        'Medium dark',
        'Dark',
    ];
    const toneRow = new Adw.ComboRow({
        title: 'Skin tone',
        subtitle: 'Default skin tone for people emojis',
    });
    const toneList = new Gtk.StringList();
    for (const label of toneLabels)
        toneList.append(label);
    toneRow.set_model(toneList);
    toneRow.set_selected(settings.get_int('emoji-skin-tone'));
    toneRow.connect('notify::selected', () => {
        settings.set_int('emoji-skin-tone', toneRow.get_selected());
    });
    emojiGroup.add(toneRow);

    const genderLabels = [
        'Gender neutral',
        'Women',
        'Men',
    ];
    const genderRow = new Adw.ComboRow({
        title: 'Gender',
        subtitle: 'Default gender for applicable emojis',
    });
    const genderList = new Gtk.StringList();
    for (const label of genderLabels)
        genderList.append(label);
    genderRow.set_model(genderList);
    genderRow.set_selected(settings.get_int('emoji-gender'));
    genderRow.connect('notify::selected', () => {
        settings.set_int('emoji-gender', genderRow.get_selected());
    });
    emojiGroup.add(genderRow);

    groups.push(emojiGroup);

    // emoji display group
    const emojiDisplayGroup = new Adw.PreferencesGroup({
        title: 'Emoji display',
        description: 'Emoji grid appearance and behavior',
    });

    const emojiSizeRow = new Adw.SpinRow({
        title: 'Emoji size',
        subtitle: 'Size of emoji buttons in pixels',
        adjustment: new Gtk.Adjustment({
            lower: 16, upper: 48, step_increment: 1, page_increment: 2,
        }),
    });
    settings.bind('emoji-emojisize', emojiSizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    emojiDisplayGroup.add(emojiSizeRow);

    const emojiColsRow = new Adw.SpinRow({
        title: 'Emoji columns',
        subtitle: 'Number of emojis per row in the grid',
        adjustment: new Gtk.Adjustment({
            lower: 6, upper: 16, step_increment: 1, page_increment: 2,
        }),
    });
    settings.bind('emoji-nbcols', emojiColsRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    emojiDisplayGroup.add(emojiColsRow);

    const keepOpenRow = new Adw.SwitchRow({
        title: 'Keep emoji panel open',
        subtitle: 'Keep the emoji panel open after selecting an emoji allows picking multiple',
    });
    settings.bind('emoji-keep-open', keepOpenRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    emojiDisplayGroup.add(keepOpenRow);


    groups.push(emojiDisplayGroup);


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
