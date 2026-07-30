// spotlight - system actions search provider
// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// system actions that talk to systemd and gnome session manager via dbus
// dbus is preferred over spawning subprocesses per the ego review guidelines
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
        activate: () => {
            Gio.DBus.session.call_sync(
                'org.gnome.SessionManager',
                '/org/gnome/SessionManager',
                'org.gnome.SessionManager',
                'Logout',
                GLib.Variant.new('(u)', [0]),
                null, Gio.DBusCallFlags.NONE, -1, null);
        },
    },
    {
        id: 'suspend',
        title: 'Suspend',
        icon: 'weather-clear-night-symbolic',
        keywords: ['suspend', 'sleep'],
        activate: () => {
            Gio.DBus.system.call_sync(
                'org.freedesktop.login1',
                '/org/freedesktop/login1',
                'org.freedesktop.login1.Manager',
                'Suspend',
                GLib.Variant.new('(b)', [true]),
                null, Gio.DBusCallFlags.NONE, -1, null);
        },
    },
    {
        id: 'restart',
        title: 'Restart',
        icon: 'system-reboot-symbolic',
        keywords: ['restart', 'reboot'],
        activate: () => {
            Gio.DBus.system.call_sync(
                'org.freedesktop.login1',
                '/org/freedesktop/login1',
                'org.freedesktop.login1.Manager',
                'Reboot',
                GLib.Variant.new('(b)', [true]),
                null, Gio.DBusCallFlags.NONE, -1, null);
        },
    },
    {
        id: 'shutdown',
        title: 'Shut Down',
        icon: 'system-shutdown-symbolic',
        keywords: ['shutdown', 'poweroff', 'power off'],
        activate: () => {
            Gio.DBus.system.call_sync(
                'org.freedesktop.login1',
                '/org/freedesktop/login1',
                'org.freedesktop.login1.Manager',
                'PowerOff',
                GLib.Variant.new('(b)', [true]),
                null, Gio.DBusCallFlags.NONE, -1, null);
        },
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
