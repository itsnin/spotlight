// spotlight - clipboard preferences page
// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { PrefixedSettings } from '../services/prefixedSettings.js';
import { PrefsFields } from '../services/clipboard/constants.js';

export function buildClipboardPage(rawSettings) {
    const settings = new PrefixedSettings(rawSettings, 'clipboard-');
    const groups = [];

    // behavior group
    const behaviorGroup = new Adw.PreferencesGroup({
        title: 'Behavior',
        description: 'How clipboard entries are handled',
    });

    const pasteRow = new Adw.SwitchRow({
        title: 'Paste on select',
        subtitle: 'Automatically paste after selecting a clipboard entry',
    });
    settings.bind(PrefsFields.PASTE_ON_SELECT, pasteRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(pasteRow);

    const historyRow = new Adw.SpinRow({
        title: 'Clipboard history size',
        subtitle: 'Maximum number of entries to keep in clipboard history',
        adjustment: new Gtk.Adjustment({
            lower: 5, upper: 200, step_increment: 1, page_increment: 5,
        }),
    });
    settings.bind(PrefsFields.HISTORY_SIZE, historyRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(historyRow);

    const moveFirstRow = new Adw.SwitchRow({
        title: 'Move selected to top',
        subtitle: 'Move items to the top of the list when selected',
    });
    settings.bind(PrefsFields.MOVE_ITEM_FIRST, moveFirstRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(moveFirstRow);

    const stripRow = new Adw.SwitchRow({
        title: 'Strip whitespace',
        subtitle: 'Remove leading and trailing whitespace from copied text',
    });
    settings.bind(PrefsFields.STRIP_TEXT, stripRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(stripRow);

    const cacheFavRow = new Adw.SwitchRow({
        title: 'Cache only favorites',
        subtitle: 'Only persist pinned favorites to disk, non-favorites are memory only',
    });
    settings.bind(PrefsFields.CACHE_ONLY_FAVORITE, cacheFavRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(cacheFavRow);

    const notifyRow = new Adw.SwitchRow({
        title: 'Notify on copy',
        subtitle: 'Show a desktop notification when text is copied',
    });
    settings.bind(PrefsFields.NOTIFY_ON_COPY, notifyRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(notifyRow);

    const notifyClearRow = new Adw.SwitchRow({
        title: 'Notify on clear',
        subtitle: 'Show a desktop notification when history is cleared',
    });
    settings.bind(PrefsFields.NOTIFY_ON_CLEAR, notifyClearRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(notifyClearRow);

    groups.push(behaviorGroup);

    // auto-clear group
    const autoClearGroup = new Adw.PreferencesGroup({
        title: 'Auto-clear history',
        description: 'Automatically clear clipboard history on a schedule',
    });

    const autoClearRow = new Adw.SwitchRow({
        title: 'Enable auto-clear',
        subtitle: 'Clear history automatically at regular intervals',
    });
    settings.bind(PrefsFields.CLEAR_HISTORY_ON_INTERVAL, autoClearRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    autoClearGroup.add(autoClearRow);

    const intervalRow = new Adw.SpinRow({
        title: 'Clear interval',
        subtitle: 'Minutes between automatic history clears',
        adjustment: new Gtk.Adjustment({
            lower: 1, upper: 1440, step_increment: 1, page_increment: 10,
        }),
    });
    settings.bind(PrefsFields.CLEAR_HISTORY_INTERVAL, intervalRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    autoClearGroup.add(intervalRow);

    groups.push(autoClearGroup);

    // search group
    const searchGroup = new Adw.PreferencesGroup({
        title: 'Search',
        description: 'Search behavior in clipboard history',
    });

    const regexRow = new Adw.SwitchRow({
        title: 'Regex search',
        subtitle: 'Allow regular expressions in clipboard search',
    });
    settings.bind(PrefsFields.REGEX_SEARCH, regexRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    searchGroup.add(regexRow);

    const caseRow = new Adw.SwitchRow({
        title: 'Case sensitive search',
        subtitle: 'Make clipboard search case sensitive',
    });
    settings.bind(PrefsFields.CASE_SENSITIVE_SEARCH, caseRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    searchGroup.add(caseRow);

    groups.push(searchGroup);

    // confirmation group
    const confirmGroup = new Adw.PreferencesGroup({
        title: 'Confirmations',
        description: 'Confirmation dialogs for destructive actions',
    });

    const confirmClearRow = new Adw.SwitchRow({
        title: 'Confirm clear history',
        subtitle: 'Show confirmation dialog when clearing clipboard history',
    });
    settings.bind(PrefsFields.CONFIRM_ON_CLEAR, confirmClearRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    confirmGroup.add(confirmClearRow);

    const confirmPinnedRow = new Adw.SwitchRow({
        title: 'Confirm delete pinned',
        subtitle: 'Show confirmation dialog when deleting a pinned favorite item',
    });
    settings.bind(PrefsFields.CONFIRM_ON_PINNED_DELETE, confirmPinnedRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    confirmGroup.add(confirmPinnedRow);

    groups.push(confirmGroup);

    // display group
    const displayGroup = new Adw.PreferencesGroup({
        title: 'Display',
        description: 'Show or hide interface elements',
    });

    const pinnedBottomRow = new Adw.SwitchRow({
        title: 'Pinned items on bottom',
        subtitle: 'Display the pinned favorites section below the history section',
    });
    settings.bind(PrefsFields.PINNED_ON_BOTTOM, pinnedBottomRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(pinnedBottomRow);

    const showPinRow = new Adw.SwitchRow({
        title: 'Show pin button',
        subtitle: 'Show the pin favorite button on each clipboard item',
    });
    settings.bind(PrefsFields.SHOW_PIN_BUTTON, showPinRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(showPinRow);

    const showDeleteRow = new Adw.SwitchRow({
        title: 'Show delete button',
        subtitle: 'Show the delete button on each clipboard item',
    });
    settings.bind(PrefsFields.SHOW_DELETE_BUTTON, showDeleteRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(showDeleteRow);

    const showPasteRow = new Adw.SwitchRow({
        title: 'Show paste button',
        subtitle: 'Show the paste button on each clipboard item',
    });
    settings.bind(PrefsFields.PASTE_BUTTON, showPasteRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(showPasteRow);

    const showEditRow = new Adw.SwitchRow({
        title: 'Show edit button',
        subtitle: 'Show the edit button on text clipboard items',
    });
    settings.bind(PrefsFields.SHOW_EDIT_BUTTON, showEditRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(showEditRow);

    const showPreviewRow = new Adw.SwitchRow({
        title: 'Show preview button',
        subtitle: 'Show the image preview button on image clipboard items',
    });
    settings.bind(PrefsFields.SHOW_PREVIEW_BUTTON, showPreviewRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(showPreviewRow);

    const showTagRow = new Adw.SwitchRow({
        title: 'Show tag button',
        subtitle: 'Show the tag button on each clipboard item',
    });
    settings.bind(PrefsFields.SHOW_TAG_BUTTON, showTagRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(showTagRow);

    const previewSizeRow = new Adw.SpinRow({
        title: 'Preview size',
        subtitle: 'Maximum characters to show per entry preview',
        adjustment: new Gtk.Adjustment({
            lower: 20, upper: 300, step_increment: 5, page_increment: 20,
        }),
    });
    settings.bind(PrefsFields.PREVIEW_SIZE, previewSizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(previewSizeRow);

    groups.push(displayGroup);

    return groups;
}
