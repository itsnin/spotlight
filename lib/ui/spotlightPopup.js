// Spotlight: popup widget
// SPDX-License-Identifier: GPL-3.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
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
        // GNOME interface settings we use to detect the current system color scheme.
        this._ifaceSettings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.interface',
        });
        this._visible = false;
        this._openIdleId = 0;
        this._closeIdleId = 0;
        this._opening = false;

        // Popup structure. The outer St.Widget gets added to chrome and handles positioning,
        // while the inner St.BoxLayout holds the entry plus all the GNOME search results.

        // Inner content box. This is what the user actually sees.
        this._content = new St.BoxLayout({
            style_class: 'spotlight-container',
            vertical: true,
            width: 520,
        });
        this.add_child(this._content);

        // Stolen overview widgets. Taken once in stealOverviewSearch and kept
        // that way until returnOverviewSearch gets called from disable.
        this._entry = null;
        this._entryParent = null;
        this._search = null;
        this._searchParent = null;
        this._searchResults = null;
        this._textChangedEventId = 0;
        this._originalActivateDefault = null;
        this._originalActivate = null;
        this._overviewKeyCaptureId = 0;

        // Hide the popup when new windows appear, which usually means a result was launched.
        global.display.connectObject(
            'window-created', () => {
                if (this._visible)
                    this.close();
            },
            this,
        );

        // Hide the popup when the application state changes.
        Shell.AppSystem.get_default().connectObject(
            'app-state-changed', () => {
                if (this._visible)
                    this.close();
            },
            this,
        );

        // Live theme switching when the GNOME system color scheme changes.
        // Only kicks in when the theme preference is set to default.
        this._ifaceSettings.connectObject(
            'changed::color-scheme', () => {
                if (this._visible &&
                    this._settings.get_string('theme-preference') === 'default')
                    this._applyTheme();
            },
            this,
        );
    }

    // Called once from extension.enable when the extension loads.
    // Permanently steals the overview search widgets and hides them away.
    // Spotlight becomes the first-class citizen while the overview itself stays functional.
    stealOverviewSearch() {
        if (this._entry)
            return;

        // Override the overview methods so it does not try to use the stolen widgets.
        if (!Main.overview._originalToggle) {
            Main.overview._originalToggle = Main.overview.toggle;
            Main.overview.toggle = () => {
                // If our popup is visible, focus it instead of toggling the overview.
                if (this._visible)
                    this._entry.grab_key_focus();
                else
                    Main.overview._originalToggle();
            };
        }

        // Steal the overview search entry.
        this._entry = Main.overview.searchEntry;
        this._entryParent = this._entry.get_parent();
        this._entry.add_style_class_name('spotlight-entry-stolen');
        if (this._entry.get_parent())
            this._entry.get_parent().remove_child(this._entry);
        // Hide it so the overview shows empty space where the search used to be.
        this._entry.visible = false;

        // Steal the overview search controller as well.
        this._search = Main.overview.searchController;
        this._searchResults = this._search._searchResults;
        this._searchParent = this._search.get_parent();
        if (this._search.get_parent())
            this._search.get_parent().remove_child(this._search);
        this._search.hide();

        // Override activateDefault so it closes our popup when something gets activated.
        this._originalActivateDefault = this._searchResults.activateDefault;
        this._searchResults.activateDefault = () => {
            this.close();
            this._originalActivateDefault.call(this._searchResults);
        };

        // Override activate to close when a specific result gets activated.
        // Handles Tab navigation to specific providers like web search.
        if (this._searchResults.activate) {
            this._originalActivate = this._searchResults.activate;
            this._searchResults.activate = (...args) => {
                this.close();
                this._originalActivate.call(this._searchResults, ...args);
            };
        }

        // Prevent the search controller from cancelling itself.
        if (!this._search._originalSearchCancelled) {
            this._search._originalSearchCancelled = this._search._searchCancelled;
            this._search._searchCancelled = () => {};
        }

        // The overview and app grid have a start-typing-to-search feature where
        // pressing any printable character tries to show the search view. Since we
        // permanently stole the search widgets this would just show a blank screen.
        // We intercept printable keys at the stage level before the overview sees
        // them and consume them so nothing happens. Only intercept when the overview
        // is visible and our popup is not. Non-printable keys like arrows, Enter,
        // Esc and Tab pass through normally.
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
                    // Unicode 0x20 and above count as printable characters.
                    // Control characters like Enter, Esc, Tab and arrows pass through.
                    if (unicode >= 0x20)
                        return Clutter.EVENT_STOP;
                    return Clutter.EVENT_PROPAGATE;
                },
            );
        }
    }

    // Called once from extension.disable when the extension unloads.
    // Returns the stolen widgets back to the overview and restores the original methods.
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

            // Restore the original search cancelled method.
            if (this._search._originalSearchCancelled) {
                this._search._searchCancelled = this._search._originalSearchCancelled;
                this._search._originalSearchCancelled = null;
            }

            // Restore the original activateDefault.
            if (this._originalActivateDefault) {
                this._searchResults.activateDefault = this._originalActivateDefault;
                this._originalActivateDefault = null;
            }

            // Restore original activate.
            if (this._originalActivate) {
                this._searchResults.activate = this._originalActivate;
                this._originalActivate = null;
            }

            if (this._search.get_parent())
                this._search.get_parent().remove_child(this._search);
            this._searchParent.add_child(this._search);
            this._search = null;
            this._searchParent = null;
            this._searchResults = null;
        }

        // Restore overview methods.
        if (Main.overview._originalToggle) {
            Main.overview.toggle = Main.overview._originalToggle;
            Main.overview._originalToggle = null;
        }
    }

    // Public entry point. Defers the actual work to idle so actor tree
    // mutations never happen inside a signal dispatch, which would cause
    // a SIGABRT on GNOME 50 with Clutter 18.
    open() {
        if (this._visible || this._opening || this._openIdleId !== 0)
            return;
        // The widgets should already be stolen by stealOverviewSearch in enable.
        if (!this._entry || !this._search)
            return;

        this._opening = true;
        this._openIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._openIdleId = 0;
            this._doOpen();
            return GLib.SOURCE_REMOVE;
        });
    }

    // Reparents the already-stolen widgets into our popup and shows it.
    // Runs from an idle context, never inside a signal dispatch.
    _doOpen() {
        // Reparent the entry into our container.
        if (this._entry.get_parent())
            this._entry.get_parent().remove_child(this._entry);
        this._entry.visible = true;
        this._content.add_child(this._entry);

        // Reparent the search results into our container.
        if (this._search.get_parent())
            this._search.get_parent().remove_child(this._search);
        this._content.add_child(this._search);

        // Apply the theme before showing so the colors come out right on first paint.
        this._applyTheme();

        // Backdrop first, then the popup. A later addition to chrome means higher
        // in the stacking order, so the popup sits naturally above the backdrop.
        const monitor = this._positioner.getTargetMonitor();
        this._backdrop = new PopupBackdrop(() => this.close(), monitor);
        this._backdrop.show();

        if (this.get_parent())
            Main.layoutManager.removeChrome(this);
        Main.layoutManager.addChrome(this);

        this._positioner.showCentered(() => {
            this._entry.grab_key_focus();
        });

        // Clear any previous search text and start fresh with an empty field.
        this._search._text.set_text('');
        // Hide the results area when empty so the popup stays compact at idle.
        this._search.visible = false;

        // Toggle the results visibility based on the text content. Hide when
        // empty to keep the popup compact, show when the user has typed something.
        if (!this._textChangedEventId) {
            this._textChangedEventId = this._search._text.connect(
                'text-changed',
                () => {
                    const hasText = this._search._text.get_text().length > 0;
                    this._search.visible = hasText;
                },
            );
        }

        // Close on any mouse button press within search results.
        // Catches clicks on web search results, copy buttons etc that don't
        // create new windows and slip past window-created detection.
        // Uses idle so the result activation handler runs first, then close.
        this._search.connectObject(
            'button-press-event', () => {
                GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                    if (this._visible)
                        this.close();
                    return GLib.SOURCE_REMOVE;
                });
                return Clutter.EVENT_PROPAGATE;
            },
            this,
        );

        // Capture the Esc key to close the popup. Also close on Enter or Space
        // when the focus lands on a result button. Handles keyboard activation of
        // copy-to-clipboard and other similar buttons.
        global.stage.connectObject(
            'captured-event', (actor, event) => {
                if (event.type() !== Clutter.EventType.KEY_PRESS)
                    return Clutter.EVENT_PROPAGATE;

                const key = event.get_key_symbol();

                if (key === Clutter.KEY_Escape) {
                    this.close();
                    return Clutter.EVENT_STOP;
                }

                // Enter or Space when focus sits on a result button rather than the entry.
                // Closes the popup after activation runs. Handles copy-to-clipboard and such.
                if (key === Clutter.KEY_Return ||
                    key === Clutter.KEY_KP_Enter ||
                    key === Clutter.KEY_space) {
                    const focus = global.stage.get_key_focus();
                    if (focus &&
                        focus !== this._entry &&
                        !this._entry.contains(focus) &&
                        this.contains(focus) &&
                        (!focus.has_style_class_name ||
                         !focus.has_style_class_name('popup-menu'))) {
                        this.close();
                    }
                }

                return Clutter.EVENT_PROPAGATE;
            },
            this,
        );

        // Close on key-focus loss unless the focus moved to a popup-menu.
        // Some results open menus and those should not dismiss us. Null focus
        // is transient during actor tree mutations. Clutter clears focus to null
        // when hiding a focused actor, so we refocus the entry immediately to
        // prevent closing and keep typing working.
        global.stage.connectObject(
            'notify::key-focus', () => {
                if (!this._visible)
                    return;
                const focus = global.stage.get_key_focus();

                // Null focus means the actor was hidden and Clutter cleared it.
                // Refocusing the entry immediately prevents close and stops focus loss.
                if (!focus) {
                    this._entry.grab_key_focus();
                    return;
                }

                // Never close while the entry has focus, the user is still typing.
                if (this._entry &&
                    (this._entry === focus || this._entry.contains(focus)))
                    return;

                // Focus anywhere within our widget tree is safe to leave alone.
                if (this.contains(focus))
                    return;

                // Popup menus coming from results should not dismiss the popup.
                if (focus.has_style_class_name &&
                    focus.has_style_class_name('popup-menu'))
                    return;

                this.close();
            },
            this,
        );

        // Close when focus moves to an external application window. Catches mouse
        // clicks on web search results, copy-to-clipboard buttons and any other
        // activation that shifts focus outside GNOME Shell. The notify::focus-window
        // signal tracks things at the window manager level, not just the stage.
        global.display.connectObject(
            'notify::focus-window', () => {
                if (!this._visible)
                    return;
                const focused = global.display.focus_window;
                if (focused !== null)
                    this.close();
            },
            this,
        );

        this._opening = false;
        this._visible = true;
    }

    // Public entry point. Defers the actual work to idle so actor tree
    // mutations never happen inside a signal dispatch, which would cause
    // a SIGABRT on GNOME 50 with Clutter 18.
    close() {
        if ((!this._visible && !this._opening) || this._closeIdleId !== 0)
            return;

        // Cancel any pending open since we are about to close instead.
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

    // Decides whether to use the light theme based on user preference and
    // the GNOME system color scheme when the preference is set to default.
    _shouldUseLightTheme() {
        const pref = this._settings.get_string('theme-preference');
        if (pref === 'light')
            return true;
        if (pref === 'dark')
            return false;
        // 'default' follows GNOME system color scheme.
        const scheme = this._ifaceSettings.get_string('color-scheme');
        return scheme === 'prefer-light';
    }

    // Applies or removes the theme-light class on our content container.
    // The stylesheet overrides all colors when this class is present.
    _applyTheme() {
        if (this._shouldUseLightTheme())
            this._content.add_style_class_name('theme-light');
        else
            this._content.remove_style_class_name('theme-light');
    }

    // Removes widgets from our popup but keeps them stolen and hidden.
    // Does NOT return them to the overview, that only happens in disable.
    // Runs from an idle context, never inside a signal dispatch.
    _doClose() {
        this._positioner.stop();

        if (this._backdrop) {
            this._backdrop.destroy();
            this._backdrop = null;
        }

        // Disconnect the stage, display and search signals. They get reconnected on the next open.
        global.stage.disconnectObject(this);
        global.display.disconnectObject(this);
        if (this._search)
            this._search.disconnectObject(this);

        // Remove the entry from our container, hide it and keep it stolen.
        // Hiding before detach prevents a Clutter 18 unrealize assertion.
        if (this._entry && this._entry.get_parent()) {
            this._entry.visible = false;
            this._entry.get_parent().remove_child(this._entry);
        }

        // Remove the search from our container, hide it and keep it stolen.
        // Hiding before detach prevents a Clutter 18 unrealize assertion.
        if (this._search && this._search.get_parent()) {
            this._search.hide();
            this._search.get_parent().remove_child(this._search);
        }

        this._visible = false;
        this.hide();

        if (this.get_parent())
            Main.layoutManager.removeChrome(this);
    }

    // Synchronous close, called only from destroy during extension disable.
    // Destroy runs outside signal dispatch context so direct actor mutation is safe here.
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
        // Synchronous close since destroy runs outside signal dispatch.
        this._syncClose();

        // Disconnect the overview key capture which was connected with regular connect.
        if (this._overviewKeyCaptureId !== 0) {
            global.stage.disconnect(this._overviewKeyCaptureId);
            this._overviewKeyCaptureId = 0;
        }

        // Disconnect all remaining signals that were connected with connectObject.
        global.display.disconnectObject(this);
        Shell.AppSystem.get_default().disconnectObject(this);
        global.stage.disconnectObject(this);
        this._ifaceSettings.disconnectObject(this);

        this._content = null;
        this._settings = null;

        super.destroy();
    }
});
