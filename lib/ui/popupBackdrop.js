// Spotlight: click-outside backdrop for the popup
// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// Handles its own chrome lifecycle so spotlightPopup.js can just call show and
// destroy without needing to know how the backdrop actually gets on screen.
export class PopupBackdrop {
    constructor(onClickOutside, monitor) {
        // Transparent full-screen actor behind the popup in the chrome layer.
        // Clicks outside land here and close us. A modal grab would swallow pointer events entirely, which is why we use this approach instead.
        this._actor = new St.Widget({
            reactive: true,
            can_focus: false,
            visible: false,
        });
        // Covers only the target monitor. Users on other monitors keep working normally.
        this._actor.set_size(monitor.width, monitor.height);
        this._actor.set_position(monitor.x, monitor.y);
        // Clicks outside land here before reaching the stage, which is the whole point.
        this._actor.connectObject('button-release-event', () => {
            onClickOutside();
            return Clutter.EVENT_STOP;
        }, this._actor);
    }

    show() {
        Main.layoutManager.addChrome(this._actor);
        this._actor.show();
    }

    destroy() {
        this._actor.disconnectObject(this._actor);
        Main.layoutManager.removeChrome(this._actor);
        this._actor.destroy();
    }
}
