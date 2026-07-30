// keybinding manager for spotlight
// SPDX-License-Identifier: GPL-3.0-or-later

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

// grabs keys via mutter instead of gsettings
// more reliable than addkeybinding which can fail if schema isn't ready at enable time
export class KeybindingManager {
    private _grabbers: Record<number, {name: string; accelerator: string; callback: () => void}>;
    private _eventId: number;

    constructor() {
        this._grabbers = {};
        this._eventId = 0;
    }

    enable(): void {
        this._grabbers = {};
        this._eventId = global.display.connect('accelerator-activated', (_: any, action: number) => {
            const grabber = this._grabbers[action];
            if (grabber)
                grabber.callback();
        });
    }

    disable(): void {
        this.unlisten();
        global.display.disconnect(this._eventId);
    }

    listenFor(accelerator: string, callback: () => void): boolean {
        // grab_accelerator returns none if the key is already grabbed by something else
        const action = global.display.grab_accelerator(accelerator, 0);
        if (action === Meta.KeyBindingAction.NONE)
            return false;

        const name = Meta.external_binding_name_for_action(action);
        Main.wm.allowKeybinding(name, Shell.ActionMode.ALL);
        this._grabbers[action] = {name, accelerator, callback};
        return true;
    }

    unlisten(): void {
        for (const k of Object.keys(this._grabbers)) {
            Main.wm.removeKeybinding(this._grabbers[Number(k)].name);
            global.display.ungrab_accelerator(parseInt(k, 10));
        }
        this._grabbers = {};
    }
}
