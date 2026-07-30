// spotlight - section header widget
// SPDX-License-Identifier: GPL-3.0-or-later

import St from 'gi://St';

// creates a section header label for categorizing results
export function buildSectionHeader(title) {
    return new St.Label({
        style_class: 'spotlight-section-header',
        text: title,
    });
}
