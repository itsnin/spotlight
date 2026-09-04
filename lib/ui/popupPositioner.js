// Spotlight: centers the popup and shows it at the right size
// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// Sizing and centering runs once per open, based on the empty-state height of just
// the entry. We do not reposition later as results come in.
export class PopupPositioner {
    constructor(popup) {
        this._popup = popup;
        this._idleId = 0;
    }

    // Queue the popup to be sized, centered and shown. The onShown callback fires
    // after everything settles so the caller can grab focus only once the popup is actually on screen.
    showCentered(onShown) {
        const monitor = this.getTargetMonitor();
        // The popup grows downward from here as results come in. We do not recenter
        // because that makes the popup visibly drift upward as it grows.

        // Width fixed at 520px, part of the design philosophy of one good size with
        // no settings. Capped at 85 percent of monitor width so it never spills over.
        const popupWidth = Math.min(520, Math.floor(monitor.width * 0.85));
        this._popup.set_width(popupWidth);
        this._popup.queue_relayout();
        // All sizes are logical pixels. GNOME handles HiDPI scaling automatically,
        // which is why we never do any scaling ourselves.

        // Showing the popup needs a layout pass first or get_preferred_height returns
        // a stale value from before CSS applied. We defer through idle so the layout pass has a chance to run first.
        this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._idleId = 0;
            this._center(popupWidth, monitor);
            this._popup.show();
            onShown();
            return GLib.SOURCE_REMOVE;
        });
    }

    // Opens on the monitor where the cursor currently sits. Falls back to the
    // primary monitor if the cursor position cannot be determined.
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

    _center(popupWidth, monitor) {
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
