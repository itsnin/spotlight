// spotlight - detects focus leaving the popup and closes it
// SPDX-License-Identifier: GPL-3.0-or-later

import GLib from 'gi://GLib';

// watches notify::key-focus on global.stage - if focus moves to an actor
// outside the popup, for example via alt-tab, the popup closes
//
// setup is deferred via an idle source to avoid firing during the initial
// grab_key_focus call in open(), which would otherwise close the popup
// immediately after it opens
export class FocusLossWatcher {
    constructor(popup) {
        this._popup = popup;
        this._focusIdleId = 0;
        this._keyFocusId = 0;
    }

    start() {
        this._focusIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._focusIdleId = 0;
            if (!this._popup.visible)
                return GLib.SOURCE_REMOVE;
            this._keyFocusId = global.stage.connect('notify::key-focus', () => {
                if (!this._popup.visible)
                    return;
                const focus = global.stage.get_key_focus();
                if (!focus || focus === global.stage) {
                    this._popup.close();
                    return;
                }
                if (!this._popup.contains(focus))
                    this._popup.close();
            });
            return GLib.SOURCE_REMOVE;
        });
    }

    stop() {
        if (this._keyFocusId) {
            global.stage.disconnect(this._keyFocusId);
            this._keyFocusId = 0;
        }
        if (this._focusIdleId) {
            GLib.source_remove(this._focusIdleId);
            this._focusIdleId = 0;
        }
    }
}
