// spotlight - popup widget
// SPDX-License-Identifier: GPL-3.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import {PopupBackdrop} from './popupBackdrop.js';
import {PopupPositioner} from './popupPositioner.js';

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
        this._visible = false;
        this._openIdleId = 0;
        this._closeIdleId = 0;
        this._opening = false;

        // popup structure
        //   outer St.Widget this  -> added to chrome handles positioning
        //   inner St.BoxLayout    -> holds entry plus gnome search results

        // inner content box what the user actually sees
        this._content = new St.BoxLayout({
            style_class: 'spotlight-container',
            vertical: true,
            width: 520,
        });
        this.add_child(this._content);

        // stolen overview widgets taken once in stealOverviewSearch
        // kept until returnOverviewSearch called from disable()
        this._entry = null;
        this._entryParent = null;
        this._search = null;
        this._searchParent = null;
        this._searchResults = null;
        this._textChangedEventId = 0;
        this._originalActivateDefault = null;
        this._overviewKeyCaptureId = 0;

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
    }

    // called once from extension.enable()
    // permanently steals overview's search widgets and hides them
    // spotlight is first-class citizen overview itself stays functional
    stealOverviewSearch() {
        if (this._entry)
            return;

        // override overview methods so it doesn't try to use stolen widgets
        if (!Main.overview._originalToggle) {
            Main.overview._originalToggle = Main.overview.toggle;
            Main.overview.toggle = () => {
                // if our popup is visible focus it instead
                if (this._search && this._search.visible)
                    this._search._text.get_parent().grab_key_focus();
                else
                    Main.overview._originalToggle();
            };
        }

        // steal overview's search entry
        this._entry = Main.overview.searchEntry;
        this._entryParent = this._entry.get_parent();
        this._entry.add_style_class_name('spotlight-entry-stolen');
        if (this._entry.get_parent())
            this._entry.get_parent().remove_child(this._entry);
        // hide it overview will show empty space where search used to be
        this._entry.visible = false;

        // steal overview's search controller
        this._search = Main.overview.searchController;
        this._searchResults = this._search._searchResults;
        this._searchParent = this._search.get_parent();
        if (this._search.get_parent())
            this._search.get_parent().remove_child(this._search);
        this._search.hide();

        // override activateDefault to close our popup when activated
        this._originalActivateDefault = this._searchResults.activateDefault;
        this._searchResults.activateDefault = () => {
            this.close();
            this._originalActivateDefault.call(this._searchResults);
        };

        // prevent search controller from cancelling itself
        if (!this._search._originalSearchCancelled) {
            this._search._originalSearchCancelled = this._search._searchCancelled;
            this._search._searchCancelled = () => {};
        }

        // overview and app grid have a start typing to search feature when
        // user presses any printable character it tries to show search view

        // since we permanently stole the search widgets this would show a
        // blank screen intercept printable keys at stage level before the
        // overview sees them and consume them so nothing happens

        // only intercept when overview is visible and our popup is not visible
        // non printable keys arrows enter esc tab etc pass through normally
        if (this._overviewKeyCaptureId === 0) {
            this._overviewKeyCaptureId = global.stage.connect(
                'captured-event',
                (actor, event) => {
                    if (event.type() !== Clutter.EventType.KEY_PRESS)
                        return Clutter.EVENT_PROPAGATE;
                    if (!Main.overview.visible || this._visible)
                        return Clutter.EVENT_PROPAGATE;
                    const unicode = Clutter.keysym_to_unicode(
                        event.get_key_symbol(),
                    );
                    if (unicode > 0)
                        return Clutter.EVENT_STOP;
                    return Clutter.EVENT_PROPAGATE;
                },
            );
        }
    }

    // called once from extension.disable()
    // returns stolen widgets back to overview restores original methods
    returnOverviewSearch() {
        if (this._entry) {
            this._entry.remove_style_class_name('spotlight-entry-stolen');
            this._entry.visible = true;
            if (this._entry.get_parent())
                this._entry.get_parent().remove_child(this._entry);
            this._entryParent.add_child(this._entry);
            this._entry = null;
            this._entryParent = null;
        }

        if (this._search) {
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

            if (this._search.get_parent())
                this._search.get_parent().remove_child(this._search);
            this._searchParent.add_child(this._search);
            this._search = null;
            this._searchParent = null;
            this._searchResults = null;
        }

        // restore overview methods
        if (Main.overview._originalToggle) {
            Main.overview.toggle = Main.overview._originalToggle;
            Main.overview._originalToggle = null;
        }
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
        // reparent entry into our container
        if (this._entry.get_parent())
            this._entry.get_parent().remove_child(this._entry);
        this._entry.visible = true;
        this._content.add_child(this._entry);

        // reparent search results into our container
        if (this._search.get_parent())
            this._search.get_parent().remove_child(this._search);
        this._content.add_child(this._search);

        // backdrop first then popup later addition to chrome means higher
        // in stacking order so popup sits above the backdrop naturally
        this._backdrop = new PopupBackdrop(() => this.close());
        this._backdrop.show();

        if (this.get_parent())
            Main.layoutManager.removeChrome(this);
        Main.layoutManager.addChrome(this);

        this._positioner.showCentered(() => {
            this._search._text.get_parent().grab_key_focus();
        });

        // clear any previous search text start with empty
        this._search._text.set_text('');
        // hide results area when empty keeps popup compact at idle
        this._search.visible = false;

        // show results only when user has typed something
        // this prevents no results message from taking up vertical space

        // results stay shown once user has typed even if they delete back to
        // empty hiding while user is typing causes focus state changes that
        // incorrectly close the popup
        if (!this._textChangedEventId) {
            this._textChangedEventId = this._search._text.connect(
                'text-changed',
                () => {
                    const hasText = this._search._text.get_text().length > 0;
                    if (hasText)
                        this._search.visible = true;
                },
            );
        }

        // capture esc key to close the popup
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
        // check this.contains to catch focus anywhere within our widget tree
        global.stage.connectObject(
            'notify::key-focus', () => {
                if (!this._visible)
                    return;
                const focus = global.stage.get_key_focus();
                if (focus && this.contains(focus))
                    return;
                if (focus && focus.style_class &&
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

        // remove entry from our container hide it keep it stolen
        // hide before detach prevents clutter 18 unrealize assertion
        if (this._entry && this._entry.get_parent()) {
            this._entry.visible = false;
            this._entry.get_parent().remove_child(this._entry);
        }

        // remove search from our container hide it keep it stolen
        // hide before detach prevents clutter 18 unrealize assertion
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

        this._content = null;
        this._settings = null;

        super.destroy();
    }
});
