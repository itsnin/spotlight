// spotlight - web search provider
// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from 'gi://Gio';

const SEARCH_ENGINES = {
    google: 'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    brave: 'https://search.brave.com/search?q=',
    bing: 'https://www.bing.com/search?q=',
    startpage: 'https://www.startpage.com/do/search?q=',
};

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
            Gio.app_info_launch_default_for_uri(
                urlTemplate + encodeURIComponent(query), null);
        },
    };
}
