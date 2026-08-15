// spotlight - no results widget
// SPDX-License-Identifier: GPL-3.0-or-later

import St from 'gi://St';
import Clutter from 'gi://Clutter';

// creates the empty state widget shown when search returns nothing
export function buildNoResults(query) {
    const box = new St.BoxLayout({
        vertical: true,
        style_class: 'spotlight-no-results',
    });
    box.add_child(new St.Label({
        style_class: 'spotlight-no-results-title',
        text: 'No Results',
    }));
    box.add_child(new St.Label({
        text: `No results for "${query}"`,
    }));
    return box;
}
