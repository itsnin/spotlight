// spotlight - popup widget
// SPDX-License-Identifier: GPL-3.0-or-later

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {buildSearchEntry} from './searchEntry.js';
import {buildResultsContainer} from './resultsContainer.js';
import {buildResultRow} from './resultRow.js';
import {buildSectionHeader} from './sectionHeader.js';
import {buildNoResults} from './noResults.js';
import {getSectionTitle} from './sectionTitles.js';
import {runSearch} from './searchController.js';

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
        this._results = [];
        this._selectedIndex = -1;
        this._searchIdleId = 0;
        this._focusIdleId = 0;
        this._positionIdleId = 0;
        this._backdrop = null;
        this._keyFocusId = 0;
        this._stageKeyId = 0;
        this._keyboardNavSuppressUntil = 0;
        this._lastNavKey = 0;
        this._lastNavKeyTime = 0;

        const {entryBox, entry} = buildSearchEntry();
        this._entryBox = entryBox;
        this._entry = entry;

        const clutterText = this._entry.clutter_text;
        clutterText.set_x_expand(true);
        clutterText.connectObject(
            'text-changed', this._onTextChanged.bind(this),
            this,
        );

        const {resultsScroll, resultsBox} = buildResultsContainer();
        this._resultsScroll = resultsScroll;
        this._resultsBox = resultsBox;

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

    // create a transparent full-screen reactive actor that sits behind the popup
    // any click on it closes the popup this is how we detect click-outside
    // without using a modal grab which would swallow pointer events
    _createBackdrop() {
        const backdrop = new St.Widget({
            reactive: true,
            can_focus: false,
            visible: false,
        });

        const monitor = Main.layoutManager.primaryMonitor;
        backdrop.set_size(monitor.width, monitor.height);
        backdrop.set_position(monitor.x, monitor.y);

        backdrop.connectObject('button-release-event', () => {
            this.close();
            return Clutter.EVENT_STOP;
        }, backdrop);

        return backdrop;
    }

    open() {
        if (this.visible)
            return;

        // create and add backdrop first then popup
        // later addition to chrome means higher in the stacking order
        // so popup naturally sits above the backdrop
        this._backdrop = this._createBackdrop();
        Main.layoutManager.addChrome(this._backdrop);
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
                this._onKeyPress.bind(this));
            return GLib.SOURCE_REMOVE;
        });

        this._entry.set_text('');
        this._selectedIndex = -1;
        this._resultsBox.destroy_all_children();
        this._resultsScroll.hide();

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

        if (this._focusIdleId) {
            GLib.source_remove(this._focusIdleId);
            this._focusIdleId = 0;
        }

        if (this._positionIdleId) {
            GLib.source_remove(this._positionIdleId);
            this._positionIdleId = 0;
        }

        if (this._searchIdleId) {
            GLib.source_remove(this._searchIdleId);
            this._searchIdleId = 0;
        }

        if (this._backdrop) {
            this._backdrop.disconnectObject(this._backdrop);
            Main.layoutManager.removeChrome(this._backdrop);
            this._backdrop.destroy();
            this._backdrop = null;
        }

        this.hide();
    }

    _onTextChanged() {
        const text = this._entry.get_text();

        if (this._searchIdleId) {
            GLib.source_remove(this._searchIdleId);
            this._searchIdleId = 0;
        }

        if (text.trim().length === 0) {
            this._results = [];
            this._selectedIndex = -1;
            this._resultsBox.destroy_all_children();
            this._resultsScroll.hide();
            return;
        }

        this._searchIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._searchIdleId = 0;
            this._runSearch(text);
            return GLib.SOURCE_REMOVE;
        });
    }

    _runSearch(text) {
        this._results = runSearch(text, this._settings);
        this._resultsBox.destroy_all_children();

        if (this._results.length === 0) {
            this._resultsBox.add_child(buildNoResults(text.trim()));
        } else {
            this._renderResults();
            this._applySelection(0, true);
        }

        this._resultsScroll.show();
    }

    _renderResults() {
        let lastType = null;
        let rowIndex = 0;
        for (const result of this._results) {
            if (result.type !== lastType) {
                lastType = result.type;
                this._resultsBox.add_child(buildSectionHeader(getSectionTitle(result.type)));
            }
            this._resultsBox.add_child(
                buildResultRow(result, rowIndex,
                    (r) => { r.activate(); this.close(); },
                    (idx) => {
                        // ignore hover selection briefly after keyboard nav
                        // prevents scroll-induced enter-events from jumping selection
                        if (GLib.get_monotonic_time() < this._keyboardNavSuppressUntil)
                            return;
                        this._applySelection(idx);
                    }
                )
            );
            rowIndex++;
        }
    }

    // applies the selection style, and scrolls the row into view unless
    // skipScroll is set - used right after a fresh render where rows have
    // not been through a layout pass yet, so they have no allocation box
    // to scroll to (and none is needed, since a freshly rendered list is
    // already scrolled to the top where row 0 lives)
    _applySelection(index, skipScroll = false) {
        if (this._selectedIndex >= 0 && this._selectedIndex < this._results.length) {
            const oldRow = this._getResultRow(this._selectedIndex);
            if (oldRow)
                oldRow.remove_style_class_name('spotlight-selected');
        }

        this._selectedIndex = index;

        if (index >= 0 && index < this._results.length) {
            const newRow = this._getResultRow(index);
            if (newRow) {
                newRow.add_style_class_name('spotlight-selected');
                if (!skipScroll)
                    this._scrollRowIntoView(newRow);
            }
        }
    }

    _scrollRowIntoView(row) {
        const scrollbar = this._resultsScroll.get_vscroll_bar();
        if (!scrollbar)
            return;
        const adjustment = scrollbar.get_adjustment();
        const rowY = row.get_allocation_box().y1;
        const rowHeight = row.get_allocation_box().get_height();
        if (rowY < adjustment.value)
            adjustment.value = rowY;
        else if (rowY + rowHeight > adjustment.value + adjustment.page_size)
            adjustment.value = rowY + rowHeight - adjustment.page_size;
    }

    _getResultRow(resultIndex) {
        for (const child of this._resultsBox.get_children()) {
            if (child._resultIndex === resultIndex)
                return child;
        }
        return null;
    }

    _moveSelection(delta) {
        if (this._results.length === 0)
            return;
        let newIndex = this._selectedIndex + delta;
        if (newIndex < 0)
            newIndex = this._results.length - 1;
        if (newIndex >= this._results.length)
            newIndex = 0;
        // suppress hover selection briefly after keyboard navigation
        // prevents scroll-induced enter-events from overwriting the selection
        this._keyboardNavSuppressUntil = GLib.get_monotonic_time() + 150000;
        this._applySelection(newIndex);
    }

    _onKeyPress(_, event) {
        // captured-event receives all event types we only act on key press
        // events ignoring key release to prevent double-processing
        if (event.type() !== Clutter.EventType.KEY_PRESS)
            return Clutter.EVENT_PROPAGATE;

        const key = event.get_key_symbol();

        // safety guards since we capture at stage level
        if (!this.visible)
            return Clutter.EVENT_PROPAGATE;

        const focus = global.stage.get_key_focus();
        if (!focus || !this.contains(focus))
            return Clutter.EVENT_PROPAGATE;

        // only deduplicate navigation keys not character keys
        // some systems fire two key_press events for a single physical tap
        // before the key_release this causes arrow navigation to jump by 2
        // we track the last nav key and time and ignore repeats within 50ms
        // character keys are never deduplicated so fast typing works normally
        const isNavKey = key === Clutter.KEY_Up || key === Clutter.KEY_Down ||
                         key === Clutter.KEY_Return || key === Clutter.KEY_KP_Enter ||
                         key === Clutter.KEY_Escape;
        if (isNavKey) {
            const time = event.get_time();
            if (key === this._lastNavKey && time - this._lastNavKeyTime < 50)
                return Clutter.EVENT_STOP;
            this._lastNavKey = key;
            this._lastNavKeyTime = time;
        }

        switch (key) {
        case Clutter.KEY_Escape:
            this.close();
            return Clutter.EVENT_STOP;
        case Clutter.KEY_Down:
            this._moveSelection(1);
            return Clutter.EVENT_STOP;
        case Clutter.KEY_Up:
            this._moveSelection(-1);
            return Clutter.EVENT_STOP;
        case Clutter.KEY_Return:
        case Clutter.KEY_KP_Enter:
            if (this._selectedIndex >= 0 && this._selectedIndex < this._results.length) {
                this._results[this._selectedIndex].activate();
                this.close();
            } else if (this._results.length > 0) {
                this._results[0].activate();
                this.close();
            }
            return Clutter.EVENT_STOP;
        default:
            return Clutter.EVENT_PROPAGATE;
        }
    }

    // overridden so that disable() -> destroy() tears down everything cleanly:
    // closes the popup which removes the backdrop and focus handler then
    // removes us from the chrome layer and chains up to the parent destroy
    destroy() {
        this.close();
        Main.layoutManager.removeChrome(this);
        this._results = [];
        this._settings = null;
        super.destroy();
    }
});
