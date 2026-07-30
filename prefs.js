// spotlight - preferences window
// SPDX-License-Identifier: GPL-3.0-or-later

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';

import {buildShortcutPage} from './preferences/shortcutPage.js';
import {buildAppearancePage} from './preferences/appearancePage.js';
import {buildWebSearchPage} from './preferences/webSearchPage.js';
import {buildAboutPage} from './preferences/aboutPage.js';

export default class SpotlightPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'Spotlight',
            icon_name: 'system-search-symbolic',
        });

        page.add(buildShortcutPage(settings));
        page.add(buildAppearancePage(settings));
        page.add(buildWebSearchPage(settings));
        page.add(buildAboutPage());

        window.add(page);
        window.set_search_enabled(true);
    }
}
