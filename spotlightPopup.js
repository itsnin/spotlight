// spotlight - popup widget
// SPDX-License-Identifier: GPL-3.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import {PopupBackdrop} from './popup/popupBackdrop.js';
import {PopupPositioner} from './popup/popupPositioner.js';
import * as OverviewSearch from './popup/overviewSearch.js';
import * as ThemeManager from './popup/themeManager.js';

export const SpotlightPopup = GObject.registerClass(
class SpotlightPopup extends St.Widget {
    _init(settings) {
        super._init({
            layout_manager: new Clutter.BinLayout(),
            reactive: true,
            can_focus: true,
            visible: false,
        });
        this._settings = settings;
        this._backdrop = null;
        this._positioner = new PopupPositioner(this);
        // gnome interface settings used to detect system color scheme
        this._ifaceSettings = ThemeManager.createInterfaceSettings();
        this._visible = false;
        this._openIdleId = 0;
        this._closeIdleId = 0;
        this._opening = false;
        // current mode search clipboard or emoji
        this._mode = 'search';
        // popup structure: outer St.Widget handles positioning via chrome
        // inner content box what the user actually sees
        this._content = new St.BoxLayout({
            style_class: 'spotlight-container',
            vertical: true,
            width: 520,
        });
        this.add_child(this._content);

        // top bar holds search bar pill plus mode buttons side by side
        // matches macos layout buttons sit to the right of search bar
        this._topBar = new St.BoxLayout({
            style_class: 'spotlight-top-bar',
            vertical: false,
            x_align: Clutter.ActorAlign.FILL,
        });
        this._topBar.style = 'spacing: 16px; padding: 0 4px;';
        this._content.add_child(this._topBar);

        // search bar pill shaped container holds the entry plus magnifier icon
        this._searchBarBox = new St.BoxLayout({
            style_class: 'spotlight-search-bar',
            vertical: false,
            x_expand: true,
        });
        this._searchBarBox.style = 'spacing: 8px;';
        this._topBar.add_child(this._searchBarBox);

        // magnifying glass icon matches macos spotlight appearance
        this._searchIcon = new St.Icon({
            icon_name: 'system-search-symbolic',
            icon_size: 18,
            style_class: 'spotlight-search-icon',
        });
        this._searchBarBox.add_child(this._searchIcon);

        // buttons container sits to the right of search bar
        this._buttonsBox = new St.BoxLayout({
            style_class: 'spotlight-buttons-box',
            vertical: false,
        });
        this._buttonsBox.style = 'spacing: 6px; margin-left: 8px;';
        this._topBar.add_child(this._buttonsBox);

        // content stack holds search results
        this._contentStack = new St.Widget({
            layout_manager: new Clutter.BinLayout(),
            style_class: 'spotlight-content-stack',
            x_align: Clutter.ActorAlign.FILL,
        });
        this._content.add_child(this._contentStack);

        // mode buttons round icons to the right of search bar
        // these trigger separate popups, not mode switching
        this._buttonClipboard = this._createModeButton(
            'edit-paste-symbolic',
            'clipboard',
            () => this._onClipboardClicked(),
        );
        this._buttonEmoji = this._createModeButton(
            'face-smile-symbolic',
            'emoji',
            () => this._onEmojiClicked(),
        );
        this._buttonsBox.add_child(this._buttonClipboard);
        this._buttonsBox.add_child(this._buttonEmoji);

        // stolen overview widgets taken once in stealOverviewSearch
        // kept until returnOverviewSearch called from disable()
        // search-only popup - clipboard/emoji are in separate popups
        this._entry = null;
        this._entryParent = null;
        this._search = null;
        this._searchParent = null;
        this._searchResults = null;
        this._textChangedEventId = 0;
        this._originalActivateDefault = null;
        this._overviewKeyCaptureId = 0;

        // no separate views - search only

        // hide popup when new windows appear app launched from result
        global.display.connectObject(
            'window-created', () => {
                if (this._visible)
                    this.close();
            },
            this,
        );
        // hide popup when app state changes
        Shell.AppSystem.get_default().connectObject(
            'app-state-changed', () => {
                if (this._visible)
                    this.close();
            },
            this,
        );
        // live theme updates reapply when system color scheme changes
        this._ifaceSettings.connectObject(
            'changed::color-scheme', () => {
                if (this._visible)
                    ThemeManager.apply(this._content, this._settings, this._ifaceSettings);
            },
            this,
        );
        // live theme updates reapply when user changes theme preference
        this._settings.connectObject(
            'changed::theme-preference', () => {
                if (this._visible)
                    ThemeManager.apply(this._content, this._settings, this._ifaceSettings);
            },
            this,
        );
    }

    // creates a round mode button with icon that triggers callbacks
    _createModeButton(iconName, label, callback) {
        const button = new St.Button({
            style_class: 'spotlight-mode-button',
            can_focus: true,
            child: new St.Icon({
                icon_name: iconName,
                icon_size: 18,
            }),
            accessible_name: label,
            style: 'padding: 6px;',
        });
        button.connect('clicked', callback);
        return button;
    }

    // called once from extension.enable()
    // permanently steals overview's search widgets and hides them
    stealOverviewSearch() {
        OverviewSearch.steal(this);
    }

    // called once from extension.disable()
    // returns stolen widgets back to overview restores original methods
    returnOverviewSearch() {
        OverviewSearch.return_(this);
    }

    // public entry point defers actual work to idle so actor tree
    // mutations never happen inside a signal dispatch which would
    // sigabrt on gnome 50 clutter 18
    open() {
        if (this._visible || this._opening || this._openIdleId !== 0)
            return;
        // widgets should already be stolen by stealOverviewSearch in enable
        if (!this._entry || !this._search)
            return;
        this._opening = true;
        this._openIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._openIdleId = 0;
            this._doOpen();
            return GLib.SOURCE_REMOVE;
        });
    }

    // reparents already-stolen widgets into our popup and shows it
    // runs from idle context never inside signal dispatch
    _doOpen() {
        // add entry to search bar pill
        if (this._entry.get_parent())
            this._entry.get_parent().remove_child(this._entry);
        this._entry.visible = true;
        this._entry.x_expand = true;
        this._searchBarBox.add_child(this._entry);
        // buttons already in buttonsBox from _init no need to re-add

        // reparent search results into content stack
        if (this._search.get_parent())
            this._search.get_parent().remove_child(this._search);
        this._contentStack.add_child(this._search);

        // apply theme before showing so colors are correct on first paint
        ThemeManager.apply(this._content, this._settings, this._ifaceSettings);

        // backdrop first then popup later addition to chrome means higher
        // in stacking order so popup sits above the backdrop naturally
        const monitor = this._positioner.getTargetMonitor();
        this._backdrop = new PopupBackdrop(() => this.close(), monitor);
        this._backdrop.show();

        if (this.get_parent())
            Main.layoutManager.removeChrome(this);
        Main.layoutManager.addChrome(this);

        this._positioner.showCentered(() => {
            this._entry.grab_key_focus();
        });

        // clear any previous search text start with empty
        this._search._text.set_text('');
        this._search.visible = false;

        // show search results when user types
        if (!this._textChangedEventId) {
            this._textChangedEventId = this._search._text.connect(
                'text-changed',
                () => {
                    const hasText = this._search._text.get_text().length > 0;
                    this._search.visible = hasText;
                },
            );
        }

        // capture esc key to close
        global.stage.connectObject(
            'captured-event', (actor, event) => {
                if (event.type() === Clutter.EventType.KEY_PRESS &&
                    event.get_key_symbol() === Clutter.KEY_Escape) {
                    this.close();
                    return Clutter.EVENT_STOP;
                }
                return Clutter.EVENT_PROPAGATE;
            },
            this,
        );

        // close on key-focus loss unless focus went to a popup-menu
        // some results open menus and those should not dismiss us
        // null focus is transient during actor tree mutations refocus entry immediately
        global.stage.connectObject(
            'notify::key-focus', () => {
                if (!this._visible)
                    return;
                const focus = global.stage.get_key_focus();
                // null focus means actor was hidden and clutter cleared it
                // refocus entry immediately prevents close and focus loss
                if (!focus) {
                    this._entry.grab_key_focus();
                    return;
                }
                // never close while entry has focus user still typing
                if (this._entry &&
                    (this._entry === focus || this._entry.contains(focus)))
                    return;
                // focus anywhere within our widget tree is safe
                if (this.contains(focus))
                    return;
                // popup menus from results should not dismiss us
                if (focus.style_class &&
                    focus.style_class.includes('popup-menu'))
                    return;
                this.close();
            },
            this,
        );

        this._opening = false;
        this._visible = true;
    }

    // public entry point defers actual work to idle so actor tree
    // mutations never happen inside a signal dispatch which would
    // sigabrt on gnome 50 clutter 18
    close() {
        if ((!this._visible && !this._opening) || this._closeIdleId !== 0)
            return;
        // cancel any pending open we are about to close instead
        if (this._openIdleId !== 0) {
            GLib.source_remove(this._openIdleId);
            this._openIdleId = 0;
            this._opening = false;
        }
        this._closeIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._closeIdleId = 0;
            this._doClose();
            return GLib.SOURCE_REMOVE;
        });
    }

    // removes widgets from our popup but keeps them stolen and hidden
    // does NOT return them to overview that only happens in disable()
    // runs from idle context never inside signal dispatch
    _doClose() {
        this._positioner.stop();
        if (this._backdrop) {
            this._backdrop.destroy();
            this._backdrop = null;
        }
        // disconnect stage signals they get reconnected on next open
        global.stage.disconnectObject(this);

        // reset mode to search for next open
        this._mode = 'search';
        this._buttonClipboard.checked = false;
        this._buttonEmoji.checked = false;

        // remove entry from search bar hide it keep it stolen
        if (this._entry && this._entry.get_parent()) {
            this._entry.visible = false;
            this._entry.get_parent().remove_child(this._entry);
        }
        // buttons stay in buttonsBox no need to remove they persist across opens

        // remove search from content stack hide it keep it stolen
        if (this._search && this._search.get_parent()) {
            this._search.hide();
            this._search.get_parent().remove_child(this._search);
        }

        this._visible = false;
        this.hide();
        if (this.get_parent())
            Main.layoutManager.removeChrome(this);
    }

    // synchronous close called only from destroy() during extension
    // disable destroy runs outside signal dispatch context so direct
    // actor mutation is safe here
    _syncClose() {
        if (this._openIdleId !== 0) {
            GLib.source_remove(this._openIdleId);
            this._openIdleId = 0;
        }
        if (this._closeIdleId !== 0) {
            GLib.source_remove(this._closeIdleId);
            this._closeIdleId = 0;
        }
        this._opening = false;
        if (this._visible)
            this._doClose();
    }

    destroy() {
        // synchronous close destroy runs outside signal dispatch
        this._syncClose();
        // disconnect overview key capture connected with regular connect
        if (this._overviewKeyCaptureId !== 0) {
            global.stage.disconnect(this._overviewKeyCaptureId);
            this._overviewKeyCaptureId = 0;
        }
        // disconnect all remaining signals connected with connectObject
        global.display.disconnectObject(this);
        Shell.AppSystem.get_default().disconnectObject(this);
        global.stage.disconnectObject(this);
        this._ifaceSettings.disconnectObject(this);
        this._settings.disconnectObject(this);
        // clean up interface settings
        this._ifaceSettings = null;
        // clean up content reference
        this._content = null;
        super.destroy();
    }
});
