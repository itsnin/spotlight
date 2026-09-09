// Spotlight: popup open/close scheduling helpers
// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';

// Schedules an idle callback. Stores the source ID on the popup under the
// given property name so it can be cancelled later.
export function scheduleIdle(popup, idProperty, callback) {
    if (popup[idProperty] !== 0)
        return false;
    popup[idProperty] = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        popup[idProperty] = 0;
        callback();
        return GLib.SOURCE_REMOVE;
    });
    return true;
}

// Cancels a pending idle callback by source ID property.
export function cancelIdle(popup, idProperty) {
    if (popup[idProperty] !== 0) {
        GLib.source_remove(popup[idProperty]);
        popup[idProperty] = 0;
    }
}

// Connects a text-changed handler that toggles search visibility based on
// whether the entry has text. Returns the handler ID.
export function trackTextVisibility(search) {
    return search._text.connect('text-changed', () => {
        search.visible = search._text.get_text().length > 0;
    });
}
