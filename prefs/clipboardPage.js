// spotlight - clipboard preferences page
// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { PrefixedSettings } from '../services/prefixedSettings.js';

export function buildClipboardPage(rootSettings) {
    const settings = new PrefixedSettings(rootSettings, 'clipboard-');
    const page = new Adw.PreferencesPage({
        title: 'Clipboard',
        icon_name: 'edit-paste-symbolic',
    });

    // Behavior
    const behaviorGroup = new Adw.PreferencesGroup({ title: 'Behavior' });
    const paste_button = new Adw.SwitchRow({
        title: 'Paste Button',
        subtitle: 'Add button to paste an entry',
    });
    settings.bind('paste-button', paste_button, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(paste_button);

    const pinned_on_bottom = new Adw.SwitchRow({
        title: 'Pinned On Bottom',
        subtitle: 'Display the pinned section on the bottom',
    });
    settings.bind('pinned-on-bottom', pinned_on_bottom, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(pinned_on_bottom);

    const enable_deletion = new Adw.SwitchRow({
        title: 'Enable Deletion',
        subtitle: 'Enable the deletion of clipboard items from your history',
    });
    settings.bind('enable-deletion', enable_deletion, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(enable_deletion);

    const disable_down_arrow = new Adw.SwitchRow({
        title: 'Disable Down Arrow',
        subtitle: 'Remove down arrow in top bar',
    });
    settings.bind('disable-down-arrow', disable_down_arrow, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(disable_down_arrow);

    const blink_icon_on_copy = new Adw.SwitchRow({
        title: 'Blink Icon On Copy',
        subtitle: 'Blink icon on copy',
    });
    settings.bind('blink-icon-on-copy', blink_icon_on_copy, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(blink_icon_on_copy);

    const show_search_bar = new Adw.SwitchRow({
        title: 'Show Search Bar',
        subtitle: 'Show the search bar',
    });
    settings.bind('show-search-bar', show_search_bar, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(show_search_bar);

    const show_private_mode = new Adw.SwitchRow({
        title: 'Show Private Mode',
        subtitle: 'Show the private mode toggle',
    });
    settings.bind('show-private-mode', show_private_mode, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(show_private_mode);

    const show_settings_button = new Adw.SwitchRow({
        title: 'Show Settings Button',
        subtitle: 'Show the settings button',
    });
    settings.bind('show-settings-button', show_settings_button, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(show_settings_button);

    const show_clear_history_button = new Adw.SwitchRow({
        title: 'Show Clear History Button',
        subtitle: 'Show the clear history button',
    });
    settings.bind('show-clear-history-button', show_clear_history_button, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(show_clear_history_button);

    const clear_on_boot = new Adw.SwitchRow({
        title: 'Clear On Boot',
        subtitle: 'Clear clipboard history on every system reboot.',
    });
    settings.bind('clear-on-boot', clear_on_boot, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(clear_on_boot);

    const paste_on_select = new Adw.SwitchRow({
        title: 'Paste On Select',
        subtitle: 'Paste on select',
    });
    settings.bind('paste-on-select', paste_on_select, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(paste_on_select);

    const cache_only_favorites = new Adw.SwitchRow({
        title: 'Cache Only Favorites',
        subtitle: 'Disable the registry cache file for favorites and use memory only',
    });
    settings.bind('cache-only-favorites', cache_only_favorites, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(cache_only_favorites);

    const notify_on_copy = new Adw.SwitchRow({
        title: 'Notify On Copy',
        subtitle: 'Show notification on copy to clipboard',
    });
    settings.bind('notify-on-copy', notify_on_copy, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(notify_on_copy);

    const notify_on_cycle = new Adw.SwitchRow({
        title: 'Notify On Cycle',
        subtitle: 'Show notification when cycling through the entries with hotkeys',
    });
    settings.bind('notify-on-cycle', notify_on_cycle, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(notify_on_cycle);

    const notify_on_clear = new Adw.SwitchRow({
        title: 'Notify On Clear',
        subtitle: 'Show notification on Clear History',
    });
    settings.bind('notify-on-clear', notify_on_clear, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(notify_on_clear);

    const confirm_clear = new Adw.SwitchRow({
        title: 'Confirm Clear',
        subtitle: 'Show confirmation dialog on Clear History',
    });
    settings.bind('confirm-clear', confirm_clear, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(confirm_clear);

    const confirm_pinned_delete = new Adw.SwitchRow({
        title: 'Confirm Pinned Delete',
        subtitle: 'Show confirmation dialog on deleting pinned item',
    });
    settings.bind('confirm-pinned-delete', confirm_pinned_delete, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(confirm_pinned_delete);

    const strip_text = new Adw.SwitchRow({
        title: 'Strip Text',
        subtitle: 'Remove whitespace around text',
    });
    settings.bind('strip-text', strip_text, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(strip_text);

    const move_item_first = new Adw.SwitchRow({
        title: 'Move Item First',
        subtitle: 'Move items to the top of the list when selected.',
    });
    settings.bind('move-item-first', move_item_first, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(move_item_first);

    const keep_selected_on_clear = new Adw.SwitchRow({
        title: 'Keep Selected On Clear',
        subtitle: 'Keep selected item on clear',
    });
    settings.bind('keep-selected-on-clear', keep_selected_on_clear, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(keep_selected_on_clear);

    const enable_keybindings = new Adw.SwitchRow({
        title: 'Enable Keybindings',
        subtitle: 'Enable the keyboard shortcuts',
    });
    settings.bind('enable-keybindings', enable_keybindings, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(enable_keybindings);

    const cache_images = new Adw.SwitchRow({
        title: 'Cache Images',
        subtitle: 'Cache images',
    });
    settings.bind('cache-images', cache_images, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(cache_images);

    const clear_history_on_interval = new Adw.SwitchRow({
        title: 'Clear History On Interval',
        subtitle: 'Enable clearing history on interval',
    });
    settings.bind('clear-history-on-interval', clear_history_on_interval, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(clear_history_on_interval);

    const case_sensitive_search = new Adw.SwitchRow({
        title: 'Case Sensitive Search',
        subtitle: 'Case sensitive search',
    });
    settings.bind('case-sensitive-search', case_sensitive_search, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(case_sensitive_search);

    const regex_search = new Adw.SwitchRow({
        title: 'Regex Search',
        subtitle: 'Regex-based search',
    });
    settings.bind('regex-search', regex_search, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(regex_search);

    const open_at_cursor = new Adw.SwitchRow({
        title: 'Open At Cursor',
        subtitle: 'Open menu at cursor position',
    });
    settings.bind('open-at-cursor', open_at_cursor, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(open_at_cursor);

    const show_delete_button = new Adw.SwitchRow({
        title: 'Show Delete Button',
        subtitle: 'Show the delete button on each item',
    });
    settings.bind('show-delete-button', show_delete_button, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(show_delete_button);

    const show_tag_button = new Adw.SwitchRow({
        title: 'Show Tag Button',
        subtitle: 'Show the tag button on each item',
    });
    settings.bind('show-tag-button', show_tag_button, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(show_tag_button);

    const show_pin_button = new Adw.SwitchRow({
        title: 'Show Pin Button',
        subtitle: 'Show the pin/favorite button on each item',
    });
    settings.bind('show-pin-button', show_pin_button, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(show_pin_button);

    const show_edit_button = new Adw.SwitchRow({
        title: 'Show Edit Button',
        subtitle: 'Show the edit button on each text item',
    });
    settings.bind('show-edit-button', show_edit_button, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(show_edit_button);

    const show_preview_button = new Adw.SwitchRow({
        title: 'Show Preview Button',
        subtitle: 'Show the preview button on each image item',
    });
    settings.bind('show-preview-button', show_preview_button, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(show_preview_button);

    page.add(behaviorGroup);

    // Values
    const valuesGroup = new Adw.PreferencesGroup({ title: 'Values' });
    const history_size = new Adw.SpinRow({
        title: 'History Size',
        subtitle: 'The number of items to save in history',
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 500,
            step_increment: 1,
            page_increment: 10,
        }),
    });
    settings.bind('history-size', history_size, 'value', Gio.SettingsBindFlags.DEFAULT);
    valuesGroup.add(history_size);

    const display_mode = new Adw.SpinRow({
        title: 'Display Mode',
        subtitle: 'What to display in top bar',
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 1,
            page_increment: 10,
        }),
    });
    settings.bind('display-mode', display_mode, 'value', Gio.SettingsBindFlags.DEFAULT);
    valuesGroup.add(display_mode);

    const preview_size = new Adw.SpinRow({
        title: 'Preview Size',
        subtitle: 'Amount of visible characters for clipboard items',
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 500,
            step_increment: 1,
            page_increment: 10,
        }),
    });
    settings.bind('preview-size', preview_size, 'value', Gio.SettingsBindFlags.DEFAULT);
    valuesGroup.add(preview_size);

    const topbar_preview_size = new Adw.SpinRow({
        title: 'Topbar Preview Size',
        subtitle: 'Amount of visible characters in topbar',
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 500,
            step_increment: 1,
            page_increment: 10,
        }),
    });
    settings.bind('topbar-preview-size', topbar_preview_size, 'value', Gio.SettingsBindFlags.DEFAULT);
    valuesGroup.add(topbar_preview_size);

    const cache_size = new Adw.SpinRow({
        title: 'Cache Size',
        subtitle: 'The allowed size for the registry cache file in MB',
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 500,
            step_increment: 1,
            page_increment: 10,
        }),
    });
    settings.bind('cache-size', cache_size, 'value', Gio.SettingsBindFlags.DEFAULT);
    valuesGroup.add(cache_size);

    const clear_history_interval = new Adw.SpinRow({
        title: 'Clear History Interval',
        subtitle: 'Interval for clearing history in minutes',
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 10080,
            step_increment: 1,
            page_increment: 10,
        }),
    });
    settings.bind('clear-history-interval', clear_history_interval, 'value', Gio.SettingsBindFlags.DEFAULT);
    valuesGroup.add(clear_history_interval);

    const next_history_clear = new Adw.SpinRow({
        title: 'Next History Clear',
        subtitle: 'Next scheduled history clear time',
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            step_increment: 1,
            page_increment: 10,
        }),
    });
    settings.bind('next-history-clear', next_history_clear, 'value', Gio.SettingsBindFlags.DEFAULT);
    valuesGroup.add(next_history_clear);

    page.add(valuesGroup);

    return page;
}
