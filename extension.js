// Spotlight: a compact launcher for GNOME Shell
// SPDX-License-Identifier: GPL-3.0-or-later
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {SpotlightPopup} from './lib/ui/spotlightPopup.js';
import {KeybindingManager} from './lib/core/keybinding.js';

// Entry point. Keeping enable and disable adjacent makes the cleanup symmetry obvious at a glance.
export default class SpotlightExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._popup = new SpotlightPopup(this._settings);
        // Steal the overview search widgets permanently. The overview search stays gone
        // for as long as Spotlight is loaded, which is the whole point of the extension.
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
        // Return the stolen widgets to the overview before destroying things so nothing leaks.
        this._popup.returnOverviewSearch();
        this._popup.destroy();
        this._popup = null;
        this._settings = null;
    }
}
