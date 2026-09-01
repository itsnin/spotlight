// spotlight - emoji preferences page
// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { PrefixedSettings } from '../services/prefixedSettings.js';

export function buildEmojiPage(rootSettings) {
    const settings = new PrefixedSettings(rootSettings, 'emoji-');
    const page = new Adw.PreferencesPage({
        title: 'Emoji',
        icon_name: 'face-cool-symbolic',
    });

    // Behavior
    const behaviorGroup = new Adw.PreferencesGroup({ title: 'Behavior' });
    const paste_on_select = new Adw.SwitchRow({
        title: 'Paste On Select',
        subtitle: 'if paste on select is enabled',
    });
    settings.bind('paste-on-select', paste_on_select, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(paste_on_select);

    const keep_open = new Adw.SwitchRow({
        title: 'Keep Open',
        subtitle: 'if the menu stays open after selecting an emoji',
    });
    settings.bind('keep-open', keep_open, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(keep_open);

    const active_keybind = new Adw.SwitchRow({
        title: 'Active Keybind',
        subtitle: 'if keybinding is enabled',
    });
    settings.bind('active-keybind', active_keybind, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(active_keybind);

    const always_show = new Adw.SwitchRow({
        title: 'Always Show',
        subtitle: 'if icon should always be shown',
    });
    settings.bind('always-show', always_show, 'active', Gio.SettingsBindFlags.DEFAULT);
    behaviorGroup.add(always_show);

    page.add(behaviorGroup);

    // Display
    const displayGroup = new Adw.PreferencesGroup({ title: 'Display' });
    const nbcols = new Adw.SpinRow({
        title: 'Nbcols',
        subtitle: 'Number of emojis per line',
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 20,
            step_increment: 1,
            page_increment: 2,
        }),
    });
    settings.bind('nbcols', nbcols, 'value', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(nbcols);

    const emojisize = new Adw.SpinRow({
        title: 'Emojisize',
        subtitle: 'Default size of emojis',
        adjustment: new Gtk.Adjustment({
            lower: 8,
            upper: 96,
            step_increment: 1,
            page_increment: 2,
        }),
    });
    settings.bind('emojisize', emojisize, 'value', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(emojisize);

    const skin_tone = new Adw.SpinRow({
        title: 'Skin Tone',
        subtitle: 'Favorite skin tone',
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 5,
            step_increment: 1,
            page_increment: 2,
        }),
    });
    settings.bind('skin-tone', skin_tone, 'value', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(skin_tone);

    const gender = new Adw.SpinRow({
        title: 'Gender',
        subtitle: 'Favorite gender',
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 5,
            step_increment: 1,
            page_increment: 2,
        }),
    });
    settings.bind('gender', gender, 'value', Gio.SettingsBindFlags.DEFAULT);
    displayGroup.add(gender);

    page.add(displayGroup);

    // Position
    const positionGroup = new Adw.PreferencesGroup({ title: 'Position' });
    const position = new Adw.ComboRow({
        title: 'Position',
        subtitle: 'orientation of the interface',
        model: new Gtk.StringList({ strings: ['top', 'bottom', 'top-bar', 'cursor'] }),
    });
    const position_idx = ['top', 'bottom', 'top-bar', 'cursor'].indexOf(settings.get_string('position'));
    position.set_selected(Math.max(0, position_idx));
    position.connect('notify::selected', () => {
        const strings = ['top', 'bottom', 'top-bar', 'cursor'];
        settings.set_string('position', strings[position.get_selected()]);
    });
    positionGroup.add(position);

    const window_location = new Adw.ComboRow({
        title: 'Window Location',
        subtitle: 'Window location mode',
        model: new Gtk.StringList({ strings: ['top', 'bottom', 'top-bar', 'cursor'] }),
    });
    const window_location_idx = ['top', 'bottom', 'top-bar', 'cursor'].indexOf(settings.get_string('window-location'));
    window_location.set_selected(Math.max(0, window_location_idx));
    window_location.connect('notify::selected', () => {
        const strings = ['top', 'bottom', 'top-bar', 'cursor'];
        settings.set_string('window-location', strings[window_location.get_selected()]);
    });
    positionGroup.add(window_location);

    page.add(positionGroup);

    return page;
}
