// spotlight - settings search provider
// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from 'gi://Gio';

const SETTINGS_PANELS = [
    {id: 'wifi', title: 'Wi-Fi'},
    {id: 'network', title: 'Network'},
    {id: 'bluetooth', title: 'Bluetooth'},
    {id: 'display', title: 'Displays'},
    {id: 'sound', title: 'Sound'},
    {id: 'power', title: 'Power'},
    {id: 'keyboard', title: 'Keyboard'},
    {id: 'mouse', title: 'Mouse & Touchpad'},
    {id: 'printers', title: 'Printers'},
    {id: 'color', title: 'Color'},
    {id: 'region', title: 'Region & Language'},
    {id: 'universal-access', title: 'Accessibility'},
    {id: 'users', title: 'Users'},
    {id: 'privacy', title: 'Privacy'},
    {id: 'search', title: 'Search'},
    {id: 'applications', title: 'Applications'},
    {id: 'online-accounts', title: 'Online Accounts'},
    {id: 'sharing', title: 'Sharing'},
    {id: 'multitasking', title: 'Multitasking'},
    {id: 'background', title: 'Background'},
    {id: 'notifications', title: 'Notifications'},
    {id: 'datetime', title: 'Date & Time'},
    {id: 'about', title: 'About'},
];

// searches gnome settings panels by title
// normalizes by removing hyphens and underscores so wifi matches wi-fi
export function searchSettings(query) {
    const lowerQuery = query.toLowerCase();
    const normalizedQuery = lowerQuery.replace(/[-_\s]/g, '');

    const matchingPanels = SETTINGS_PANELS.filter(p => {
        const normalizedTitle = p.title.toLowerCase().replace(/[-_\s]/g, '');
        return normalizedTitle.includes(normalizedQuery) ||
               p.title.toLowerCase().includes(lowerQuery);
    });

    return matchingPanels.slice(0, 3).map(panel => ({
        type: 'settings',
        title: panel.title,
        description: 'GNOME Settings',
        icon: 'preferences-system-symbolic',
        activate: () => {
            Gio.Subprocess.new(
                ['gnome-control-center', panel.id],
                Gio.SubprocessFlags.NONE,
            ).wait_check_async(null, () => {});
        },
    }));
}
