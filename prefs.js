// spotlight - preferences window
// SPDX-License-Identifier: GPL-3.0-or-later
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import {buildShortcutPage} from './prefs/shortcutPage.js';
import {buildAppearancePage} from './prefs/appearancePage.js';
import {buildAboutPage} from './prefs/aboutPage.js';

// Workspaces bar preferences pages
import {AppearancePage as SpaceBarAppearancePage} from './prefs/workspaces/AppearancePage.js';
import {BehaviorPage as SpaceBarBehaviorPage} from './prefs/workspaces/BehaviorPage.js';
import {ShortcutsPage as SpaceBarShortcutsPage} from './prefs/workspaces/ShortcutsPage.js';

// each category gets its own page tab in the sidebar
// keyboard shortcuts appearance theme and about
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

        // Workspaces bar preferences pages
        // only relevant when space bar is enabled but always accessible
        const sbAppearance = new SpaceBarAppearancePage(this);
        sbAppearance.window = window;
        sbAppearance.init();
        sbAppearance.page.set_title('Workspaces Appearance');
        sbAppearance.page.set_icon_name('applications-graphics-symbolic');
        window.add(sbAppearance.page);

        const sbBehavior = new SpaceBarBehaviorPage(this);
        sbBehavior.window = window;
        sbBehavior.init();
        sbBehavior.page.set_title('Workspaces Behavior');
        sbBehavior.page.set_icon_name('preferences-system-symbolic');
        window.add(sbBehavior.page);

        const sbShortcuts = new SpaceBarShortcutsPage(this);
        sbShortcuts.window = window;
        sbShortcuts.init();
        sbShortcuts.page.set_title('Workspaces Shortcuts');
        sbShortcuts.page.set_icon_name('preferences-desktop-keyboard-shortcuts-symbolic');
        window.add(sbShortcuts.page);

        const aboutPage = new Adw.PreferencesPage({
            title: 'About',
            icon_name: 'help-about-symbolic',
        });
        aboutPage.add(buildAboutPage());
        window.add(aboutPage);

        window.set_search_enabled(true);
    }
}
