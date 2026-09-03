// Spotlight: centers the popup and shows it at the right size
// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// Sizing and centering happens once per open, based on the empty-state height
// which is just the search entry by itself before any results come in.
export class PopupPositioner {
    constructor(popup) {
        this._popup = popup;
        this._idleId = 0;
    }

    // Queues the popup to be sized, centered and shown. Calls onShown once
    // everything settles so the caller can grab focus and start key capture
    // only after the popup is actually sitting on the screen.
    showCentered(onShown) {
        const monitor = this.getTargetMonitor();
        // The popup then grows downward as results come in without recentering.
        // Recentering on every size change would make the popup visibly drift upward.

        // Width is fixed at 520px, part of the design philosophy: one good size, no settings.
        // Capped at 85 percent of the monitor width so it never spills over the edges.
        const popupWidth = Math.min(520, Math.floor(monitor.width * 0.85));
        this._popup.set_width(popupWidth);
        this._popup.queue_relayout();
        // All sizes are in logical pixels and GNOME handles HiDPI scaling
        // automatically. We never do any scaling ourselves.

        // Showing the popup needs a layout pass to have already run, otherwise
        // get_preferred_height returns a stale value from before CSS was applied.
        // That is why we defer this through an idle source rather than doing it inline.
        this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._idleId = 0;
            this._center(popupWidth, monitor);
            this._popup.show();
            onShown();
            return GLib.SOURCE_REMOVE;
        });
    }

    // Always opens on the monitor where the cursor is sitting right now.
    // Works correctly on both single and multi-monitor setups.
    // Falls back to the primary monitor if the cursor position cannot be determined.
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
