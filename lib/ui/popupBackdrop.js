// Spotlight: click-outside backdrop for the popup
// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// Handles its own addition and removal from chrome so spotlightPopup.js just
// calls show and destroy without needing to know how the backdrop actually gets on screen.
export class PopupBackdrop {
    constructor(onClickOutside, monitor) {
        // A transparent full-screen reactive actor sitting behind the popup in
        // the chrome layer. Any click lands here and closes the popup, which lets
        // us detect clicks outside without using a modal grab that would swallow pointer events.
        this._actor = new St.Widget({
            reactive: true,
            can_focus: false,
            visible: false,
        });
        // Covers only the target monitor where the popup appears.
        // Users on other monitors can keep interacting with things normally.
        this._actor.set_size(monitor.width, monitor.height);
        this._actor.set_position(monitor.x, monitor.y);
        // Clicks outside the popup land here before they can reach the stage.
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
