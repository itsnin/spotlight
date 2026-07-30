// spotlight - system actions search provider
// SPDX-License-Identifier: GPL-3.0-or-later

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as SystemActions from 'resource:///org/gnome/shell/misc/systemActions.js';

// system actions - routed through the shell's SystemActions singleton, which
// already handles policy/permission checks, so we don't call dbus directly
const systemActions = new SystemActions.getDefault();

const SYSTEM_ACTIONS = [
    {
        id: 'lock',
        title: 'Lock Screen',
        icon: 'changes-prevent-symbolic',
        keywords: ['lock', 'lockscreen'],
        activate: () => Main.screenShield.lock(true),
    },
    {
        id: 'logout',
        title: 'Log Out',
        icon: 'system-log-out-symbolic',
        keywords: ['logout', 'signout', 'log out'],
        activate: () => systemActions.activateLogout(),
    },
    {
        id: 'suspend',
        title: 'Suspend',
        icon: 'weather-clear-night-symbolic',
        keywords: ['suspend', 'sleep'],
        activate: () => systemActions.activateSuspend(),
    },
    {
        id: 'restart',
        title: 'Restart',
        icon: 'system-reboot-symbolic',
        keywords: ['restart', 'reboot'],
        activate: () => systemActions.activateRestart(),
    },
    {
        id: 'shutdown',
        title: 'Shut Down',
        icon: 'system-shutdown-symbolic',
        keywords: ['shutdown', 'poweroff', 'power off'],
        activate: () => systemActions.activatePowerOff(),
    },
    {
        id: 'switch-user',
        title: 'Switch User',
        icon: 'system-switch-user-symbolic',
        keywords: ['switch user', 'switchuser'],
        activate: () => systemActions.activateSwitchUser(),
    },
];

// searches system actions by title and keywords
export function searchSystemActions(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const action of SYSTEM_ACTIONS) {
        if (action.title.toLowerCase().includes(lowerQuery) ||
            action.keywords.some(kw => kw.includes(lowerQuery) || lowerQuery.includes(kw))) {
            results.push({
                type: 'system-action',
                title: action.title,
                description: 'System',
                icon: action.icon,
                activate: () => action.activate(),
            });
        }
    }

    return results;
}
