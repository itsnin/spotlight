// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {PopupBackdrop} from './popupBackdrop.js';
import {PopupPositioner} from './popupPositioner.js';

export class ClipboardPopup extends St.Widget {
    static {
        GObject.registerClass(this);
    }

    constructor(clipboardView, gettext) {
        super({
            layout_manager: new Clutter.BinLayout(),
            visible: false,
            reactive: true,
        });

        this._view = clipboardView;
        this._ = gettext;
        this._visible = false;
        this._closeIdleId = 0;

        // Backdrop for outside-click dismissal
        const monitor = Main.layoutManager.primaryMonitor ?? Main.layoutManager.monitors[0];
        if (!monitor) return;
        this._backdrop = new PopupBackdrop(() => this.close(), monitor);

        // Positioner centers the popup
        this._positioner = new PopupPositioner();

        // Container
        this._content = new St.BoxLayout({
            style_class: 'spotlight-container clipboard-popup',
            vertical: true,
            width: 560,
        });
        this.add_child(this._content);

        // Header with title
        const header = new St.BoxLayout({
            style: 'padding: 12px 16px 4px;',
            vertical: false,
        });
        const title = new St.Label({
            text: this._('Clipboard History'),
            style: 'font-weight: bold; font-size: 14px;',
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        header.add_child(title);
        this._content.add_child(header);

        // Add the clipboard view
        this._view.style = 'padding: 4px 12px 12px;';
        this._content.add_child(this._view);

        // Capture escape key
        global.stage.connectObject(
            'captured-event', (actor, event) => {
                if (!this._visible) return Clutter.EVENT_PROPAGATE;
                if (event.type() === Clutter.EventType.KEY_PRESS &&
                    event.get_key_symbol() === Clutter.KEY_Escape) {
                    this.close();
                    return Clutter.EVENT_STOP;
                }
                return Clutter.EVENT_PROPAGATE;
            },
            this,
        );
    }

    open() {
        if (this._visible) return;
        try {
            this._visible = true;

        // Add backdrop (show() handles addChrome internally)
        this._backdrop.show();

        // Add and position ourself
        Main.layoutManager.addChrome(this);
        this._positioner.centerOnPrimary(this);
        this.visible = true;
        this.opacity = 0;
        this.ease({
            opacity: 255,
            duration: 150,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });

        // Refresh view to show latest data
        if (this._view.refresh)
            this._view.refresh();
        // Focus the view's search
        if (this._view.focusSearch)
            this._view.focusSearch();
        } catch (e) {
            log('Spotlight clipboardPopup open error: ' + e);
            this._visible = false;
        }
    }

    close() {
        if (!this._visible) return;
        this._visible = false;

        this.ease({
            opacity: 0,
            duration: 100,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
                this.visible = false;
                Main.layoutManager.removeChrome(this);
                this._backdrop.hide();
            },
        });
    }

    destroy() {
        if (this._closeIdleId) {
            GLib.source_remove(this._closeIdleId);
            this._closeIdleId = 0;
        }
        if (this._backdrop) {
            this._backdrop.destroy();
            this._backdrop = null;
        }
        global.stage.disconnectObject(this);
        super.destroy();
    }
}
