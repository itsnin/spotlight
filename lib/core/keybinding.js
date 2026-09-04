// Spotlight: keybinding manager
// SPDX-License-Identifier: GPL-3.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

// Grab keys through Mutter directly instead of GSettings. addKeybinding can fail
// silently when the schema is not ready at enable time, this approach avoids that.
export class KeybindingManager {
    enable() {
        this._grabbers = {};

        global.display.connectObject('accelerator-activated', (_, action) => {
            const grabber = this._grabbers[action];
            if (grabber)
                grabber.callback();
        }, this);
    }

    disable() {
        this.unlisten();
        global.display.disconnectObject(this);
    }

    listenFor(accelerator, callback) {
        const action = global.display.grab_accelerator(accelerator, 0);

        if (action === Meta.KeyBindingAction.NONE)
            return false;

        const name = Meta.external_binding_name_for_action(action);
        Main.wm.allowKeybinding(name, Shell.ActionMode.ALL);
        this._grabbers[action] = {name, accelerator, callback};
        return true;
    }

    unlisten() {
        for (const k of Object.keys(this._grabbers)) {
            Main.wm.removeKeybinding(this._grabbers[k].name);
            global.display.ungrab_accelerator(parseInt(k, 10));
        }
        this._grabbers = {};
    }
}
