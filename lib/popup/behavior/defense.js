// Spotlight: popup close defense layers
// SPDX-License-Identifier: GPL-3.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';

// Installs the multi-layer close defense on a popup. Each layer catches a
// different activation path that the others might miss.
export function installCloseDefense(popup, search, entry) {
    // Layer 1: mouse clicks on any result. Uses idle so activation runs first.
    search.connectObject(
        'button-press-event', () => {
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                if (popup._visible)
                    popup.close();
                return GLib.SOURCE_REMOVE;
            });
            return Clutter.EVENT_PROPAGATE;
        },
        popup,
    );

    // Layer 2: Esc, Enter or Space on result buttons.
    global.stage.connectObject(
        'captured-event', (actor, event) => {
            if (event.type() !== Clutter.EventType.KEY_PRESS)
                return Clutter.EVENT_PROPAGATE;

            const key = event.get_key_symbol();

            if (key === Clutter.KEY_Escape) {
                popup.close();
                return Clutter.EVENT_STOP;
            }

            if (key === Clutter.KEY_Return ||
                key === Clutter.KEY_KP_Enter ||
                key === Clutter.KEY_space) {
                const focus = global.stage.get_key_focus();
                if (focus &&
                    focus !== entry &&
                    !entry.contains(focus) &&
                    popup.contains(focus) &&
                    (!focus.has_style_class_name ||
                     !focus.has_style_class_name('popup-menu'))) {
                    popup.close();
                }
            }

            return Clutter.EVENT_PROPAGATE;
        },
        popup,
    );

    // Close on key-focus loss unless focus moved to a popup-menu.
    global.stage.connectObject(
        'notify::key-focus', () => {
            if (!popup._visible)
                return;
            const focus = global.stage.get_key_focus();

            if (!focus) {
                entry.grab_key_focus();
                return;
            }

            if (entry && (entry === focus || entry.contains(focus)))
                return;

            if (popup.contains(focus))
                return;

            if (focus.has_style_class_name &&
                focus.has_style_class_name('popup-menu'))
                return;

            popup.close();
        },
        popup,
    );

    // Layer 3: external app focus at the window manager level. Catches web
    // search opening in a browser and any activation that shifts focus outside
    // the GNOME Shell stage.
    global.display.connectObject(
        'notify::focus-window', () => {
            if (!popup._visible)
                return;
            if (global.display.focus_window !== null)
                popup.close();
        },
        popup,
    );
}

// Disconnects all defense handlers. The popup itself is the connectObject owner
// so disconnectObject on the popup cleans everything.
export function uninstallCloseDefense(popup, search) {
    global.stage.disconnectObject(popup);
    global.display.disconnectObject(popup);
    if (search)
        search.disconnectObject(popup);
}
