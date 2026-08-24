// spotlight - theme detection and application
// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';

// determines whether to use light theme based on user preference
// and gnome system color scheme when preference is set to default
export function shouldUseLightTheme(settings, ifaceSettings) {
    const pref = settings.get_string('theme-preference');
    if (pref === 'light')
        return true;
    if (pref === 'dark')
        return false;
    // default follows gnome system color scheme
    const scheme = ifaceSettings.get_string('color-scheme');
    return scheme === 'prefer-light';
}

// applies or removes theme light class on our content container
// stylesheet overrides all colors when this class is present
export function apply(content, settings, ifaceSettings) {
    if (shouldUseLightTheme(settings, ifaceSettings))
        content.add_style_class_name('theme-light');
    else
        content.remove_style_class_name('theme-light');
}

// creates the gnome interface settings object used to read system color scheme
export function createInterfaceSettings() {
    return new Gio.Settings({
        schema_id: 'org.gnome.desktop.interface',
    });
}
