// spotlight - centers the popup and shows it at the right size
// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
// sizing and centering happens once per open(), based on the empty-state
// height (just the search entry, before any results render) - the popup
// then grows downward as results appear without recentering, since
// recentering on every size change makes the popup visibly drift upward
// as it grows (see AGENTS.md popup positioning section for the full
// reasoning)
//
// width is capped relative to the monitor width so the popup never
// overflows on small monitors. all sizes are in logical pixels and gnome
// handles hidpi scaling automatically - we never scale ourselves.
//
// showing the popup needs a layout pass to have already happened, or
// get_preferred_height returns a stale value before css is applied - that's
// why this is deferred through an idle source rather than done inline
export class PopupPositioner {
    constructor(popup, settings) {
        this._popup = popup;
        this._settings = settings;
        this._idleId = 0;
    }
    // queues the popup to be sized, centered, and shown - calls onShown once
    // that's done, so the caller can grab focus and start key capture only
    // once the popup is actually visible on screen
    showCentered(onShown) {
        const monitor = Main.layoutManager.primaryMonitor;
        const configuredWidth = this._settings.get_int('popup-width');
        // cap width at 85% of monitor width so it never overflows
        // sizes are logical pixels - gnome handles hidpi scaling
        const popupWidth = Math.min(configuredWidth, Math.floor(monitor.width * 0.85));
        this._popup.set_width(popupWidth);
        this._popup.queue_relayout();
        this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._idleId = 0;
            this._center(popupWidth);
            this._popup.show();
            onShown();
            return GLib.SOURCE_REMOVE;
        });
    }
    _center(popupWidth) {
        const monitor = Main.layoutManager.primaryMonitor;
        const [, naturalHeight] = this._popup.get_preferred_height(popupWidth);
        this._popup.set_position(
            Math.floor(monitor.x + (monitor.width - popupWidth) / 2),
            Math.floor(monitor.y + (monitor.height - naturalHeight) / 2),
        );
    }
    stop() {
        if (this._idleId) {
            GLib.source_remove(this._idleId);
            this._idleId = 0;
        }
    }
}
