// spotlight - integrates clipboard-indicator and emoji-copy features
// SPDX-License-Identifier: GPL-3.0-or-later
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {SpotlightPopup} from './spotlightPopup.js';
import {KeybindingManager} from './services/core/keybinding.js';
import {PrefixedSettings} from './services/prefixedSettings.js';
import {ClipboardPopup} from './popup/clipboardPopup.js';
import {EmojiPopup} from './popup/emojiPopup.js';

export default class SpotlightExtension extends Extension {
    async enable() {
        this._settings = this.getSettings();
        this._ = _;

        // --- Core Spotlight popup (search only) ---
        this._popup = new SpotlightPopup(this._settings);
        this._popup.stealOverviewSearch();

        // --- Keybinding manager ---
        this._keybindingManager = new KeybindingManager();
        this._keybindingManager.enable();

        // --- Clipboard: wrap settings with clipboard- prefix for upstream code ---
        const cbSettings = new PrefixedSettings(this._settings, 'clipboard-');
        this._clipboardPopup = new ClipboardPopup(
            cbSettings,
            () => console.warn('[spotlight] clipboard openSettings not implemented'),
            this.uuid,
        );

        // --- Emoji: wrap settings with emoji- prefix, initialize async ---
        const emSettings = new PrefixedSettings(this._settings, 'emoji-');
        this._emojiPopup = new EmojiPopup(emSettings, this.path, _);
        await this._emojiPopup.initialize();

        // --- Register all shortcuts ---
        this._registerShortcuts();

        // Reconnect when shortcuts change
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

        // Ctrl+Space — main Spotlight toggle
        const toggleShortcuts = this._settings.get_strv('toggle-shortcut');
        if (toggleShortcuts.length > 0) {
            this._keybindingManager.listenFor(toggleShortcuts[0], () => {
                if (!this._popup) return;
                if (this._popup.visible) {
                    this._popup.close();
                } else {
                    this._closeAllPopups();
                    this._popup.open();
                }
            });
        }

        // Ctrl+1 — open clipboard-indicator original PopupMenu
        const cbShortcuts = this._settings.get_strv('clipboard-shortcut');
        if (cbShortcuts.length > 0) {
            this._keybindingManager.listenFor(cbShortcuts[0], () => {
                if (this._popup?.visible) this._popup.close();
                if (this._emojiPopup?.isOpen) {
                    this._emojiPopup.close();
                    return;
                }
                if (this._clipboardPopup) {
                    if (this._clipboardPopup.isOpen)
                        this._clipboardPopup.close();
                    else
                        this._clipboardPopup.open();
                }
            });
        }

        // Ctrl+2 — open emoji-copy original PopupMenu
        const emShortcuts = this._settings.get_strv('emoji-shortcut');
        if (emShortcuts.length > 0) {
            this._keybindingManager.listenFor(emShortcuts[0], () => {
                if (this._popup?.visible) this._popup.close();
                if (this._clipboardPopup?.isOpen) {
                    this._clipboardPopup.close();
                    return;
                }
                if (this._emojiPopup) {
                    if (this._emojiPopup.isOpen)
                        this._emojiPopup.close();
                    else
                        this._emojiPopup.open();
                }
            });
        }
    }

    _closeAllPopups() {
        if (this._clipboardPopup?.isOpen) this._clipboardPopup.close();
        if (this._emojiPopup?.isOpen) this._emojiPopup.close();
    }

    disable() {
        this._settings.disconnectObject(this);
        this._keybindingManager.disable();
        this._keybindingManager = null;

        // Clean up emoji first (async resources)
        if (this._emojiPopup) {
            this._emojiPopup.destroy();
            this._emojiPopup = null;
        }

        // Clean up clipboard
        if (this._clipboardPopup) {
            this._clipboardPopup.destroy();
            this._clipboardPopup = null;
        }

        // Return stolen widgets back to overview
        if (this._popup) {
            this._popup.returnOverviewSearch();
            this._popup.destroy();
            this._popup = null;
        }

        this._settings = null;
        this._ = null;
    }
}
