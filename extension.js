// spotlight - a compact launcher for gnome shell
// SPDX-License-Identifier: GPL-3.0-or-later
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {SpotlightPopup} from './spotlightPopup.js';
import {KeybindingManager} from './services/core/keybinding.js';

// entry point enable and disable are kept next to each other for easy review
export default class SpotlightExtension extends Extension {
    async enable() {
        this._settings = this.getSettings();
        this._ = _;

        // main Spotlight popup = search only
        this._popup = new SpotlightPopup(this._settings);

        // permanently steal overview search widgets on enable
        this._popup.stealOverviewSearch();

        this._keybindingManager = new KeybindingManager();
        this._keybindingManager.enable();

        // register main toggle shortcut
        this._registerShortcuts();

        // reconnect shortcut when setting changes
        this._settings.connectObject(
            'changed::toggle-shortcut',
            () => this._registerShortcuts(),
            this,
        );
    }

    _registerShortcuts() {
        this._keybindingManager.unlisten();

        // main toggle shortcut
        const toggleShortcuts = this._settings.get_strv('toggle-shortcut');
        if (toggleShortcuts.length > 0) {
            this._keybindingManager.listenFor(toggleShortcuts[0], () => {
                if (!this._popup) return;
                if (this._popup.visible)
                    this._popup.close();
                else
                    this._popup.open();
            });
        }
    }

    disable() {
        this._settings.disconnectObject(this);
        this._keybindingManager.disable();
        this._keybindingManager = null;

        // return stolen widgets back to overview before destroying
        if (this._popup) {
            this._popup.returnOverviewSearch();
            this._popup.destroy();
            this._popup = null;
        }

        this._settings = null;
        this._ = null;
    }
}
