// spotlight - search controller
// SPDX-License-Identifier: GPL-3.0-or-later
import {searchApps} from './appSearch.js';
import {searchCalculator} from './calculatorSearch.js';
import {searchSystemActions} from './systemActionsSearch.js';
import {searchSettings} from './settingsSearch.js';
import {searchFiles} from './fileSearch.js';
import {searchWeb} from './webSearch.js';
// orchestrates all search providers and combines results in priority order
// priority: apps first then files then calculator then system actions then settings then web last
export function runSearch(text, settings) {
    const trimmed = text.trim();
    const maxResults = settings.get_int('max-results');
    const allResults = [];
    allResults.push(...searchApps(trimmed, maxResults));
    allResults.push(...searchFiles(trimmed, Math.floor(maxResults / 2)));
    const calcResult = searchCalculator(trimmed);
    if (calcResult)
        allResults.push(calcResult);
    allResults.push(...searchSystemActions(trimmed));
    allResults.push(...searchSettings(trimmed));
    if (allResults.length === 0 && settings.get_boolean('show-web-search')) {
        const engine = settings.get_string('web-search-engine');
        allResults.push(searchWeb(trimmed, engine));
    }
    return allResults;
}
