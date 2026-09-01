// spotlight - clipboard popup wrapper
// SPDX-License-Identifier: GPL-3.0-or-later
// Creates a ClipboardIndicator (PanelMenu.Button) but does NOT add it to the
// top panel. The menu is opened/closed via shortcut only.
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { ClipboardIndicator } from '../services/clipboard/indicator.js';

export class ClipboardPopup {
    constructor(settings, openSettings, uuid) {
        this._indicator = new ClipboardIndicator({
            clipboard: St.Clipboard.get_default(),
            settings: settings,
            openSettings: openSettings,
            uuid: uuid,
        });
    }

    open() {
        if (this._indicator.menu.isOpen) return;
        this._indicator.menu.open();
    }

    close() {
        if (!this._indicator.menu.isOpen) return;
        this._indicator.menu.close();
    }

    get isOpen() {
        return this._indicator.menu.isOpen;
    }

    destroy() {
        this._indicator.destroy();
        this._indicator = null;
    }
}
