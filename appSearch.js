// spotlight - app search provider
// SPDX-License-Identifier: GPL-3.0-or-later
import Shell from 'gi://Shell';

// searches installed apps using shell appsystem
// uses gnome-style matching: prefix first then word-prefix then substring
// this is how gnome default search works so chro finds chrome not claude
// dedupes by base name so firefox and firefox esr don't both show
// sorts by match tier then by usage frequency
export function searchApps(query, maxResults) {
    const appSystem = Shell.AppSystem.get_default();
    const allApps = appSystem.get_installed();
    const seenNames = new Set();
    const scored = [];
    const q = query.toLowerCase();

    for (const app of allApps) {
        const name = app.get_name() || '';
        const id = app.get_id() || '';
        const nameLower = name.toLowerCase();
        const idLower = id.replace('.desktop', '').toLowerCase();

        // tier determines match quality - lower is better
        // tier 0: name starts with query
        // tier 1: any word in name starts with query
        // tier 2: name contains query anywhere
        // tier 3: desktop id contains query
        // -1: no match
        let tier = -1;

        if (nameLower.startsWith(q)) {
            tier = 0;
        } else if (_wordPrefixMatch(nameLower, q)) {
            tier = 1;
        } else if (nameLower.includes(q)) {
            tier = 2;
        } else if (idLower.includes(q)) {
            tier = 3;
        }

        if (tier < 0)
            continue;

        // strip a known trailing variant suffix (e.g. "Firefox ESR" -> "firefox")
        // rather than splitting on any hyphen, which would also wrongly
        // truncate apps whose real name contains one, like "GNOME-Builder"
        const baseName = nameLower
            .replace(/[\s-]+(esr|beta|nightly|dev|canary|stable|preview)$/, '')
            .trim();

        if (seenNames.has(baseName))
            continue;
        seenNames.add(baseName);

        scored.push({app, appId: id, title: name, tier});
    }

    scored.sort((a, b) => {
        if (a.tier !== b.tier)
            return a.tier - b.tier;
        const appUsage = Shell.AppUsage.get_default();
        return appUsage.compare(a.appId, b.appId);
    });

    return scored.slice(0, maxResults).map(({app, appId, title}) => ({
        type: 'app',
        title,
        app,
        appId,
        activate: () => {
            const shellApp = appSystem.lookup_app(app.get_id());
            if (shellApp)
                shellApp.activate();
            else
                app.launch([], null);
        },
    }));
}

// checks if query matches the start of any word in the name
// word boundaries are space hyphen underscore dot and start of string
// this is what makes "chro" match "Google Chrome" via the second word
function _wordPrefixMatch(nameLower, queryLower) {
    const len = queryLower.length;
    if (len === 0)
        return false;

    // check at start of string
    if (nameLower.startsWith(queryLower))
        return true;

    // check after each word boundary character
    for (let i = 0; i < nameLower.length - len; i++) {
        const c = nameLower[i];
        if (c === ' ' || c === '-' || c === '_' || c === '.') {
            if (nameLower.substring(i + 1, i + 1 + len) === queryLower)
                return true;
        }
    }

    return false;
}
