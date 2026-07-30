// search providers for spotlight
// SPDX-License-Identifier: GPL-3.0-or-later
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { evaluateArithmetic, formatNumber, fuzzyScore } from './util.js';
const SEARCH_ENGINES = {
    google: 'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    brave: 'https://search.brave.com/search?q=',
    bing: 'https://www.bing.com/search?q=',
    startpage: 'https://www.startpage.com/do/search?q=',
};
const SETTINGS_PANELS = [
    { id: 'wifi', title: 'Wi-Fi' },
    { id: 'network', title: 'Network' },
    { id: 'bluetooth', title: 'Bluetooth' },
    { id: 'display', title: 'Displays' },
    { id: 'sound', title: 'Sound' },
    { id: 'power', title: 'Power' },
    { id: 'keyboard', title: 'Keyboard' },
    { id: 'mouse', title: 'Mouse & Touchpad' },
    { id: 'printers', title: 'Printers' },
    { id: 'color', title: 'Color' },
    { id: 'region', title: 'Region & Language' },
    { id: 'universal-access', title: 'Accessibility' },
    { id: 'users', title: 'Users' },
    { id: 'privacy', title: 'Privacy' },
    { id: 'search', title: 'Search' },
    { id: 'applications', title: 'Applications' },
    { id: 'online-accounts', title: 'Online Accounts' },
    { id: 'sharing', title: 'Sharing' },
    { id: 'multitasking', title: 'Multitasking' },
    { id: 'background', title: 'Background' },
    { id: 'notifications', title: 'Notifications' },
    { id: 'datetime', title: 'Date & Time' },
    { id: 'about', title: 'About' },
];
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
            // asks gnome session manager to log out
            // the 0 means don't force - will show confirmation if other users are logged in
            Gio.DBus.session.call_sync('org.gnome.SessionManager', '/org/gnome/SessionManager', 'org.gnome.SessionManager', 'Logout', GLib.Variant.new('(u)', [0]), null, Gio.DBusCallFlags.NONE, -1, null);
        },
    },
    {
        id: 'suspend',
        title: 'Suspend',
        icon: 'weather-clear-night-symbolic',
        keywords: ['suspend', 'sleep'],
        activate: () => {
            // asks logind to suspend the system
            Gio.DBus.system.call_sync('org.freedesktop.login1', '/org/freedesktop/login1', 'org.freedesktop.login1.Manager', 'Suspend', GLib.Variant.new('(b)', [true]), null, Gio.DBusCallFlags.NONE, -1, null);
        },
    },
    {
        id: 'restart',
        title: 'Restart',
        icon: 'system-reboot-symbolic',
        keywords: ['restart', 'reboot'],
        activate: () => {
            // asks logind to reboot - the boolean is "interactive" which shows confirmation
            Gio.DBus.system.call_sync('org.freedesktop.login1', '/org/freedesktop/login1', 'org.freedesktop.login1.Manager', 'Reboot', GLib.Variant.new('(b)', [true]), null, Gio.DBusCallFlags.NONE, -1, null);
        },
    },
    {
        id: 'shutdown',
        title: 'Shut Down',
        icon: 'system-shutdown-symbolic',
        keywords: ['shutdown', 'poweroff', 'power off'],
        activate: () => {
            // asks logind to power off the machine
            Gio.DBus.system.call_sync('org.freedesktop.login1', '/org/freedesktop/login1', 'org.freedesktop.login1.Manager', 'PowerOff', GLib.Variant.new('(b)', [true]), null, Gio.DBusCallFlags.NONE, -1, null);
        },
    },
];
// searches installed apps using shell appsystem
// uses fuzzy matching so ffx matches firefox
// dedupes by base name so firefox and firefox esr don't both show
// sorts by fuzzy match score then by usage frequency
export function searchApps(query, maxResults) {
    const appSystem = Shell.AppSystem.get_default();
    const allApps = appSystem.get_installed();
    const seenNames = new Set();
    const scored = [];
    for (const app of allApps) {
        const name = app.get_name();
        const id = app.get_id();
        // score the app name and the desktop file id
        // take the better of the two scores
        const nameScore = fuzzyScore(query, name);
        const idScore = fuzzyScore(query, id.replace('.desktop', ''));
        const bestScore = Math.min(nameScore, idScore);
        // skip if neither matched
        if (bestScore < 0)
            continue;
        // dedupe by base name so firefox and firefox esr don't both show
        const baseName = name.toLowerCase().split('-')[0].trim();
        if (seenNames.has(baseName))
            continue;
        seenNames.add(baseName);
        scored.push({ app, appId: id, title: name, score: bestScore });
    }
    // sort by fuzzy score first then by usage frequency
    scored.sort((a, b) => {
        if (a.score !== b.score)
            return a.score - b.score;
        const appUsage = Shell.AppUsage.get_default();
        return appUsage.compare(a.appId, b.appId);
    });
    // take the top n results and wrap them in result objects
    return scored.slice(0, maxResults).map(({ app, appId, title }) => ({
        type: 'app',
        title,
        app,
        appId,
        activate: () => {
            // prefer shellapp.activate for window tracking integration
            // fall back to direct launch if the app isn't in the shell's registry
            const shellApp = appSystem.lookup_app(app.get_id());
            if (shellApp)
                shellApp.activate();
            else
                app.launch([], null);
        },
    }));
}
// returns a calculator result if the input is valid arithmetic
export function searchCalculator(query) {
    const result = evaluateArithmetic(query);
    if (result === null)
        return null;
    return {
        type: 'calculator',
        title: formatNumber(result),
        description: 'Press Enter to copy to clipboard',
        icon: 'accessories-calculator-symbolic',
        activate: () => {
            // clipboard write only - triggered by explicit user action on the calculator result
            // declared in metadata.json description
            const St = imports.gi.St;
            const clipboard = St.Clipboard.get_default();
            clipboard.set_text(St.ClipboardType.CLIPBOARD, formatNumber(result));
        },
    };
}
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
            Gio.Subprocess.new(['gnome-control-center', panel.id], Gio.SubprocessFlags.NONE).wait_check_async(null, () => { });
        },
    }));
}
// returns a web search result for the given query
// only called when no local results matched
export function searchWeb(query, engineName) {
    const urlTemplate = SEARCH_ENGINES[engineName] || SEARCH_ENGINES.google;
    return {
        type: 'web',
        title: `Search the web for "${query}"`,
        description: `Open ${engineName} in your browser`,
        icon: 'web-browser-symbolic',
        activate: () => {
            Gio.app_info_launch_default_for_uri(urlTemplate + encodeURIComponent(query), null);
        },
    };
}
