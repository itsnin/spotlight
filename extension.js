// spotlight - a compact launcher for gnome shell
// SPDX-License-Identifier: GPL-3.0-or-later
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {SpotlightPopup} from './spotlightPopup.js';
import {KeybindingManager} from './services/core/keybinding.js';

// entry point enable and disable are kept next to each other for easy review
export default class SpotlightExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._popup = new SpotlightPopup(this._settings);
        // permanently steal overview search widgets on enable
        // overview search is gone for as long as spotlight is enabled
        this._popup.stealOverviewSearch();
        this._keybindingManager = new KeybindingManager();
        this._keybindingManager.enable();
        const shortcuts = this._settings.get_strv('toggle-shortcut');
        const accelerator = shortcuts.length > 0 ? shortcuts[0] : '<Control>space';
        if (shortcuts.length === 0)
            this._settings.set_strv('toggle-shortcut', [accelerator]);
        this._grabShortcut(accelerator);
        this._settings.connectObject('changed::toggle-shortcut', () => {
            this._keybindingManager.unlisten();
            const arr = this._settings.get_strv('toggle-shortcut');
            if (arr.length > 0)
                this._grabShortcut(arr[0]);
        }, this);
    }
    _grabShortcut(accelerator) {
        this._keybindingManager.listenFor(accelerator, () => {
            if (this._popup.visible)
                this._popup.close();
            else
                this._popup.open();
        });
    }
    disable() {
        this._settings.disconnectObject(this);
        this._keybindingManager.disable();
        this._keybindingManager = null;
        // return stolen widgets back to overview before destroying
        this._popup.returnOverviewSearch();
        this._popup.destroy();
        this._popup = null;
        this._settings = null;
    }
}
