// spotlight - shortcut preferences page
// SPDX-License-Identifier: GPL-3.0-or-later
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';

export function buildShortcutPage(settings) {
    const group = new Adw.PreferencesGroup({
        title: 'Keyboard Shortcuts',
        description: 'Set shortcuts to open Spotlight in different modes',
    });

    group.add(_buildShortcutRow(
        settings,
        'toggle-shortcut',
        'Toggle Spotlight',
        'Open or close Spotlight search',
        '<Control>space',
    ));

    group.add(_buildShortcutRow(
        settings,
        'clipboard-shortcut',
        'Clipboard history',
        'Open Spotlight showing clipboard history',
        '<Alt>1',
    ));

    group.add(_buildShortcutRow(
        settings,
        'emoji-shortcut',
        'Emoji selector',
        'Open Spotlight showing emoji picker',
        '<Alt>2',
    ));

    return group;
}

function _buildShortcutRow(settings, key, title, subtitle, defaultAccel) {
    const row = new Adw.ActionRow({
        title: title,
        subtitle: subtitle,
    });

    const shortcutLabel = new Gtk.Label({
        label: formatShortcut(settings.get_strv(key)),
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER,
    });
    row.add_suffix(shortcutLabel);
    row.set_activatable(true);

    const eventController = new Gtk.EventControllerKey();
    let capturing = false;

    row.connect('activated', () => {
        capturing = true;
        shortcutLabel.label = 'Press a key combination...';
        row.grab_focus();
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
        if (state & Gdk.ModifierType.MOD1_MASK)
            accelerator += '<Alt>';
        if (state & Gdk.ModifierType.META_MASK)
            accelerator += '<Meta>';
        // require at least one modifier prevents bare keys like g or space
        // which would cause accidental triggering during normal typing
        if (accelerator.length === 0) {
            shortcutLabel.label = 'Modifier required';
            return true;
        }
        // validate at gtk level rejects invalid key combinations
        const mods = state & (Gdk.ModifierType.SUPER_MASK |
                              Gdk.ModifierType.CONTROL_MASK |
                              Gdk.ModifierType.SHIFT_MASK |
                              Gdk.ModifierType.MOD1_MASK |
                              Gdk.ModifierType.META_MASK);
        if (!Gtk.accelerator_valid(keyval, mods)) {
            shortcutLabel.label = 'Invalid shortcut';
            return true;
        }
        accelerator += Gdk.keyval_name(keyval).toLowerCase();

        settings.set_strv(key, [accelerator]);
        shortcutLabel.label = formatShortcut([accelerator]);
        capturing = false;
        return true;
    });

    eventController.connect('key-released', () => {
        if (capturing) {
            capturing = false;
            shortcutLabel.label = formatShortcut(settings.get_strv(key));
        }
    });

    row.add_controller(eventController);

    // reset button
    const resetButton = new Gtk.Button({
        icon_name: 'edit-clear-symbolic',
        valign: Gtk.Align.CENTER,
        margin_start: 8,
        tooltip_text: 'Reset to default',
        css_classes: ['flat'],
    });
    resetButton.connect('clicked', () => {
        settings.set_strv(key, [defaultAccel]);
        shortcutLabel.label = formatShortcut(settings.get_strv(key));
    });
    row.add_suffix(resetButton);

    return row;
}

function formatShortcut(shortcutArray) {
    if (!shortcutArray || shortcutArray.length === 0)
        return 'Not set';
    const shortcut = shortcutArray[0];
    return shortcut
        .replace(/<Super>/g, 'Super+')
        .replace(/<Control>/g, 'Ctrl+')
        .replace(/<Shift>/g, 'Shift+')
        .replace(/<Alt>/g, 'Alt+');
}
