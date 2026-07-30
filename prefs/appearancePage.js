// spotlight - appearance preferences page
// SPDX-License-Identifier: GPL-3.0-or-later

import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

export function buildAppearancePage(settings) {
    const group = new Adw.PreferencesGroup({
        title: 'Appearance',
    });

    const widthRow = new Adw.SpinRow({
        title: 'Popup width',
        subtitle: 'Width in pixels',
        adjustment: new Gtk.Adjustment({
            lower: 400,
            upper: 1200,
            step_increment: 20,
            page_increment: 100,
            value: settings.get_int('popup-width'),
        }),
    });
    settings.bind('popup-width', widthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    group.add(widthRow);

    const maxResultsRow = new Adw.SpinRow({
        title: 'Max results per category',
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 20,
            step_increment: 1,
            page_increment: 5,
            value: settings.get_int('max-results'),
        }),
    });
    settings.bind('max-results', maxResultsRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    group.add(maxResultsRow);

    return group;
}
