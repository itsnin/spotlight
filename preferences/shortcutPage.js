// spotlight - shortcut preferences page
// SPDX-License-Identifier: GPL-3.0-or-later

import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';

export function buildShortcutPage(settings) {
    const group = new Adw.PreferencesGroup({
        title: 'Keyboard Shortcut',
        description: 'Set the shortcut to open Spotlight',
    });

    const shortcutRow = new Adw.ActionRow({
        title: 'Toggle shortcut',
        subtitle: 'Click here, then press a key combination',
    });

    const shortcutLabel = new Gtk.Label({
        label: formatShortcut(settings.get_strv('toggle-shortcut')),
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER,
    });
    shortcutRow.add_suffix(shortcutLabel);
    shortcutRow.set_activatable(true);

    const eventController = new Gtk.EventControllerKey();
    let capturing = false;

    shortcutRow.connect('activated', () => {
        capturing = true;
        shortcutLabel.label = 'Press a key combination...';
        shortcutRow.grab_focus();
    });

    eventController.connect('key-pressed', (controller, keyval, keycode, state) => {
        if (!capturing)
            return false;

        if (keyval === Gdk.KEY_Control_L || keyval === Gdk.KEY_Control_R ||
            keyval === Gdk.KEY_Shift_L || keyval === Gdk.KEY_Shift_R ||
            keyval === Gdk.KEY_Alt_L || keyval === Gdk.KEY_Alt_R ||
            keyval === Gdk.KEY_Super_L || keyval === Gdk.KEY_Super_R ||
            keyval === Gdk.KEY_Caps_Lock) {
            return true;
        }

        let accelerator = '';
        if (state & Gdk.ModifierType.SUPER_MASK)
            accelerator += '<Super>';
        if (state & Gdk.ModifierType.CONTROL_MASK)
            accelerator += '<Control>';
        if (state & Gdk.ModifierType.SHIFT_MASK)
            accelerator += '<Shift>';
        if (state & Gdk.ModifierType.META_MASK)
            accelerator += '<Meta>';
        accelerator += Gdk.keyval_name(keyval);

        settings.set_strv('toggle-shortcut', [accelerator]);
        shortcutLabel.label = formatShortcut([accelerator]);
        capturing = false;
        return true;
    });

    eventController.connect('key-released', () => {
        if (capturing) {
            capturing = false;
            shortcutLabel.label = formatShortcut(settings.get_strv('toggle-shortcut'));
        }
    });

    shortcutRow.add_controller(eventController);
    group.add(shortcutRow);

    const resetRow = new Adw.ActionRow({
        title: 'Reset to default',
        subtitle: 'Set shortcut to Ctrl+Space',
    });
    const resetButton = new Gtk.Button({
        label: 'Reset',
        valign: Gtk.Align.CENTER,
    });
    resetButton.connect('clicked', () => {
        settings.set_strv('toggle-shortcut', ['<Control>space']);
        shortcutLabel.label = formatShortcut(settings.get_strv('toggle-shortcut'));
    });
    resetRow.add_suffix(resetButton);
    group.add(resetRow);

    return group;
}

function formatShortcut(shortcutArray) {
    if (!shortcutArray || shortcutArray.length === 0)
        return 'Not set (will default to Ctrl+Space)';
    const shortcut = shortcutArray[0];
    return shortcut
        .replace(/<Super>/g, 'Super+')
        .replace(/<Control>/g, 'Ctrl+')
        .replace(/<Shift>/g, 'Shift+')
        .replace(/<Alt>/g, 'Alt+');
}
