// spotlight - stage-level keyboard capture for the popup
// SPDX-License-Identifier: GPL-3.0-or-later

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

// captures key events at the stage level during the capture phase, before
// st entry can consume them - this was the fix for keyboard not working at
// all, see AGENTS.md for the full history of why this exists
//
// deduplicates rapid-fire navigation keys (see the isNavKey block below)
// but never deduplicates character keys, so typing is never affected. this
// class only decides what a keypress means - it never touches selection or
// results state directly, it calls back into the popup for all of that
export class PopupKeyHandler {
    constructor(popup, selection) {
        this._popup = popup;
        this._selection = selection;
        this._keyboardNavSuppressUntil = 0;
        this._lastNavKey = 0;
        this._lastNavKeyTime = 0;
    }

    handleEvent(event) {
        // captured-event receives all event types we only act on key press
        // events ignoring key release to prevent double-processing
        if (event.type() !== Clutter.EventType.KEY_PRESS)
            return Clutter.EVENT_PROPAGATE;

        const key = event.get_key_symbol();

        // safety guards since we capture at stage level
        if (!this._popup.visible)
            return Clutter.EVENT_PROPAGATE;

        const focus = global.stage.get_key_focus();
        if (!focus || !this._popup.contains(focus))
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
            this._popup.close();
            return Clutter.EVENT_STOP;
        case Clutter.KEY_Down:
            this._selection.moveSelection(1, this._suppressHover.bind(this));
            return Clutter.EVENT_STOP;
        case Clutter.KEY_Up:
            this._selection.moveSelection(-1, this._suppressHover.bind(this));
            return Clutter.EVENT_STOP;
        case Clutter.KEY_Return:
        case Clutter.KEY_KP_Enter:
            this._activateSelected();
            return Clutter.EVENT_STOP;
        default:
            return Clutter.EVENT_PROPAGATE;
        }
    }

    // suppress hover selection briefly after keyboard navigation
    // prevents scroll-induced enter-events from overwriting the selection
    // passed into SelectionManager.moveSelection as a callback since only
    // this class knows the suppression window, and only resultRow's hover
    // handler (via the popup's onHover callback) needs to check it
    _suppressHover() {
        this._keyboardNavSuppressUntil = GLib.get_monotonic_time() + 150000;
    }

    // exposed so the popup's onHover callback can check it before applying
    // a hover-triggered selection change
    get suppressedUntil() {
        return this._keyboardNavSuppressUntil;
    }

    _activateSelected() {
        const {results, selectedIndex} = this._selection;
        if (selectedIndex >= 0 && selectedIndex < results.length) {
            results[selectedIndex].activate();
            this._popup.close();
        } else if (results.length > 0) {
            results[0].activate();
            this._popup.close();
        }
    }
}
