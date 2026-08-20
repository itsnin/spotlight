// spotlight - popup widget
// SPDX-License-Identifier: GPL-3.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import St from 'gi://St';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import {PopupBackdrop} from './popupBackdrop.js';
import {PopupPositioner} from './popupPositioner.js';

// popup structure matches search-light exactly:
//   outer St.Widget (this)  -> added to chrome, handles positioning
//   inner St.BoxLayout      -> holds entry + gnome search results, has blur/styling
//
// reuses gnome overview's entire search infrastructure. steals
// Main.overview.searchEntry and Main.overview.searchController, reparents
// them into our popup, and restores them on close. this automatically
// gives every search provider registered with gnome: calculator, apps,
// files, settings, system actions, and any third-party providers.
//
// important guards copied from search-light:
//   _inOverview flag - prevents opening while overview is already visible
//   window-created / app-state-changed - hide popup when apps launch
//   disable_unredirect / enable_unredirect - performance for blur effect
//   connectObject for all global signals - automatic cleanup on destroy
//   popup-menu focus handling - don't close when menus open from results
//
// blur uses Shell.BlurEffect (not search-light's imagemagick approach).
// background mode blurs pixels beneath the content box, css background-color
// tints it. tint is made opaque enough that rectangular blur sampling is
// invisible at the extreme rounded corners.
export const SpotlightPopup = GObject.registerClass(
class SpotlightPopup extends St.Widget {
    _init(extension) {
        super._init({
            layout_manager: new Clutter.BinLayout(),
            reactive: true,
            can_focus: true,
            visible: false,
        });
        this._settings = extension._settings;
        this._backdrop = null;
        this._positioner = new PopupPositioner(this, this._settings);
        this._inOverview = false;
        this._visible = false;

        // inner content box - what the user actually sees
        this._content = new St.BoxLayout({
            style_class: 'spotlight-container',
            vertical: true,
            width: this._settings.get_int('popup-width'),
        });

        this._blurEffect = new Shell.BlurEffect({
            mode: Shell.BlurMode.BACKGROUND,
            brightness: 0.9,
        });
        // shell version detection - both paths equal, neither is fallback
        const shellVersion = parseInt(Config.PACKAGE_VERSION);
        if (shellVersion >= 46)
            this._blurEffect.radius = 24;
        else
            this._blurEffect.sigma = 12;
        this._content.add_effect(this._blurEffect);

        this.add_child(this._content);

        // saved references for restoring overview widgets on close
        this._entry = null;
        this._entryParent = null;
        this._search = null;
        this._searchParent = null;
        this._searchResults = null;
        this._textChangedEventId = 0;
        this._originalActivateDefault = null;

        // track overview state so we don't steal widgets while it's visible
        Main.overview.connectObject(
            'overview-showing', () => { this._inOverview = true; },
            'overview-hidden', () => { this._inOverview = false; },
            this,
        );

        // hide popup when new windows are created (app launched from result)
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
    }

    // acquires gnome overview's search entry and controller
    // reparents them into our popup so we reuse the entire search system
    _acquireUi() {
        if (this._entry)
            return;

        // override overview methods so it doesn't try to show itself while
        // we're using its search widgets. originals saved on overview object
        // exactly like search-light does, restored in _releaseUi.
        if (!Main.overview._originalToggle) {
            Main.overview._originalToggle = Main.overview.toggle;
            Main.overview.toggle = () => {
                if (this._search && this._search.visible)
                    this._search._text.get_parent().grab_key_focus();
            };
        }
        if (!Main.overview._originalHide) {
            Main.overview._originalHide = Main.overview.hide;
            Main.overview.hide = () => {
                Main.overview._originalHide();
            };
        }

        // steal the overview's search entry
        this._entry = Main.overview.searchEntry;
        this._entryParent = this._entry.get_parent();
        this._entry.add_style_class_name('spotlight-entry-stolen');

        // steal the overview's search controller (contains results display)
        this._search = Main.overview.searchController;
        this._search.hide();
        this._searchResults = this._search._searchResults;
        this._searchParent = this._search.get_parent();

        // override activateDefault to close our popup when result is activated
        this._originalActivateDefault = this._searchResults.activateDefault;
        this._searchResults.activateDefault = () => {
            this.close();
            this._originalActivateDefault.call(this._searchResults);
        };

        // reparent entry into our container
        if (this._entry.get_parent())
            this._entry.get_parent().remove_child(this._entry);
        this._content.add_child(this._entry);

        // reparent search results into our container
        if (this._search.get_parent())
            this._search.get_parent().remove_child(this._search);
        this._content.add_child(this._search);

        // prevent search controller from cancelling itself
        if (!this._search._originalSearchCancelled) {
            this._search._originalSearchCancelled = this._search._searchCancelled;
            this._search._searchCancelled = () => {};
        }

        // update size when text changes (results appear/disappear)
        this._textChangedEventId = this._search._text.connect(
            'text-changed',
            () => {
                this._search.show();
            },
        );

        // capture esc key to close the popup - uses connectObject so it's
        // automatically disconnected when this object is destroyed
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

        // also close on key-focus loss (unless focus went to a popup-menu
        // which some results might open - those should not dismiss us)
        global.stage.connectObject(
            'notify::key-focus', () => {
                if (!this._entry || !this._visible)
                    return;
                const focus = global.stage.get_key_focus();
                const appearFocused = focus && (
                    this._entry.contains(focus) ||
                    this._searchResults.contains(focus)
                );
                if (!appearFocused) {
                    if (focus && focus.style_class &&
                        focus.style_class.includes('popup-menu'))
                        return;
                    this.close();
                }
            },
            this,
        );

        this._search._text.get_parent().grab_key_focus();
    }

    // restores overview's widgets and methods back to their original state
    _releaseUi() {
        if (this._entry) {
            if (this._entry.get_parent())
                this._entry.get_parent().remove_child(this._entry);
            this._entryParent.add_child(this._entry);
            this._entry.remove_style_class_name('spotlight-entry-stolen');
            this._entry = null;
            this._entryParent = null;
        }

        if (this._search) {
            this._search.hide();
            if (this._search.get_parent())
                this._search.get_parent().remove_child(this._search);
            this._searchParent.add_child(this._search);

            if (this._textChangedEventId) {
                this._search._text.disconnect(this._textChangedEventId);
                this._textChangedEventId = 0;
            }

            // restore original search cancelled method
            if (this._search._originalSearchCancelled) {
                this._search._searchCancelled = this._search._originalSearchCancelled;
                this._search._originalSearchCancelled = null;
            }

            // restore original activateDefault
            if (this._originalActivateDefault) {
                this._searchResults.activateDefault = this._originalActivateDefault;
                this._originalActivateDefault = null;
            }

            this._search = null;
            this._searchParent = null;
            this._searchResults = null;
        }

        // disconnect global stage signals connected with connectObject
        global.stage.disconnectObject(this);

        // restore overview methods
        if (Main.overview._originalToggle) {
            Main.overview.toggle = Main.overview._originalToggle;
            Main.overview._originalToggle = null;
        }
        if (Main.overview._originalHide) {
            Main.overview.hide = Main.overview._originalHide;
            Main.overview._originalHide = null;
        }
    }

    open() {
        if (this._visible)
            return;

        // never open when the overview is already visible - its search
        // widgets are in use and we would conflict with them
        if (this._inOverview)
            return;

        this._acquireUi();

        // backdrop first, then popup - later addition to chrome means higher
        // in stacking order, so popup sits above the backdrop naturally
        this._backdrop = new PopupBackdrop(() => this.close());
        this._backdrop.show();

        if (this.get_parent())
            Main.layoutManager.removeChrome(this);
        Main.layoutManager.addChrome(this);

        // disable unredirect so blur effect works correctly and performs well
        global.compositor.disable_unredirect();

        this._positioner.showCentered(() => {
            if (this._search)
                this._search._text.get_parent().grab_key_focus();
        });

        // clear any previous search text
        if (this._search) {
            this._search._text.set_text('');
            this._search.show();
        }

        this._visible = true;
    }

    close() {
        this._positioner.stop();

        if (this._backdrop) {
            this._backdrop.destroy();
            this._backdrop = null;
        }

        this._releaseUi();

        // re-enable unredirect now that blur effect is hidden
        global.compositor.enable_unredirect();

        this._visible = false;
        this.hide();
    }

    destroy() {
        this.close();
        Main.layoutManager.removeChrome(this);

        // disconnect all remaining signals connected with connectObject
        Main.overview.disconnectObject(this);
        global.display.disconnectObject(this);
        Shell.AppSystem.get_default().disconnectObject(this);
        global.stage.disconnectObject(this);

        if (this._content) {
            this._content.remove_effect(this._blurEffect);
            this._content = null;
        }
        this._blurEffect = null;
        this._settings = null;
        super.destroy();
    }
});
