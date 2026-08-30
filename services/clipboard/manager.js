// spotlight - clipboard history manager
// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import {ClipboardEntry} from './registry.js';
import {Registry} from './registry.js';
import {Keyboard} from './keyboard.js';
import {DialogManager} from './confirmDialog.js';
import {PrefixedSettings} from '../prefixedSettings.js';
import {PrefsFields} from './constants.js';

const CLIPBOARD_TYPE = St.ClipboardType.CLIPBOARD;

export class ClipboardManager {
    constructor(settings, uuid) {
        this._settings = new PrefixedSettings(settings, 'clipboard-');
        this._uuid = uuid;
        this._clipboard = St.Clipboard.get_default();
        this._history = [];
        this._favorites = [];
        this._maxSize = this._settings.get_int(PrefsFields.HISTORY_SIZE);
        this._privateMode = false;
        this._selection = null;
        this._changedId = null;
        this._running = false;
        this._keyboard = new Keyboard();
        this._dialogManager = new DialogManager();
        this._listeners = new Set();
        this._signalId = 0;
        this._ignoreCount = 0;
        this._loading = false;
        this._registry = new Registry({ settings: this._settings, uuid });

        this._settingsChangedId = this._settings.connect(
            `changed::${PrefsFields.HISTORY_SIZE}`,
            () => this.setMaxSize(this._settings.get_int(PrefsFields.HISTORY_SIZE)),
        );
        this._excludedApps = this._settings.get_strv(PrefsFields.EXCLUDED_APPS);
        this._excludedAppsChangedId = this._settings.connect(
            `changed::${PrefsFields.EXCLUDED_APPS}`,
            () => this._excludedApps = this._settings.get_strv(PrefsFields.EXCLUDED_APPS),
        );

        // load persisted history from disk
        this._loadFromDisk();
    }

    async _loadFromDisk() {
        this._loading = true;
        try {
            const entries = await this._registry.read();
            this._favorites = entries.filter(e => e.isFavorite());
            const nonFavorites = entries.filter(e => !e.isFavorite());
            this._history = nonFavorites.slice(0, this._maxSize);
            this._notify();
        } catch {
            // fail silently start with empty history
        } finally {
            this._loading = false;
        }
    }

    start() {
        if (this._running) return;
        this._running = true;
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
        if (!this._running) return;
        this._running = false;
        if (this._signalId !== 0) {
            this._metaSelection.disconnect(this._signalId);
            this._signalId = 0;
            this._metaSelection = null;
        }
        this._listeners.clear();
    }

    getSettings() {
        return this._settings;
    }

    getFavorites() {
        return [...this._favorites];
    }

    getDialogManager() {
        return this._dialogManager;
    }

    getAllEntries() {
        return [...this._favorites, ...this._history];
    }

    destroy() {
        this.stop();
        // persist current history to disk flush debounced writes immediately
        if (this._settings.get_boolean(PrefsFields.CACHE_ONLY_FAVORITE)) {
            const favsOnly = [...this._favorites];
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
        this._keyboard.destroy();
        this._dialogManager.destroy();
        this._keyboard = null;
        this._dialogManager = null;
        this._history = [];
        this._favorites = [];
        this._selection = null;
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
        if (this._settings.get_boolean(PrefsFields.CACHE_ONLY_FAVORITE)) {
            const favsOnly = [...this._favorites];
            this._registry.write(favsOnly);
        } else {
            this._registry.write(this.getAllEntries());
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
            // focussedWindow can genuinely be null when no window has focus
            // optional chaining allowed here per ego guidelines for potentially null objects
            const wmClass = focussedWindow?.get_wm_class();
            if (wmClass && this.isExcludedApp(wmClass))
                return;
        } catch (e) {
            log('Spotlight clipboard: excluded app check failed: ' + e);
        }
        try {
            const text = await new Promise(resolve => {
                this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clip, t) => resolve(t));
            });
            if (!text || text.trim().length === 0)
                return;
            const entry = new ClipboardEntry('text/plain;charset=utf-8', new TextEncoder().encode(text), false);
            // strip whitespace if enabled
            if (entry.isText() && this._settings.get_boolean(PrefsFields.STRIP_TEXT)) {
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
        } catch (e) {
            log('Spotlight clipboard: failed to read clipboard: ' + e);
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
        if (this._settings.get_boolean(PrefsFields.CACHE_ONLY_FAVORITE)) {
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
    selectEntry(entry) {
        if (!entry)
            return null;
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
        // move to top if in history
        const historyIdx = this._history.indexOf(entry);
        if (historyIdx >= 0 && this._settings.get_boolean(PrefsFields.MOVE_ITEM_FIRST)) {
            this._history.splice(historyIdx, 1);
            this._history.unshift(entry);
        }
        this._notify();
        if (this._settings.get_boolean(PrefsFields.CACHE_ONLY_FAVORITE)) {
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

    toggleFavorite(entry) {
        if (!entry) return;
        entry.toggleFavorite();
        if (entry.isFavorite()) {
            // Move from history to favorites
            const idx = this._history.indexOf(entry);
            if (idx >= 0) this._history.splice(idx, 1);
            if (!this._favorites.includes(entry)) this._favorites.unshift(entry);
        } else {
            // Move from favorites to history
            const idx = this._favorites.indexOf(entry);
            if (idx >= 0) this._favorites.splice(idx, 1);
            if (!this._history.includes(entry)) this._history.unshift(entry);
        }
        this._notify();
        this._persist();
    }

    deleteEntry(index) {
        if (index < 0 || index >= this._history.length)
            return;
        this._history.splice(index, 1);
        this._notify();
        if (this._settings.get_boolean(PrefsFields.CACHE_ONLY_FAVORITE)) {
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
        if (this._settings.get_boolean(PrefsFields.CACHE_ONLY_FAVORITE)) {
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
