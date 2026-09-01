// spotlight - integrates Copyous clipboard manager and emoji-copy features
// SPDX-License-Identifier: GPL-3.0-or-later
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {SpotlightPopup} from './spotlightPopup.js';
import {KeybindingManager} from './services/core/keybinding.js';
import {PrefixedSettings} from './services/prefixedSettings.js';
import CopyousExtension from './lib/copyousEntry.js';
import {EmojiPopup} from './popup/emojiPopup.js';

// Copyous schema ID (kept separate because it uses child schemas)
const COPYOUS_SCHEMA = 'org.gnome.shell.extensions.copyous';
const COPYOUS_UUID = 'copyous@boerdereinar.dev';

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

        // --- Copyous clipboard manager ---
        this._copyous = this._createCopyousInstance();
        this._copyous.enable();
        // Hide the panel indicator that Copyous adds
        const copyousIndicator = Main.panel.statusArea[COPYOUS_UUID];
        if (copyousIndicator) copyousIndicator.visible = false;

        // --- Emoji popup ---
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

    /**
     * Create a CopyousExtension instance with adapted metadata.
     * Copyous uses child schemas so its schema is kept separate.
     */
    _createCopyousInstance() {
        const metadata = {
            uuid: COPYOUS_UUID,
            path: this.path,
            dir: this.dir,
            metadata: {
                uuid: COPYOUS_UUID,
                name: 'Copyous',
                version: 9,
            },
        };

        const instance = new CopyousExtension(metadata);

        // Override getSettings to return Copyous schema settings
        instance.getSettings = () => new Gio.Settings({ schema: COPYOUS_SCHEMA });

        // Override getLogger — provide simple console-based logger
        instance.getLogger = () => ({
            debug: (...args) => console.debug('[copyous]', ...args),
            info: (...args) => console.info('[copyous]', ...args),
            warning: (...args) => console.warn('[copyous]', ...args),
            error: (...args) => console.error('[copyous]', ...args),
            log: (...args) => console.log('[copyous]', ...args),
        });

        return instance;
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

        // Ctrl+1 — open Copyous clipboard dialog
        const cbShortcuts = this._settings.get_strv('clipboard-shortcut');
        if (cbShortcuts.length > 0) {
            this._keybindingManager.listenFor(cbShortcuts[0], () => {
                if (this._popup?.visible) this._popup.close();
                if (this._emojiPopup?.isOpen) {
                    this._emojiPopup.close();
                    return;
                }
                if (this._copyous?.clipboardDialog) {
                    this._copyous.clipboardDialog.toggle();
                }
            });
        }

        // Ctrl+2 — open emoji popup
        const emShortcuts = this._settings.get_strv('emoji-shortcut');
        if (emShortcuts.length > 0) {
            this._keybindingManager.listenFor(emShortcuts[0], () => {
                if (this._popup?.visible) this._popup.close();
                if (this._copyous?.clipboardDialog?.opened) {
                    this._copyous.clipboardDialog.close();
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
        if (this._copyous?.clipboardDialog?.opened) {
            this._copyous.clipboardDialog.close();
        }
        if (this._emojiPopup?.isOpen) this._emojiPopup.close();
    }

    disable() {
        this._settings.disconnectObject(this);
        this._keybindingManager.disable();
        this._keybindingManager = null;

        // Clean up emoji first
        if (this._emojiPopup) {
            this._emojiPopup.destroy();
            this._emojiPopup = null;
        }

        // Clean up Copyous
        if (this._copyous) {
            this._copyous.disable();
            this._copyous = null;
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
