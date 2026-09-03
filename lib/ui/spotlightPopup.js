// spotlight - popup widget
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
        // GNOME interface settings used to detect system color scheme.
        this._ifaceSettings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.interface',
        });
        this._visible = false;
        this._openIdleId = 0;
        this._closeIdleId = 0;
        this._opening = false;

        // Popup structure:
        //   outer St.Widget (this) -> added to chrome, handles positioning
        //   inner St.BoxLayout     -> holds entry plus GNOME search results

        // Inner content box — what the user actually sees.
        this._content = new St.BoxLayout({
            style_class: 'spotlight-container',
            vertical: true,
            width: 520,
        });
        this.add_child(this._content);

        // Stolen overview widgets — taken once in stealOverviewSearch(),
        // kept until returnOverviewSearch() called from disable().
        this._entry = null;
        this._entryParent = null;
        this._search = null;
        this._searchParent = null;
        this._searchResults = null;
        this._textChangedEventId = 0;
        this._originalActivateDefault = null;
        this._originalActivate = null;
        this._overviewKeyCaptureId = 0;

        // Hide popup when new windows appear (app launched from result).
        global.display.connectObject(
            'window-created', () => {
                if (this._visible)
                    this.close();
            },
            this,
        );

        // Hide popup when app state changes.
        Shell.AppSystem.get_default().connectObject(
            'app-state-changed', () => {
                if (this._visible)
                    this.close();
            },
            this,
        );

        // Live theme switching when GNOME system color scheme changes.
        // Only applies when theme preference is set to 'default'.
        this._ifaceSettings.connectObject(
            'changed::color-scheme', () => {
                if (this._visible &&
                    this._settings.get_string('theme-preference') === 'default')
                    this._applyTheme();
            },
            this,
        );
    }

    // Called once from extension.enable().
    // Permanently steals overview's search widgets and hides them.
    // Spotlight is first-class citizen, overview itself stays functional.
    stealOverviewSearch() {
        if (this._entry)
            return;

        // Override overview methods so it doesn't try to use stolen widgets.
        if (!Main.overview._originalToggle) {
            Main.overview._originalToggle = Main.overview.toggle;
            Main.overview.toggle = () => {
                // If our popup is visible, focus it instead.
                if (this._visible)
                    this._entry.grab_key_focus();
                else
                    Main.overview._originalToggle();
            };
        }

        // Steal overview's search entry.
        this._entry = Main.overview.searchEntry;
        this._entryParent = this._entry.get_parent();
        this._entry.add_style_class_name('spotlight-entry-stolen');
        if (this._entry.get_parent())
            this._entry.get_parent().remove_child(this._entry);
        // Hide it — overview will show empty space where search used to be.
        this._entry.visible = false;

        // Steal overview's search controller.
        this._search = Main.overview.searchController;
        this._searchResults = this._search._searchResults;
        this._searchParent = this._search.get_parent();
        if (this._search.get_parent())
            this._search.get_parent().remove_child(this._search);
        this._search.hide();

        // Override activateDefault to close our popup when activated.
        this._originalActivateDefault = this._searchResults.activateDefault;
        this._searchResults.activateDefault = () => {
            this.close();
            this._originalActivateDefault.call(this._searchResults);
        };

        // Override activate to close when a specific result is activated.
        // Handles Tab navigation to specific providers like web search.
        if (this._searchResults.activate) {
            this._originalActivate = this._searchResults.activate;
            this._searchResults.activate = (...args) => {
                this.close();
                this._originalActivate.call(this._searchResults, ...args);
            };
        }

        // Prevent search controller from cancelling itself.
        if (!this._search._originalSearchCancelled) {
            this._search._originalSearchCancelled = this._search._searchCancelled;
            this._search._searchCancelled = () => {};
        }

        // Overview and app grid have a "start typing to search" feature. When
        // user presses any printable character it tries to show search view.
        //
        // Since we permanently stole the search widgets this would show a
        // blank screen. Intercept printable keys at stage level before the
        // overview sees them and consume them so nothing happens.
        //
        // Only intercept when overview is visible and our popup is not visible.
        // Non-printable keys (arrows, Enter, Esc, Tab etc) pass through normally.
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
                    // Unicode 0x20 and above are printable characters.
                    // Control characters (Enter, Esc, Tab, arrows etc) pass through.
                    if (unicode >= 0x20)
                        return Clutter.EVENT_STOP;
                    return Clutter.EVENT_PROPAGATE;
                },
            );
        }
    }

    // Called once from extension.disable().
    // Returns stolen widgets back to overview, restores original methods.
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

            // Restore original search cancelled method.
            if (this._search._originalSearchCancelled) {
                this._search._searchCancelled = this._search._originalSearchCancelled;
                this._search._originalSearchCancelled = null;
            }

            // Restore original activateDefault.
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

    // Public entry point. Defers actual work to idle so actor tree
    // mutations never happen inside a signal dispatch, which would
    // SIGABRT on GNOME 50 / Clutter 18.
    open() {
        if (this._visible || this._opening || this._openIdleId !== 0)
            return;
        // Widgets should already be stolen by stealOverviewSearch() in enable().
        if (!this._entry || !this._search)
            return;

        this._opening = true;
        this._openIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._openIdleId = 0;
            this._doOpen();
            return GLib.SOURCE_REMOVE;
        });
    }

    // Reparents already-stolen widgets into our popup and shows it.
    // Runs from idle context, never inside signal dispatch.
    _doOpen() {
        // Reparent entry into our container.
        if (this._entry.get_parent())
            this._entry.get_parent().remove_child(this._entry);
        this._entry.visible = true;
        this._content.add_child(this._entry);

        // Reparent search results into our container.
        if (this._search.get_parent())
            this._search.get_parent().remove_child(this._search);
        this._content.add_child(this._search);

        // Apply theme before showing so colors are correct on first paint.
        this._applyTheme();

        // Backdrop first, then popup. Later addition to chrome means higher
        // in stacking order so popup sits above the backdrop naturally.
        const monitor = this._positioner.getTargetMonitor();
        this._backdrop = new PopupBackdrop(() => this.close(), monitor);
        this._backdrop.show();

        if (this.get_parent())
            Main.layoutManager.removeChrome(this);
        Main.layoutManager.addChrome(this);

        this._positioner.showCentered(() => {
            this._entry.grab_key_focus();
        });

        // Clear any previous search text, start with empty.
        this._search._text.set_text('');
        // Hide results area when empty, keeps popup compact at idle.
        this._search.visible = false;

        // Toggle results visibility based on text content.
        // Hide when empty (keeps popup compact), show when typed (gives results).
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
        // create new windows and thus escape window-created detection.
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

        // Capture Esc key to close the popup.
        // Also close on Enter or Space when focus is on a result button.
        // Handles keyboard activation of copy-to-clipboard and similar buttons.
        global.stage.connectObject(
            'captured-event', (actor, event) => {
                if (event.type() !== Clutter.EventType.KEY_PRESS)
                    return Clutter.EVENT_PROPAGATE;

                const key = event.get_key_symbol();

                if (key === Clutter.KEY_Escape) {
                    this.close();
                    return Clutter.EVENT_STOP;
                }

                // Enter or Space when focus is on a result button (not the entry).
                // Closes popup after activation. Handles copy-to-clipboard etc.
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

        // Close on key-focus loss unless focus went to a popup-menu.
        // Some results open menus and those should not dismiss us.
        //
        // Null focus is transient during actor tree mutations. Clutter
        // clears focus to null when hiding a focused actor. Refocus entry
        // immediately to prevent close and keep typing working.
        global.stage.connectObject(
            'notify::key-focus', () => {
                if (!this._visible)
                    return;
                const focus = global.stage.get_key_focus();

                // Null focus means actor was hidden and Clutter cleared it.
                // Refocus entry immediately prevents close and focus loss.
                if (!focus) {
                    this._entry.grab_key_focus();
                    return;
                }

                // Never close while entry has focus — user still typing.
                if (this._entry &&
                    (this._entry === focus || this._entry.contains(focus)))
                    return;

                // Focus anywhere within our widget tree is safe.
                if (this.contains(focus))
                    return;

                // Popup menus from results should not dismiss us.
                if (focus.has_style_class_name &&
                    focus.has_style_class_name('popup-menu'))
                    return;

                this.close();
            },
            this,
        );

        // Close when focus moves to an external application window.
        // Catches mouse clicks on web search results, copy-to-clipboard buttons,
        // and any other activation that shifts focus outside GNOME Shell.
        // notify::focus-window tracks at window manager level, not just stage.
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

    // Public entry point. Defers actual work to idle so actor tree
    // mutations never happen inside a signal dispatch, which would
    // SIGABRT on GNOME 50 / Clutter 18.
    close() {
        if ((!this._visible && !this._opening) || this._closeIdleId !== 0)
            return;

        // Cancel any pending open — we're about to close instead.
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

    // Determines whether to use light theme based on user preference
    // and GNOME system color scheme when preference is set to 'default'.
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

    // Applies or removes 'theme-light' class on our content container.
    // Stylesheet overrides all colors when this class is present.
    _applyTheme() {
        if (this._shouldUseLightTheme())
            this._content.add_style_class_name('theme-light');
        else
            this._content.remove_style_class_name('theme-light');
    }

    // Removes widgets from our popup but keeps them stolen and hidden.
    // Does NOT return them to overview — that only happens in disable().
    // Runs from idle context, never inside signal dispatch.
    _doClose() {
        this._positioner.stop();

        if (this._backdrop) {
            this._backdrop.destroy();
            this._backdrop = null;
        }

        // Disconnect stage, display, and search signals. They get reconnected on next open.
        global.stage.disconnectObject(this);
        global.display.disconnectObject(this);
        if (this._search)
            this._search.disconnectObject(this);

        // Remove entry from our container, hide it, keep it stolen.
        // Hide before detach prevents Clutter 18 unrealize assertion.
        if (this._entry && this._entry.get_parent()) {
            this._entry.visible = false;
            this._entry.get_parent().remove_child(this._entry);
        }

        // Remove search from our container, hide it, keep it stolen.
        // Hide before detach prevents Clutter 18 unrealize assertion.
        if (this._search && this._search.get_parent()) {
            this._search.hide();
            this._search.get_parent().remove_child(this._search);
        }

        this._visible = false;
        this.hide();

        if (this.get_parent())
            Main.layoutManager.removeChrome(this);
    }

    // Synchronous close, called only from destroy() during extension
    // disable. Destroy runs outside signal dispatch context so direct
    // actor mutation is safe here.
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
        // Synchronous close — destroy runs outside signal dispatch.
        this._syncClose();

        // Disconnect overview key capture (connected with regular connect).
        if (this._overviewKeyCaptureId !== 0) {
            global.stage.disconnect(this._overviewKeyCaptureId);
            this._overviewKeyCaptureId = 0;
        }

        // Disconnect all remaining signals connected with connectObject.
        global.display.disconnectObject(this);
        Shell.AppSystem.get_default().disconnectObject(this);
        global.stage.disconnectObject(this);
        this._ifaceSettings.disconnectObject(this);

        this._content = null;
        this._settings = null;

        super.destroy();
    }
});
