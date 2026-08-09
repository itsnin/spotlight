// spotlight - search entry widget
// SPDX-License-Identifier: GPL-3.0-or-later

import St from 'gi://St';
import Clutter from 'gi://Clutter';

// builds the search entry box with icon and text field
export function buildSearchEntry() {
    const entryBox = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        x_expand: true,
        style_class: 'spotlight-entry-box',
    });

    const searchIcon = new St.Icon({
        icon_name: 'system-search-symbolic',
        style_class: 'spotlight-search-icon',
        icon_size: 20,
        y_align: Clutter.ActorAlign.CENTER,
    });

    const entry = new St.Entry({
        style_class: 'spotlight-entry',
        hint_text: 'Search apps...',
        can_focus: true,
        x_expand: true,
    });

    entryBox.add_child(searchIcon);
    entryBox.add_child(entry);

    return {entryBox, entry};
}
