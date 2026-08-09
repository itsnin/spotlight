// spotlight - system actions search provider
// SPDX-License-Identifier: GPL-3.0-or-later

import * as SystemActions from 'resource:///org/gnome/shell/misc/systemActions.js';

// system actions using gnome shell's built-in systemactions module
// this is the recommended way per ego review guidelines
// getDefault() is called lazily inside each activate() callback so no
// instance is constructed at module load time (ego: only-use-initialization-for-static-resources)
const SYSTEM_ACTIONS = [
    {
        id: 'lock',
        title: 'Lock Screen',
        icon: 'changes-prevent-symbolic',
        keywords: ['lock', 'lockscreen'],
        activate: () => SystemActions.getDefault().activateLockScreen(),
    },
    {
        id: 'logout',
        title: 'Log Out',
        icon: 'system-log-out-symbolic',
        keywords: ['logout', 'signout', 'log out'],
        activate: () => SystemActions.getDefault().activateLogout(),
    },
    {
        id: 'suspend',
        title: 'Suspend',
        icon: 'weather-clear-night-symbolic',
        keywords: ['suspend', 'sleep'],
        activate: () => SystemActions.getDefault().activateSuspend(),
    },
    {
        id: 'restart',
        title: 'Restart',
        icon: 'system-reboot-symbolic',
        keywords: ['restart', 'reboot'],
        activate: () => SystemActions.getDefault().activateRestart(),
    },
    {
        id: 'shutdown',
        title: 'Shut Down',
        icon: 'system-shutdown-symbolic',
        keywords: ['shutdown', 'poweroff', 'power off'],
        activate: () => SystemActions.getDefault().activatePowerOff(),
    },
    {
        id: 'switch-user',
        title: 'Switch User',
        icon: 'system-switch-user-symbolic',
        keywords: ['switch user', 'switchuser'],
        activate: () => SystemActions.getDefault().activateSwitchUser(),
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
