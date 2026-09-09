// Spotlight: global signal connections
// SPDX-License-Identifier: GPL-3.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Shell from 'gi://Shell';
import {applyTheme} from './theme.js';

// Connects global signals that live for the popup lifetime. Window-created and
// app-state-changed close the popup when visible. Color-scheme changes update
// the theme live when preference is default and the popup is open.
export function connectGlobalSignals(popup, settings, ifaceSettings) {
    global.display.connectObject(
        'window-created', () => { if (popup._visible) popup.close(); },
        popup,
    );
    Shell.AppSystem.get_default().connectObject(
        'app-state-changed', () => { if (popup._visible) popup.close(); },
        popup,
    );
    ifaceSettings.connectObject(
        'changed::color-scheme', () => {
            if (popup._visible &&
                settings.get_string('theme-preference') === 'default')
                applyTheme(popup._content, settings, ifaceSettings);
        },
        popup,
    );
}

// Disconnects the global signals. The popup is the connectObject owner, so
// we only need to explicitly disconnect from objects that are not global.stage
// or global.display (those are handled separately in destroy).
export function disconnectGlobalSignals(popup) {
    global.display.disconnectObject(popup);
    Shell.AppSystem.get_default().disconnectObject(popup);
}
