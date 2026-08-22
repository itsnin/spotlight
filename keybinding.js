// spotlight - keybinding manager
// SPDX-License-Identifier: GPL-3.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';

// grabs keys via mutter instead of gsettings
// more reliable than addkeybinding which can fail if schema is not ready at enable time
//
// for alt space we handle a conflict with mutter activate-window-menu
// which defaults to alt space powertoys run on windows solves the same problem
// with a low level keyboard hook on gnome grab_accelerator serves the same role
// but if the grab fails we temporarily disable activate-window-menu via gsettings
// and restore it on disable this matches what users expect from powertoys
export class KeybindingManager {
    enable() {
        this._grabbers = {};
        this._wmSettings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.wm.keybindings',
        });
        this._savedWindowMenu = null;
        global.display.connectObject('accelerator-activated', (_, action) => {
            const grabber = this._grabbers[action];
            if (grabber)
                grabber.callback();
        }, this);
    }
    disable() {
        this.unlisten();
        global.display.disconnectObject(this);
        // restore window menu keybinding if we disabled it
        if (this._savedWindowMenu !== null) {
            this._wmSettings.set_strv('activate-window-menu', this._savedWindowMenu);
            this._savedWindowMenu = null;
        }
        this._wmSettings = null;
    }
    listenFor(accelerator, callback) {
        let action = global.display.grab_accelerator(accelerator, 0);

        // alt space conflicts with mutter activate-window-menu default
        // if grab failed and this is alt space temporarily disable the wm binding
        if (action === Meta.KeyBindingAction.NONE && accelerator === '<Alt>space') {
            this._savedWindowMenu = this._wmSettings.get_strv('activate-window-menu');
            this._wmSettings.set_strv('activate-window-menu', []);
            // try grab again now that wm binding is disabled
            action = global.display.grab_accelerator(accelerator, 0);
            // if second grab also fails restore wm binding before returning
            if (action === Meta.KeyBindingAction.NONE) {
                this._wmSettings.set_strv('activate-window-menu', this._savedWindowMenu);
                this._savedWindowMenu = null;
            }
        }

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
        // restore window menu keybinding if we disabled it
        if (this._savedWindowMenu !== null) {
            this._wmSettings.set_strv('activate-window-menu', this._savedWindowMenu);
            this._savedWindowMenu = null;
        }
    }
}
