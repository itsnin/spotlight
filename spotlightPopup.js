// spotlight - popup widget
// SPDX-License-Identifier: GPL-3.0-or-later

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import Shell from 'gi://Shell';
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
// uses a modal grab to capture all keyboard input while open
export const SpotlightPopup = GObject.registerClass(
class SpotlightPopup extends St.BoxLayout {
    _init(extension) {
        super._init({
            vertical: true,
            style_class: 'spotlight-container',
            reactive: true,
            can_focus: true,
            visible: false,
            width: extension._settings.get_int('popup-width'),
        });

        this._settings = extension._settings;
        this._results = [];
        this._selectedIndex = -1;
        this._searchIdleId = 0;
        this._grab = null;
        this._allocationChangedId = 0;

        const {entryBox, entry} = buildSearchEntry();
        this._entryBox = entryBox;
        this._entry = entry;

        const clutterText = this._entry.clutter_text;
        clutterText.set_x_expand(true);
        clutterText.connectObject(
            'text-changed', this._onTextChanged.bind(this),
            'key-press-event', this._onKeyPress.bind(this),
            this,
        );

        const {resultsScroll, resultsBox} = buildResultsContainer();
        this._resultsScroll = resultsScroll;
        this._resultsBox = resultsBox;

        this.add_child(this._entryBox);
        this.add_child(this._resultsScroll);

        Main.layoutManager.addChrome(this);
    }

    // recompute center position based on current natural height
    // called whenever results appear or disappear so the popup stays centered
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

        this._reposition();
        this.show();

        this._grab = Main.pushModal(this, {
            actionMode: Shell.ActionMode.POPUP,
        });

        if (this._grab) {
            this._grab.connectObject('notify::state', () => {
                if (this._grab && this._grab.get_state() === Clutter.GrabState.INVALID)
                    this.close();
            }, this);
        }

        // reposition whenever the allocation changes (results grow/shrink)
        this._allocationChangedId = this.connect('notify::allocation', () => {
            this._reposition();
        });

        this._entry.set_text('');
        this._selectedIndex = -1;
        this._resultsBox.destroy_all_children();
        this._resultsScroll.hide();
        this._entry.grab_key_focus();
    }

    close() {
        if (!this.visible)
            return;

        if (this._searchIdleId) {
            GLib.source_remove(this._searchIdleId);
            this._searchIdleId = 0;
        }

        if (this._allocationChangedId) {
            this.disconnect(this._allocationChangedId);
            this._allocationChangedId = 0;
        }

        if (this._grab) {
            this._grab.disconnectObject(this);
            Main.popModal(this._grab);
            this._grab = null;
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
            this._reposition();
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
        this._reposition();
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
                    (idx) => { this._applySelection(idx); }
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
        const adjustment = this._resultsScroll.get_vscroll_bar().get_adjustment();
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
        this._applySelection(newIndex);
    }

    _onKeyPress(_, event) {
        switch (event.get_key_symbol()) {
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
    // pops the modal grab, removes idle sources, disconnects the allocation
    // tracker, removes us from the chrome layer, then chains up to the parent
    destroy() {
        this.close();
        if (this._allocationChangedId) {
            this.disconnect(this._allocationChangedId);
            this._allocationChangedId = 0;
        }
        Main.layoutManager.removeChrome(this);
        this._results = [];
        this._settings = null;
        super.destroy();
    }
});
