// spotlight - popup widget
// SPDX-License-Identifier: GPL-3.0-or-later

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {buildSearchEntry} from './searchEntry.js';
import {buildResultsContainer} from './resultsContainer.js';
import {SelectionManager} from './selectionManager.js';
import {ResultsRenderer} from './resultsRenderer.js';
import {PopupKeyHandler} from './popupKeyHandler.js';
import {PopupBackdrop} from './popupBackdrop.js';
import {FocusLossWatcher} from './focusLossWatcher.js';

// the popup widget - a vertical box with a search entry and scrollable results
// added to gnome's chrome layer so it floats above all windows
//
// to capture clicks outside the popup we do not use Main.pushModal because a
// modal grab swallows pointer events before they reach the stage instead we
// place a transparent full-screen reactive backdrop actor behind the popup
// any click on the backdrop closes the popup clicks on the popup itself are
// received normally because the popup sits above the backdrop in the chrome
//
// keyboard input is captured via grab_key_focus on the entry which receives
// all key events while it has focus the escape key closes the popup
//
// this class owns the lifecycle (open/close/destroy) and holds a
// SelectionManager, a ResultsRenderer, and a PopupKeyHandler which each own
// one slice of what used to all live in this file directly
export const SpotlightPopup = GObject.registerClass(
class SpotlightPopup extends St.BoxLayout {
    _init(extension) {
        super._init({
            style_class: 'spotlight-container',
            reactive: true,
            can_focus: true,
            visible: false,
            width: extension._settings.get_int('popup-width'),
        });
        // orientation set after init for gnome 45/46 compatibility
        // the Clutter.Orientation enum property was added in gnome 47
        this.set_vertical(true);

        this._settings = extension._settings;
        this._positionIdleId = 0;
        this._backdrop = null;
        this._stageKeyId = 0;
        this._focusWatcher = new FocusLossWatcher(this);

        const {entryBox, entry} = buildSearchEntry();
        this._entryBox = entryBox;
        this._entry = entry;

        const clutterText = this._entry.clutter_text;
        clutterText.set_x_expand(true);
        clutterText.connectObject(
            'text-changed', () => this._renderer.onTextChanged(this._entry.get_text()),
            this,
        );

        const {resultsScroll, resultsBox} = buildResultsContainer();
        this._resultsScroll = resultsScroll;
        this._resultsBox = resultsBox;

        this._selection = new SelectionManager(resultsBox, resultsScroll);
        this._keyHandler = new PopupKeyHandler(this, this._selection);
        this._renderer = new ResultsRenderer(
            resultsBox, resultsScroll, this._selection, this._settings,
            (r) => { r.activate(); this.close(); },
            (idx) => {
                // ignore hover selection briefly after keyboard nav
                // prevents scroll-induced enter-events from jumping selection
                if (GLib.get_monotonic_time() < this._keyHandler.suppressedUntil)
                    return;
                this._selection.applySelection(idx);
            }
        );

        this.add_child(this._entryBox);
        this.add_child(this._resultsScroll);

        // popup is added to chrome in open() after the backdrop
        // this ensures it naturally sits above the backdrop without needing
        // raise() or lower() calls which are unreliable on hidden actors
    }

    // position the popup at the center of the primary monitor
    // called once when the popup opens based on the empty-state height
    // the popup then grows downward from this fixed position as results appear
    // this prevents the popup from shifting upward when results grow
    _reposition() {
        const monitor = Main.layoutManager.primaryMonitor;
        const popupWidth = this._settings.get_int('popup-width');
        const [, naturalHeight] = this.get_preferred_height(popupWidth);
        this.set_position(
            Math.floor(monitor.x + (monitor.width - popupWidth) / 2),
            Math.floor(monitor.y + (monitor.height - naturalHeight) / 2),
        );
    }

    open() {
        if (this.visible)
            return;

        // create and show backdrop first then popup - later addition to
        // chrome means higher in the stacking order so popup naturally
        // sits above the backdrop
        this._backdrop = new PopupBackdrop(() => this.close());
        this._backdrop.show();

        // always re-add popup to chrome to guarantee correct stacking order
        // if popup was left in chrome from a previous close remove it first
        if (this.get_parent())
            Main.layoutManager.removeChrome(this);
        Main.layoutManager.addChrome(this);

        // queue a layout pass then position before showing
        // ensures get_preferred_height returns correct values
        // otherwise css may not be applied and height is wrong
        const popupWidth = this._settings.get_int('popup-width');
        this.set_width(popupWidth);
        this.queue_relayout();
        this._positionIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._positionIdleId = 0;
            if (!this._backdrop)
                return GLib.SOURCE_REMOVE;
            this._reposition();
            this.show();
            // grab focus only after the popup is visible
            // grabbing focus on a hidden actor fails silently
            this._entry.grab_key_focus();
            // capture key events at the stage level during capture phase
            // this guarantees we see enter/esc/arrows before st entry can
            // consume them which was the root cause of keyboard not working
            this._stageKeyId = global.stage.connect('captured-event',
                (_, event) => this._keyHandler.handleEvent(event));
            return GLib.SOURCE_REMOVE;
        });

        this._entry.set_text('');
        this._renderer.reset();

        // defer the focus-loss handler until after the popup is shown and
        // focus is grabbed otherwise notify::key-focus fires immediately
        // during the open call and closes the popup right away
        this._focusIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._focusIdleId = 0;
            if (!this.visible)
                return GLib.SOURCE_REMOVE;
            this._keyFocusId = global.stage.connect('notify::key-focus', () => {
                if (!this.visible)
                    return;
                const focus = global.stage.get_key_focus();
                if (!focus || focus === global.stage) {
                    this.close();
                    return;
                }
                if (!this.contains(focus))
                    this.close();
            });
            return GLib.SOURCE_REMOVE;
        });
    }

    close() {
        if (!this.visible)
            return;

        if (this._stageKeyId) {
            global.stage.disconnect(this._stageKeyId);
            this._stageKeyId = 0;
        }
        if (this._keyFocusId) {
            global.stage.disconnect(this._keyFocusId);
            this._keyFocusId = 0;
        }
        this._clearIdle('_focusIdleId');
        this._clearIdle('_positionIdleId');
        this._renderer.destroy();

        if (this._backdrop) {
            this._backdrop.destroy();
            this._backdrop = null;
        }

        this.hide();
    }

    _clearIdle(field) {
        if (this[field]) {
            GLib.source_remove(this[field]);
            this[field] = 0;
        }
    }

    // overridden so that disable() -> destroy() tears down everything cleanly:
    // closes the popup which removes the backdrop and focus handler then
    // removes us from the chrome layer and chains up to the parent destroy
    destroy() {
        this.close();
        Main.layoutManager.removeChrome(this);
        this._settings = null;
        super.destroy();
    }
});
