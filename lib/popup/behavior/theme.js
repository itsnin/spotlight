// Spotlight: theme decision logic
// SPDX-License-Identifier: GPL-3.0-or-later

// Decides whether to use the light theme based on user preference and the
// system color scheme when preference is set to default.
export function shouldUseLightTheme(settings, ifaceSettings) {
    const pref = settings.get_string('theme-preference');
    if (pref === 'light')
        return true;
    if (pref === 'dark')
        return false;
    const scheme = ifaceSettings.get_string('color-scheme');
    return scheme === 'prefer-light';
}

// Applies or removes the theme-light class on the content container.
export function applyTheme(content, settings, ifaceSettings) {
    if (shouldUseLightTheme(settings, ifaceSettings))
        content.add_style_class_name('theme-light');
    else
        content.remove_style_class_name('theme-light');
}
