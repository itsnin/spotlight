// spotlight - overview search widget stealing
// SPDX-License-Identifier: GPL-3.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Clutter from 'gi://Clutter';

// permanently steals overview's search widgets and hides them
// spotlight is first-class citizen overview itself stays functional
export function steal(popup) {
    if (popup._entry)
        return;

    // two separate toggle entry points exist in gnome shell
    // Main.toggleOverview called by super key activities button hot corner
    // Main.overview.toggle called directly by individual search results
    // both must be overridden to prevent overview from appearing

    // Main.overview.toggle called by SearchResult.activate after launching result
    // close popup do not open overview since we are not in overview to begin with
    if (!Main.overview._originalToggle) {
        Main.overview._originalToggle = Main.overview.toggle;
        Main.overview.toggle = () => {
            if (popup._visible) {
                popup.close();
                return;
            }
            Main.overview._originalToggle.call(Main.overview);
        };
    }

    // Main.toggleOverview called by super key activities button hot corner
    // when spotlight is open super does nothing matches macos behavior
    // when spotlight is closed original behavior opens overview normally
    if (Main.toggleOverview && !Main._originalToggleOverview) {
        Main._originalToggleOverview = Main.toggleOverview;
        Main.toggleOverview = () => {
            if (popup._visible)
                return;
            Main._originalToggleOverview();
        };
    }

    // steal overview's search entry
    popup._entry = Main.overview.searchEntry;
    popup._entryParent = popup._entry.get_parent();
    popup._entry.add_style_class_name('spotlight-entry-stolen');
    // ensure no background leaks through from system theme
    popup._entry.set_background_color(null);
    if (popup._entry.get_parent())
        popup._entry.get_parent().remove_child(popup._entry);
    // hide it overview will show empty space where search used to be
    popup._entry.visible = false;

    // steal overview's search controller
    popup._search = Main.overview.searchController;
    popup._searchResults = popup._search._searchResults;
    popup._searchParent = popup._search.get_parent();
    if (popup._search.get_parent())
        popup._search.get_parent().remove_child(popup._search);
    popup._search.hide();

    // prevent search controller from cancelling itself
    if (!popup._search._originalSearchCancelled) {
        popup._search._originalSearchCancelled = popup._search._searchCancelled;
        popup._search._searchCancelled = () => {};
    }

    // overview and app grid have a start typing to search feature when
    // user presses any printable character it tries to show search view

    // since we permanently stole the search widgets this would show a
    // blank screen intercept printable keys at stage level before the
    // overview sees them and consume them so nothing happens

    // only intercept when overview is visible and our popup is not visible
    // non printable keys arrows enter esc tab etc pass through normally
    if (popup._overviewKeyCaptureId === 0) {
        popup._overviewKeyCaptureId = global.stage.connect(
            'captured-event',
            (actor, event) => {
                if (event.type() !== Clutter.EventType.KEY_PRESS)
                    return Clutter.EVENT_PROPAGATE;
                if (!Main.overview.visible || popup._visible)
                    return Clutter.EVENT_PROPAGATE;
                const unicode = Clutter.keysym_to_unicode(
                    event.get_key_symbol(),
                );
                // unicode 0x20 and above are printable characters
                // control characters enter esc tab arrows etc pass through
                if (unicode >= 0x20)
                    return Clutter.EVENT_STOP;
                return Clutter.EVENT_PROPAGATE;
            },
        );
    }
}

// called once from extension.disable()
// returns stolen widgets back to overview restores original methods
export function return_(popup) {
    if (popup._entry) {
        popup._entry.remove_style_class_name('spotlight-entry-stolen');
        popup._entry.visible = true;
        if (popup._entry.get_parent())
            popup._entry.get_parent().remove_child(popup._entry);
        popup._entryParent.add_child(popup._entry);
        popup._entry = null;
        popup._entryParent = null;
    }

    if (popup._search) {
        if (popup._textChangedEventId) {
            popup._search._text.disconnect(popup._textChangedEventId);
            popup._textChangedEventId = 0;
        }

        // restore original search cancelled method
        if (popup._search._originalSearchCancelled) {
            popup._search._searchCancelled = popup._search._originalSearchCancelled;
            popup._search._originalSearchCancelled = null;
        }

        if (popup._search.get_parent())
            popup._search.get_parent().remove_child(popup._search);
        popup._searchParent.add_child(popup._search);
        popup._search = null;
        popup._searchParent = null;
        popup._searchResults = null;
    }

    // restore overview methods
    if (Main.overview._originalToggle) {
        Main.overview.toggle = Main.overview._originalToggle;
        Main.overview._originalToggle = null;
    }
    if (Main._originalToggleOverview) {
        Main.toggleOverview = Main._originalToggleOverview;
        Main._originalToggleOverview = null;
    }
}
