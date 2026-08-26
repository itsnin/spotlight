// spotlight - clipboard history manager
// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {ClipboardEntry, readClipboardContent} from './clipboardEntry.js';
import {Registry} from './clipboardRegistry.js';

const CLIPBOARD_TYPE = St.ClipboardType.CLIPBOARD;

export class ClipboardManager {
    constructor(settings, uuid) {
        this._settings = settings;
        this._clipboard = St.Clipboard.get_default();
        this._history = [];
        this._maxSize = settings.get_int('clipboard-history-size');
        this._listeners = new Set();
        this._signalId = 0;
        this._ignoreCount = 0;
        this._loading = false;
        this._privateMode = false;
        this._registry = new Registry(uuid);

        this._settingsChangedId = settings.connect(
            'changed::clipboard-history-size',
            () => this.setMaxSize(settings.get_int('clipboard-history-size')),
        );
        this._excludedApps = settings.get_strv('clipboard-excluded-apps');
        this._excludedAppsChangedId = settings.connect(
            'changed::clipboard-excluded-apps',
            () => this._excludedApps = settings.get_strv('clipboard-excluded-apps'),
        );

        // load persisted history from disk
        this._loadFromDisk();
    }

    async _loadFromDisk() {
        this._loading = true;
        try {
            const entries = await this._registry.read();
            this._history = entries.slice(0, this._maxSize);
            this._notify();
        } catch {
            // fail silently start with empty history
        } finally {
            this._loading = false;
        }
    }

    start() {
        if (this._signalId !== 0)
            return;
        // use meta selection owner changed signal same approach as clipboard indicator
        // this signal fires once per ownership change and tells us which selection type
        // avoids the dual signal problem when setting both clipboard and primary
        const metaDisplay = Shell.Global.get().get_display();
        this._metaSelection = metaDisplay.get_selection();
        this._signalId = this._metaSelection.connect(
            'owner-changed',
            (selection, selectionType, selectionSource) => {
                if (selectionType === Meta.SelectionType.SELECTION_CLIPBOARD)
                    this._onClipboardChanged();
            },
        );
    }

    stop() {
        if (this._signalId !== 0) {
            this._metaSelection.disconnect(this._signalId);
            this._signalId = 0;
            this._metaSelection = null;
        }
        this._listeners.clear();
    }

    destroy() {
        this.stop();
        // persist current history to disk flush debounced writes immediately
        if (this._settings.get_boolean('clipboard-cache-only-favorites')) {
            const favsOnly = this._history.filter(e => e.isFavorite());
            this._registry.write(favsOnly);
        } else {
            this._persist();
        }
        this._registry.flush();
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }
        if (this._excludedAppsChangedId) {
            this._settings.disconnect(this._excludedAppsChangedId);
            this._excludedAppsChangedId = 0;
        }
        this._history = [];
    }

    // subscribe to history changes
    subscribe(callback) {
        this._listeners.add(callback);
        return () => this._listeners.delete(callback);
    }

    _notify() {
        for (const cb of this._listeners)
            cb(this._history);
    }

    _persist() {
        if (this._settings.get_boolean('clipboard-cache-only-favorites')) {
            const favsOnly = this._history.filter(e => e.isFavorite());
            this._registry.write(favsOnly);
        } else {
            this._persist();
        }
    }

    // called when clipboard content changes
    async _onClipboardChanged() {
        if (this._ignoreCount > 0) {
            this._ignoreCount--;
            return;
        }
        // safety guard ignore count should never go negative
        if (this._ignoreCount < 0)
            this._ignoreCount = 0;
        // private mode skip tracking entirely
        if (this._privateMode)
            return;
        // check excluded apps
        try {
            const focussedWindow = Shell.Global.get().display.focusWindow;
            const wmClass = focussedWindow?.get_wm_class();
            if (wmClass && this.isExcludedApp(wmClass))
                return;
        } catch {}
        try {
            const entry = await readClipboardContent(this._clipboard);
            if (!entry)
                return;
            // strip whitespace if enabled
            if (entry.isText() && this._settings.get_boolean('clipboard-strip-text')) {
                const stripped = entry.getStringValue().trim();
                if (stripped.length === 0)
                    return;
                if (stripped !== entry.getStringValue()) {
                    entry.setText(stripped);
                    this._ignoreCount++;
                    this._clipboard.set_text(CLIPBOARD_TYPE, stripped);
                    this._clipboard.set_text(St.ClipboardType.PRIMARY, stripped);
                }
            }
            // ignore empty text
            if (entry.isText() && entry.getStringValue().trim().length === 0)
                return;
            this._addEntry(entry);
        } catch {
            // fail silently
        }
    }

    // add entry to history deduplicate most recent goes to top
    _addEntry(entry) {
        // remove duplicate if exists
        const existingIndex = this._history.findIndex(e => e.equals(entry));
        if (existingIndex !== -1)
            this._history.splice(existingIndex, 1);
        // add to top
        this._history.unshift(entry);
        // trim to max size but preserve favorites
        while (this._history.length > this._maxSize) {
            // find last non favorite entry to remove
            let removeIndex = -1;
            for (let i = this._history.length - 1; i >= 0; i--) {
                if (!this._history[i].isFavorite()) {
                    removeIndex = i;
                    break;
                }
            }
            if (removeIndex === -1)
                break; // all are favorites stop trimming
            this._history.splice(removeIndex, 1);
        }
        this._notify();
        // persist to disk
        if (this._settings.get_boolean('clipboard-cache-only-favorites')) {
            const favsOnly = this._history.filter(e => e.isFavorite());
            this._registry.write(favsOnly);
        } else {
            this._persist();
        }
    }

    getHistory() {
        return [...this._history];
    }

    // copy entry at index back to clipboard
    selectEntry(index) {
        if (index < 0 || index >= this._history.length)
            return null;
        const entry = this._history[index];
        this._ignoreCount++;
        if (entry.isText()) {
            this._clipboard.set_text(CLIPBOARD_TYPE, entry.getStringValue());
            this._clipboard.set_text(St.ClipboardType.PRIMARY, entry.getStringValue());
        } else if (entry.isImage()) {
            const bytes = entry.asBytes();
            if (bytes) {
                this._clipboard.set_content(
                    CLIPBOARD_TYPE,
                    entry.mimetype(),
                    bytes,
                );
            }
        }
        // move to top
        this._history.splice(index, 1);
        this._history.unshift(entry);
        this._notify();
        if (this._settings.get_boolean('clipboard-cache-only-favorites')) {
            const favsOnly = this._history.filter(e => e.isFavorite());
            this._registry.write(favsOnly);
        } else {
            this._persist();
        }
        return entry;
    }

    // set clipboard content without adding to history
    // sets both clipboard and primary selections atomically
    setText(text) {
        this._ignoreCount++;
        this._clipboard.set_text(CLIPBOARD_TYPE, text);
        this._clipboard.set_text(St.ClipboardType.PRIMARY, text);
    }

    toggleFavorite(index) {
        if (index < 0 || index >= this._history.length)
            return;
        const entry = this._history[index];
        entry.setFavorite(!entry.isFavorite());
        this._notify();
        if (this._settings.get_boolean('clipboard-cache-only-favorites')) {
            const favsOnly = this._history.filter(e => e.isFavorite());
            this._registry.write(favsOnly);
        } else {
            this._persist();
        }
    }

    deleteEntry(index) {
        if (index < 0 || index >= this._history.length)
            return;
        this._history.splice(index, 1);
        this._notify();
        if (this._settings.get_boolean('clipboard-cache-only-favorites')) {
            const favsOnly = this._history.filter(e => e.isFavorite());
            this._registry.write(favsOnly);
        } else {
            this._persist();
        }
    }

    clearHistory() {
        // preserve favorites same behavior as clipboard indicator
        this._history = this._history.filter(e => e.isFavorite());
        this._notify();
        if (this._settings.get_boolean('clipboard-cache-only-favorites')) {
            const favsOnly = this._history.filter(e => e.isFavorite());
            this._registry.write(favsOnly);
        } else {
            this._persist();
        }
    }

    setMaxSize(size) {
        this._maxSize = size;
        while (this._history.length > this._maxSize)
            this._history.pop();
        this._notify();
    }

    isPrivateMode() {
        return this._privateMode;
    }

    setPrivateMode(val) {
        this._privateMode = !!val;
        this._notify();
    }

    isExcludedApp(wmClass) {
        if (!wmClass)
            return false;
        return this._excludedApps.includes(wmClass);
    }
}
