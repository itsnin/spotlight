// spotlight - behavior preferences page
// SPDX-License-Identifier: GPL-3.0-or-later
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';

// builds the behavior settings group currently only monitor selection
// prefs process uses gdk not main layoutmanager to enumerate monitors
export function buildBehaviorPage(settings) {
    const group = new Adw.PreferencesGroup({
        title: 'Popup Behavior',
        description: 'Choose where Spotlight appears',
    });

    const monitorRow = new Adw.ComboRow({
        title: 'Show popup on',
        subtitle: 'Which monitor displays Spotlight',
    });

    // build model primary cursor then monitor 1 monitor 2 etc
    const list = new Gtk.StringList();
    list.append('Primary Monitor');
    list.append('Monitor with Cursor');

    const display = Gdk.Display.get_default();
    const nMonitors = display ? display.get_n_monitors() : 1;
    for (let i = 0; i < nMonitors; i++) {
        const monitor = display ? display.get_monitor(i) : null;
        const name = monitor ? monitor.get_manufacturer() + ' ' + monitor.get_model() : '';
        list.append('Monitor ' + (i + 1) + (name ? ' — ' + name.trim() : ''));
    }

    monitorRow.set_model(list);

    // map stored value to combo position and back
    const current = settings.get_string('monitor-behavior');
    monitorRow.set_selected(valueToIndex(current, nMonitors));

    monitorRow.connect('notify::selected', () => {
        const idx = monitorRow.get_selected();
        settings.set_string('monitor-behavior', indexToValue(idx, nMonitors));
    });

    group.add(monitorRow);
    return group;
}

// converts stored string value to combo row index
function valueToIndex(value, nMonitors) {
    if (value === 'primary')
        return 0;
    if (value === 'cursor')
        return 1;
    // specific monitor index stored as string like '0' '1'
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0 && num < nMonitors)
        return num + 2;
    return 0;
}

// converts combo row index back to stored string value
function indexToValue(idx, nMonitors) {
    if (idx === 0)
        return 'primary';
    if (idx === 1)
        return 'cursor';
    const monitorIdx = idx - 2;
    if (monitorIdx >= 0 && monitorIdx < nMonitors)
        return String(monitorIdx);
    return 'primary';
}
