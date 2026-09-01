// spotlight - click-outside backdrop for the popup
// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// owns its own add and remove from chrome so spotlightPopup.js just calls
// show and destroy it never has to know how the backdrop gets on screen
export class PopupBackdrop {
    constructor(onClickOutside, monitor) {
        // a transparent full-screen reactive actor that sits behind the popup in
        // the chrome layer any click on it closes the popup which is how we
        // detect click-outside without a modal grab swallowing pointer events
        this._actor = new St.Widget({
            reactive: true,
            can_focus: false,
            visible: false,
        });
        // cover only the target monitor where the popup appears
        // users on other monitors can interact normally
        this._actor.set_size(monitor.width, monitor.height);
        this._actor.set_position(monitor.x, monitor.y);
        // before they reach the stage clicks outside the popup land here
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
