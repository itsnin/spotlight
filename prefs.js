// spotlight - preferences window
// SPDX-License-Identifier: GPL-3.0-or-later
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import {buildShortcutPage} from './prefs/shortcutPage.js';
import {buildAppearancePage} from './prefs/appearancePage.js';
import {buildAboutPage} from './prefs/aboutPage.js';

export default class SpotlightPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const keyboardPage = new Adw.PreferencesPage({
            title: 'Keyboard',
            icon_name: 'input-keyboard-symbolic',
        });
        keyboardPage.add(buildShortcutPage(settings));
        window.add(keyboardPage);

        const appearancePage = new Adw.PreferencesPage({
            title: 'Appearance',
            icon_name: 'applications-graphics-symbolic',
        });
        const appearanceGroups = buildAppearancePage(settings);
        for (const group of appearanceGroups)
            appearancePage.add(group);
        window.add(appearancePage);

        const aboutPage = new Adw.PreferencesPage({
            title: 'About',
            icon_name: 'help-about-symbolic',
        });
        aboutPage.add(buildAboutPage());
        window.add(aboutPage);

        window.set_search_enabled(true);
    }
}
