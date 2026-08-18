// spotlight - runs a search and renders the result rows
// SPDX-License-Identifier: GPL-3.0-or-later

import GLib from 'gi://GLib';
import {buildResultRow} from './resultRow.js';
import {buildSectionHeader} from './sectionHeader.js';
import {buildNoResults} from './noResults.js';
import {getSectionTitle} from './sectionTitles.js';
import {runSearch} from './searchController.js';

// debounces search-as-you-type and turns results into row widgets - owns
// the search idle source and calls into a SelectionManager for anything
// selection-related, it does not touch selection state directly
export class ResultsRenderer {
    constructor(resultsBox, resultsScroll, selection, settings, onActivate, onHover) {
        this._resultsBox = resultsBox;
        this._resultsScroll = resultsScroll;
        this._selection = selection;
        this._settings = settings;
        this._onActivate = onActivate;
        this._onHover = onHover;
        this._searchIdleId = 0;
    }

    _clearSearchIdle() {
        if (this._searchIdleId) {
            GLib.source_remove(this._searchIdleId);
            this._searchIdleId = 0;
        }
    }

    onTextChanged(text) {
        this._clearSearchIdle();

        if (text.trim().length === 0) {
            this.reset();
            return;
        }

        this._searchIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._searchIdleId = 0;
            this._runSearch(text);
            return GLib.SOURCE_REMOVE;
        });
    }

    _runSearch(text) {
        this._selection.setResults(runSearch(text, this._settings));
        this._resultsBox.destroy_all_children();

        if (this._selection.results.length === 0) {
            this._resultsBox.add_child(buildNoResults(text.trim()));
        } else {
            this._renderResults();
            this._selection.applySelection(0, true);
        }

        this._resultsScroll.show();
    }

    _renderResults() {
        let lastType = null;
        let rowIndex = 0;
        for (const result of this._selection.results) {
            if (result.type !== lastType) {
                lastType = result.type;
                this._resultsBox.add_child(buildSectionHeader(getSectionTitle(result.type)));
            }
            this._resultsBox.add_child(
                buildResultRow(result, rowIndex, this._onActivate, this._onHover)
            );
            rowIndex++;
        }
    }

    reset() {
        this._clearSearchIdle();
        this._selection.setResults([]);
        this._resultsBox.destroy_all_children();
        this._resultsScroll.hide();
    }

    destroy() {
        this._clearSearchIdle();
    }
}
