// spotlight - centers the popup and shows it at the right size
// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// sizing and centering happens once per open based on the empty-state
// height just the search entry before any results render
export class PopupPositioner {
    constructor(popup, settings) {
        this._popup = popup;
        this._settings = settings;
        this._idleId = 0;
    }

    // queues the popup to be sized centered and shown calls onShown once
    // that is done so the caller can grab focus and start key capture only
    // once the popup is actually visible on screen
    showCentered(onShown) {
        const monitor = this._getTargetMonitor();
        // popup then grows downward as results appear without recentering since
        // recentering on every size change makes the popup visibly drift upward

        // width is fixed at 520px apple philosophy one perfect size no settings
        // capped at 85 percent of monitor width so it never overflows
        const popupWidth = Math.min(520, Math.floor(monitor.width * 0.85));
        this._popup.set_width(popupWidth);
        this._popup.queue_relayout();
        // all sizes are in logical pixels and gnome handles hidpi
        // scaling automatically we never scale ourselves

        // showing the popup needs a layout pass to have already happened or
        // get_preferred_height returns a stale value before css is applied that
        // is why this is deferred through an idle source rather than done inline
        this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._idleId = 0;
            this._center(popupWidth, monitor);
            this._popup.show();
            onShown();
            return GLib.SOURCE_REMOVE;
        });
    }

    // determines which monitor to use based on user preference
    // primary cursor or specific index falls back to primary on any error
    _getTargetMonitor() {
        const behavior = this._settings.get_string('monitor-behavior');

        if (behavior === 'cursor') {
            const [px, py] = global.get_pointer();
            for (const m of Main.layoutManager.monitors) {
                if (px >= m.x && px < m.x + m.width &&
                    py >= m.y && py < m.y + m.height) {
                    return m;
                }
            }
        }

        if (behavior !== 'primary' && behavior !== 'cursor') {
            const idx = parseInt(behavior, 10);
            if (!isNaN(idx) && idx >= 0 &&
                idx < Main.layoutManager.monitors.length) {
                return Main.layoutManager.monitors[idx];
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

    // public accessor for target monitor used by backdrop to cover
    // the same monitor where the popup will appear
    getTargetMonitor() {
        return this._getTargetMonitor();
    }

    stop() {
        if (this._idleId) {
            GLib.source_remove(this._idleId);
            this._idleId = 0;
        }
    }
}
