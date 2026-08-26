// spotlight - a compact launcher for gnome shell
// SPDX-License-Identifier: GPL-3.0-or-later
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {SpotlightPopup} from './spotlightPopup.js';
import {KeybindingManager} from './services/keybinding.js';
import {ClipboardManager} from './services/clipboardManager.js';
import {EmojiData} from './services/emojiData.js';
import {ClipboardView} from './popup/clipboardView.js';
import {EmojiView, destroyTooltip} from './popup/emojiView.js';
import {destroyDevice} from './services/virtualKeyboard.js';
import {CaffeineIndicator} from './services/caffeine/caffeineIndicator.js';
import * as CaffeineKeys from './services/caffeine/inhibitorManager.js';
// entry point enable and disable are kept next to each other for easy review
export default class SpotlightExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._ = _;
        this._caffeineIndicator = null;
        this._caffeineKeybindingId = null;

        this._popup = new SpotlightPopup(this._settings);

        // services
        this._clipboardManager = new ClipboardManager(this._settings, this.uuid);
        this._clipboardManager.start();
        this._emojiData = new EmojiData(this.path, this._settings);

        // views attach to popup content stack
        this._clipboardView = new ClipboardView(
            this._clipboardManager,
            this._settings,
            () => this._popup.close(),
            _,
        );
        this._popup._contentStack.add_child(this._clipboardView);
        this._popup._clipboardView = this._clipboardView;

        this._emojiView = new EmojiView(
            this._emojiData,
            this._clipboardManager,
            this._settings,
            () => this._popup.close(),
            _,
        );
        this._popup._contentStack.add_child(this._emojiView);
        this._popup._emojiView = this._emojiView;

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
            'changed::caffeine-enabled',
            () => this._toggleCaffeine(),
            this,
        );

        // caffeine standalone when enabled works like having the caffeine
        // extension installed when disabled it has zero impact on the system
        if (this._settings.get_boolean('caffeine-enabled'))
            this._enableCaffeine();
    }

    _registerShortcuts() {
        this._keybindingManager.unlisten();

        // main toggle shortcut
        const toggleShortcuts = this._settings.get_strv('toggle-shortcut');
        if (toggleShortcuts.length > 0) {
            this._keybindingManager.listenFor(toggleShortcuts[0], () => {
                if (this._popup.visible)
                    this._popup.close();
                else
                    this._popup.open('search');
            });
        }

        // clipboard shortcut
        const clipboardShortcuts = this._settings.get_strv('clipboard-shortcut');
        if (clipboardShortcuts.length > 0) {
            this._keybindingManager.listenFor(clipboardShortcuts[0], () => {
                if (this._popup.visible)
                    this._popup._switchMode('clipboard');
                else
                    this._popup.open('clipboard');
            });
        }

        // emoji shortcut
        const emojiShortcuts = this._settings.get_strv('emoji-shortcut');
        if (emojiShortcuts.length > 0) {
            this._keybindingManager.listenFor(emojiShortcuts[0], () => {
                if (this._popup.visible)
                    this._popup._switchMode('emoji');
                else
                    this._popup.open('emoji');
            });
        }
    }

    _toggleCaffeine() {
        if (this._settings.get_boolean('caffeine-enabled'))
            this._enableCaffeine();
        else
            this._disableCaffeine();
    }

    _enableCaffeine() {
        if (this._caffeineIndicator)
            return;

        this._caffeineIndicator = new CaffeineIndicator(this);

        // register caffeine toggle shortcut
        const caffeineShortcuts = this._settings.get_strv(CaffeineKeys.TOGGLE_SHORTCUT);
        if (caffeineShortcuts.length > 0 && caffeineShortcuts[0]) {
            Main.wm.addKeybinding(
                CaffeineKeys.TOGGLE_SHORTCUT,
                this._settings,
                Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.ALL,
                () => this._caffeineIndicator._handleToggleClick(),
            );
        }
    }

    _disableCaffeine() {
        if (this._caffeineIndicator) {
            Main.wm.removeKeybinding(CaffeineKeys.TOGGLE_SHORTCUT);
            this._caffeineIndicator.destroy();
            this._caffeineIndicator = null;
        }
    }

    _openPreferences() {
        this.openPreferences();
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

        destroyTooltip();
        destroyDevice();

        // disable caffeine standalone
        this._disableCaffeine();

        // views destroyed by popup destroy
        // return stolen widgets back to overview before destroying
        this._popup.returnOverviewSearch();
        this._popup.destroy();
        this._popup = null;

        this._settings = null;
        this._ = null;
    }
}
