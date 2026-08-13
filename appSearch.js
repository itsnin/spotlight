// spotlight - app search provider
// SPDX-License-Identifier: GPL-3.0-or-later

import Shell from 'gi://Shell';

// searches installed apps using gnome shell's native search algorithm
// prioritizes prefix matches over partial matches just like gnome default search
// dedupes by base name so firefox and firefox esr don't both show
// sorts by match quality then by usage frequency
export function searchApps(query, maxResults) {
    const appSystem = Shell.AppSystem.get_default();
    const results = appSystem.search(query);
    const seenNames = new Set();
    const filtered = [];

    for (const app of results) {
        const name = app.get_name() || '';
        const id = app.get_id() || '';

        // strip a known trailing variant suffix (e.g. "Firefox ESR" -> "firefox")
        // rather than splitting on any hyphen, which would also wrongly
        // truncate apps whose real name contains one, like "GNOME-Builder"
        const baseName = name.toLowerCase()
            .replace(/[\s-]+(esr|beta|nightly|dev|canary|stable|preview)$/, '')
            .trim();
        if (seenNames.has(baseName))
            continue;
        seenNames.add(baseName);

        filtered.push({app, appId: id, title: name});
    }

    return filtered.slice(0, maxResults).map(({app, appId, title}) => ({
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
