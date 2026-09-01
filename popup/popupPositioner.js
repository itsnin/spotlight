// spotlight - centers the popup and shows it at the right size
// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// sizing and centering happens once per open based on the empty-state
// height just the search entry before any results render
export class PopupPositioner {
    constructor(popup = null) {
        this._popup = popup;
        this._idleId = 0;
    }

    // queues the popup to be sized centered and shown calls onShown once
    // that is done so the caller can grab focus and start key capture only
    // once the popup is actually visible on screen
    showCentered(onShown) {
        const monitor = this.getTargetMonitor();
        const popupWidth = Math.min(520, Math.floor(monitor.width * 0.85));
        this._popup.set_width(popupWidth);
        this._popup.queue_relayout();

        this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._idleId = 0;
            this._center(this._popup, popupWidth, monitor);
            this._popup.show();
            onShown();
            return GLib.SOURCE_REMOVE;
        });
    }

    // immediately centers the given popup on the primary monitor
    // used by standalone clipboard and emoji popups that manage their own show timing
    centerOnPrimary(popup) {
        const monitor = Main.layoutManager.primaryMonitor;
        const popupWidth = Math.min(520, Math.floor(monitor.width * 0.85));
        popup.set_width(popupWidth);
        popup.queue_relayout();
        this._center(popup, popupWidth, monitor);
    }

    // always opens on the monitor where the cursor currently is
    // works correctly on both single and multi monitor setups
    // falls back to primary monitor if cursor position cannot be determined
    getTargetMonitor() {
        const [px, py] = global.get_pointer();
        for (const m of Main.layoutManager.monitors) {
            if (px >= m.x && px < m.x + m.width &&
                py >= m.y && py < m.y + m.height) {
                return m;
            }
        }
        return Main.layoutManager.primaryMonitor;
    }

    _center(popup, popupWidth, monitor) {
        const [, naturalHeight] = popup.get_preferred_height(popupWidth);
        const maxHeight = Math.floor(monitor.height * 0.85);
        const clampedHeight = Math.min(naturalHeight, maxHeight);
        const x = Math.floor(monitor.x + (monitor.width - popupWidth) / 2);
        const y = Math.floor(monitor.y + (monitor.height - clampedHeight) / 2);
        popup.set_position(x, y);
    }

    stop() {
        if (this._idleId) {
            GLib.source_remove(this._idleId);
            this._idleId = 0;
        }
    }
}
