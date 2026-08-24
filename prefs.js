// spotlight - preferences window
// SPDX-License-Identifier: GPL-3.0-or-later
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import {buildShortcutPage} from './prefs/shortcutPage.js';
import {buildBehaviorPage} from './prefs/behaviorPage.js';
import {buildAboutPage} from './prefs/aboutPage.js';

// each category gets its own page tab in the sidebar
// keyboard shortcuts behavior multi monitor and about
export default class SpotlightPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const keyboardPage = new Adw.PreferencesPage({
            title: 'Keyboard',
            icon_name: 'input-keyboard-symbolic',
        });
        keyboardPage.add(buildShortcutPage(settings));
        window.add(keyboardPage);

        const behaviorPage = new Adw.PreferencesPage({
            title: 'Behavior',
            icon_name: 'preferences-system-symbolic',
        });
        behaviorPage.add(buildBehaviorPage(settings));
        window.add(behaviorPage);

        const aboutPage = new Adw.PreferencesPage({
            title: 'About',
            icon_name: 'help-about-symbolic',
        });
        aboutPage.add(buildAboutPage());
        window.add(aboutPage);

        window.set_search_enabled(true);
    }
}
