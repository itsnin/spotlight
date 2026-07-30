// spotlight - app search provider
// SPDX-License-Identifier: GPL-3.0-or-later

import Shell from 'gi://Shell';
import {fuzzyScore} from '../utils/fuzzyMatcher.js';

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
        const name = app.get_name() ?? '';
        const id = app.get_id() ?? '';

        const nameScore = fuzzyScore(query, name);
        const idScore = fuzzyScore(query, id.replace('.desktop', ''));
        const bestScore = Math.min(nameScore, idScore);

        if (bestScore < 0)
            continue;

        const baseName = name.toLowerCase().split('-')[0].trim();
        if (seenNames.has(baseName))
            continue;
        seenNames.add(baseName);

        scored.push({app, appId: id, title: name, score: bestScore});
    }

    scored.sort((a, b) => {
        if (a.score !== b.score)
            return a.score - b.score;
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
