// spotlight - clipboard history manager
// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import GLib from 'gi://GLib';

const CLIPBOARD_TYPE = St.ClipboardType.CLIPBOARD;

export class ClipboardManager {
    constructor(settings) {
        this._settings = settings;
        this._clipboard = St.Clipboard.get_default();
        this._history = [];
        this._maxSize = settings.get_int('clipboard-history-size');
        this._listeners = new Set();
        this._signalId = 0;
        this._ignoreCount = 0;
        this._settingsChangedId = settings.connect('changed::clipboard-history-size', () => {
            this.setMaxSize(settings.get_int('clipboard-history-size'));
        });
    }

    start() {
        if (this._signalId !== 0)
            return;
        // listen for clipboard content changes
        this._signalId = this._clipboard.connect(
            'selection-owner-changed',
            () => this._onClipboardChanged(),
        );
        // read current clipboard content as first entry
        this._onClipboardChanged();
    }

    stop() {
        if (this._signalId !== 0) {
            this._clipboard.disconnect(this._signalId);
            this._signalId = 0;
        }
        this._listeners.clear();
    }

    destroy() {
        this.stop();
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
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

    // called when clipboard content changes
    _onClipboardChanged() {
        if (this._ignoreCount > 0) {
            this._ignoreCount--;
            return;
        }
        this._clipboard.get_text(CLIPBOARD_TYPE, (clipboard, text) => {
            if (!text || text.trim().length === 0)
                return;
            this._addEntry(text);
        });
    }

    // add entry to history deduplicate most recent goes to top
    _addEntry(text) {
        // remove duplicate if exists
        const existingIndex = this._history.findIndex(e => e.text === text);
        if (existingIndex !== -1)
            this._history.splice(existingIndex, 1);
        // add to top
        this._history.unshift({ text, id: Date.now() });
        // trim to max size
        while (this._history.length > this._maxSize)
            this._history.pop();
        this._notify();
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
        this._clipboard.set_text(CLIPBOARD_TYPE, entry.text);
        // move to top
        this._history.splice(index, 1);
        this._history.unshift(entry);
        this._notify();
        return entry;
    }

    // set clipboard content without adding to history used by emoji selector
    // sets both clipboard and primary selections atomically
    setText(text) {
        this._ignoreCount++;
        this._clipboard.set_text(CLIPBOARD_TYPE, text);
        this._clipboard.set_text(St.ClipboardType.PRIMARY, text);
    }

    deleteEntry(index) {
        if (index < 0 || index >= this._history.length)
            return;
        this._history.splice(index, 1);
        this._notify();
    }

    clearHistory() {
        this._history = [];
        this._notify();
    }

    setMaxSize(size) {
        this._maxSize = size;
        while (this._history.length > this._maxSize)
            this._history.pop();
        this._notify();
    }
}
