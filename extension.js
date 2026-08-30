// spotlight - a compact launcher for gnome shell
// SPDX-License-Identifier: GPL-3.0-or-later
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {SpotlightPopup} from './spotlightPopup.js';
import {KeybindingManager} from './services/core/keybinding.js';
import {ClipboardManager} from './services/clipboard/manager.js';
import {EmojiData} from './services/emoji/data.js';
import {ClipboardView} from './popup/clipboardView.js';
import {EmojiView} from './popup/emojiView.js';
import {ClipboardPopup} from './popup/clipboardPopup.js';
import {EmojiPopup} from './popup/emojiPopup.js';
import {destroyDevice, triggerPaste} from './services/core/virtualKeyboard.js';



// entry point enable and disable are kept next to each other for easy review
export default class SpotlightExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._ = _;
        // services
        this._clipboardManager = new ClipboardManager(this._settings, this.uuid);
        this._clipboardManager.start();
        this._emojiData = new EmojiData(this.path, this._settings);

        // create views for the separate popups
        this._clipboardView = new ClipboardView(
            this._clipboardManager,
            this._settings,
            () => this._clipboardPopup.close(),
            () => this._triggerPaste(),
            _,
        );

        this._emojiView = new EmojiView(
            this._emojiData,
            this._settings,
            () => this._emojiPopup.close(),
            () => this._triggerPaste(),
            _,
        );

        // main Spotlight popup = search only
        // mode buttons trigger separate popups
        this._popup = new SpotlightPopup(this._settings);

        // create separate dedicated popups
        this._clipboardPopup = new ClipboardPopup(this._clipboardView, _);
        this._emojiPopup = new EmojiPopup(this._emojiView, _);

        // permanently steal overview search widgets on enable
        // overview search is gone for as long as spotlight is enabled
        this._popup.stealOverviewSearch();

        this._keybindingManager = new KeybindingManager();
        this._keybindingManager.enable();


        // register all shortcuts
        this._registerShortcuts();

        // reconnect all shortcuts when any changes in settings
        this._settings.connectObject(
            'changed::toggle-shortcut',
            () => this._registerShortcuts(),
            'changed::clipboard-shortcut',
            () => this._registerShortcuts(),
            'changed::emoji-shortcut',
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
                if (this._popup.visible)
                    this._popup.close();
                else if (this._clipboardPopup.visible)
                    this._clipboardPopup.close();
                else if (this._emojiPopup.visible)
                    this._emojiPopup.close();
                else
                    this._popup.open();
            });
        }
        // clipboard shortcut
        const clipboardShortcuts = this._settings.get_strv('clipboard-shortcut');
        if (clipboardShortcuts.length > 0) {
            this._keybindingManager.listenFor(clipboardShortcuts[0], () => {
                if (this._popup.visible)
                    this._popup.close();
                if (this._emojiPopup.visible)
                    this._emojiPopup.close();
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
                    // guard against extension being disabled during the 50ms window
                    if (this._clipboardPopup)
                        this._clipboardPopup.open();
                    return GLib.SOURCE_REMOVE;
                });
            });
        }
        // emoji shortcut
        const emojiShortcuts = this._settings.get_strv('emoji-shortcut');
        if (emojiShortcuts.length > 0) {
            this._keybindingManager.listenFor(emojiShortcuts[0], () => {
                if (this._popup.visible)
                    this._popup.close();
                if (this._clipboardPopup.visible)
                    this._clipboardPopup.close();
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
                    // guard against extension being disabled during the 50ms window
                    if (this._emojiPopup)
                        this._emojiPopup.open();
                    return GLib.SOURCE_REMOVE;
                });
            });
        }
    }

    _triggerPaste() {
        triggerPaste();
    }

    disable() {
        this._settings.disconnectObject(this);

        this._keybindingManager.disable();
        this._keybindingManager = null;

        // stop services
        this._clipboardManager.stop();
        this._clipboardManager.destroy();
        this._clipboardManager = null;

        this._emojiData.flush();
        this._emojiData = null;

        destroyDevice();

        // disable standalone features
        // views destroyed by popup destroy
        // return stolen widgets back to overview before destroying
        this._popup.returnOverviewSearch();
        this._popup.destroy();
        this._popup = null;
        this._clipboardPopup.destroy();
        this._clipboardPopup = null;
        this._emojiPopup.destroy();
        this._emojiPopup = null;

        this._settings = null;
        this._ = null;
    }
}
