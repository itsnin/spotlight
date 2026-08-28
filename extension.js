// spotlight - a compact launcher for gnome shell
// SPDX-License-Identifier: GPL-3.0-or-later
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {WindowPreview} from 'resource:///org/gnome/shell/ui/windowPreview.js';
import {SpotlightPopup} from './spotlightPopup.js';
import {KeybindingManager} from './services/core/keybinding.js';
import {ClipboardManager} from './services/clipboard/manager.js';
import {EmojiData} from './services/emoji/data.js';
import {ClipboardView} from './popup/clipboardView.js';
import {EmojiView, destroyTooltip} from './popup/emojiView.js';
import {destroyDevice} from './services/core/virtualKeyboard.js';
import {CaffeineIndicator} from './services/caffeine/indicator.js';
import * as CaffeineKeys from './services/caffeine/inhibitorManager.js';

// Workspaces bar components
import {KeyBindings as WorkspacesKeyBindings} from './services/workspaces/services/KeyBindings.js';
import {ScrollHandler as WorkspacesScrollHandler} from './services/workspaces/services/ScrollHandler.js';
import {Settings as WorkspacesSettings} from './services/workspaces/services/Settings.js';
import {Styles as WorkspacesStyles} from './services/workspaces/services/Styles.js';
import {TopBarAdjustments as WorkspacesTopBarAdjustments} from './services/workspaces/services/TopBarAdjustments.js';
import {Workspaces as WorkspacesWorkspaces} from './services/workspaces/services/Workspaces.js';
import {WorkspacesBar as WorkspacesWorkspacesBar} from './services/workspaces/ui/WorkspacesBar.js';
import {destroyAllHooks as workspacesDestroyAllHooks} from './services/workspaces/utils/hook.js';

// Workspaces bar adapter provides the interface that the workspaces bar code expects
class WorkspacesAdapter {
    constructor(spotlightExtension) {
        this._spotlight = spotlightExtension;
        this.metadata = {
            name: 'Workspaces Bar',
            'settings-schema': 'org.gnome.shell.extensions.spotlight',
            version: 39,
        };
        this.workspacesBar = null;
        this.scrollHandler = null;
        this._baseStyleSheet = null;
    }

    getSettings(schemaName) {
        return new Gio.Settings({schema: schemaName});
    }

    openPreferences() {
        this._spotlight.openPreferences();
    }

    _loadBaseStylesheet() {
        const stylesheetPath = GLib.build_filenamev([
            this._spotlight.path,
            'services',
            'workspaces',
            'stylesheet.css',
        ]);
        const file = Gio.File.new_for_path(stylesheetPath);
        if (file.query_exists(null)) {
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            themeContext.get_theme().load_stylesheet(file);
            this._baseStyleSheet = file;
        }
    }

    _unloadBaseStylesheet() {
        if (this._baseStyleSheet) {
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            themeContext.get_theme().unload_stylesheet(this._baseStyleSheet);
            this._baseStyleSheet = null;
        }
    }

    enable() {
        this._loadBaseStylesheet();
        WorkspacesSettings.init(this);
        WorkspacesTopBarAdjustments.init();
        WorkspacesWorkspaces.init();
        WorkspacesKeyBindings.init();
        WorkspacesStyles.init();
        this.workspacesBar = new WorkspacesWorkspacesBar(this);
        this.workspacesBar.init();
        this.scrollHandler = new WorkspacesScrollHandler();
        this.scrollHandler.init(this.workspacesBar.observeWidget());
    }

    disable() {
        workspacesDestroyAllHooks();
        WorkspacesSettings.destroy();
        WorkspacesTopBarAdjustments.destroy();
        WorkspacesWorkspaces.destroy();
        WorkspacesKeyBindings.destroy();
        WorkspacesStyles.destroy();
        this.scrollHandler?.destroy();
        this.scrollHandler = null;
        this.workspacesBar?.destroy();
        this.workspacesBar = null;
        this._unloadBaseStylesheet();
    }
}

// entry point enable and disable are kept next to each other for easy review
export default class SpotlightExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._ = _;
        this._caffeineIndicator = null;
        this._caffeineKeybindingId = null;
        this._workspacesAdapter = null;
        this._dashOriginalHeight = null;
        this._dashVisibility = true;

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
            'changed::workspaces-bar-enabled',
            () => this._toggleWorkspaces(),
            'changed::disable-dash',
            () => this._toggleDash(),
            this,
        );

        // caffeine standalone when enabled works like having the caffeine
        // extension installed when disabled it has zero impact on the system
        if (this._settings.get_boolean('caffeine-enabled'))
            this._enableCaffeine();

        // workspaces bar when enabled replaces the workspace indicator
        // with an i3 like workspaces bar
        if (this._settings.get_boolean('workspaces-bar-enabled'))
            this._enableWorkspaces();

        // disable dash when enabled hides the gnome dash dock in overview
        if (this._settings.get_boolean('disable-dash'))
            this._enableDisableDash();
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

    _toggleWorkspaces() {
        if (this._settings.get_boolean('workspaces-bar-enabled'))
            this._enableWorkspaces();
        else
            this._disableWorkspaces();
    }

    _enableWorkspaces() {
        if (this._workspacesAdapter)
            return;
        this._workspacesAdapter = new WorkspacesAdapter(this);
        this._workspacesAdapter.enable();
    }

    _disableWorkspaces() {
        if (this._workspacesAdapter) {
            this._workspacesAdapter.disable();
            this._workspacesAdapter = null;
        }
    }

    _toggleDash() {
        if (this._settings.get_boolean('disable-dash'))
            this._enableDisableDash();
        else
            this._disableDisableDash();
    }

    _enableDisableDash() {
        if (!this._dashVisibility)
            return;
        if (!Main.overview.dash)
            return;
        this._dashOriginalHeight = Main.overview.dash.height;
        this._dashVisibility = false;
        Main.overview.dash.hide();
        Main.overview.dash.height = 0;
        this._updateWindowPreviewOverlap();
    }

    _disableDisableDash() {
        if (this._dashVisibility)
            return;
        if (!Main.overview.dash)
            return;
        this._dashVisibility = true;
        Main.overview.dash.show();
        Main.overview.dash.height = this._dashOriginalHeight ?? -1;
        Main.overview.dash.setMaxSize(-1, -1);
        this._dashOriginalHeight = null;
        this._updateWindowPreviewOverlap();
    }

    /**
     * Adjust window preview overlap when dash is hidden or shown.
     * Adjusts window preview overlap when dash is hidden or shown.
     */
    _updateWindowPreviewOverlap() {
        const wpp = WindowPreview.prototype;

        if (this._dashVisibility && wpp.overlapHeightsOld) {
            wpp.overlapHeights = wpp.overlapHeightsOld;
            delete wpp.overlapHeightsOld;
            return;
        }

        if (!this._dashVisibility) {
            wpp.overlapHeightsOld = wpp.overlapHeights;
            wpp.overlapHeights = function () {
                let [top, bottom] = this.overlapHeightsOld();
                return [top + 24, bottom + 24];
            };
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

        // disable standalone features
        this._disableCaffeine();
        this._disableWorkspaces();
        this._disableDisableDash();

        // views destroyed by popup destroy
        // return stolen widgets back to overview before destroying
        this._popup.returnOverviewSearch();
        this._popup.destroy();
        this._popup = null;

        this._settings = null;
        this._ = null;
    }
}
