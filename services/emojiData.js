// spotlight - emoji data service
// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

// emoji category order and display names
export const CATEGORIES = [
    { id: 'Smileys & Emotion', icon: 'face-smile-symbolic' },
    { id: 'People & Body', icon: 'avatar-default-symbolic' },
    { id: 'Animals & Nature', icon: 'weather-clear-symbolic' },
    { id: 'Food & Drink', icon: 'folder-pictures-symbolic' },
    { id: 'Travel & Places', icon: 'go-home-symbolic' },
    { id: 'Activities', icon: 'applications-games-symbolic' },
    { id: 'Objects', icon: 'preferences-other-symbolic' },
    { id: 'Symbols', icon: 'insert-link-symbolic' },
    { id: 'Flags', icon: 'flag-symbolic' },
];

export class EmojiData {
    constructor(extensionPath, settings) {
        this._settings = settings;
        this._emojis = [];
        this._byCategory = new Map();
        this._load(extensionPath);
    }

    _load(extensionPath) {
        const path = GLib.build_filenamev([extensionPath, 'data', 'emojis.json']);
        const file = Gio.File.new_for_path(path);
        try {
            const [success, content] = file.load_contents(null);
            if (success) {
                const decoder = new TextDecoder('utf-8');
                this._emojis = JSON.parse(decoder.decode(content));
                // index by category
                for (const emoji of this._emojis) {
                    if (!this._byCategory.has(emoji.g))
                        this._byCategory.set(emoji.g, []);
                    this._byCategory.get(emoji.g).push(emoji);
                }
            }
        } catch (e) {
            // data file missing or corrupt fail silently
        }
    }

    // search emojis by description prefix first then contains
    search(query) {
        if (!query || query.trim().length === 0)
            return [];
        const q = query.toLowerCase().trim();
        const words = q.split(/\s+/);

        // prefix match first
        const prefix = this._emojis.filter(e => {
            const desc = e.d.toLowerCase();
            return words.every(w =>
                desc.startsWith(w) || desc.includes(' ' + w)
            );
        });

        if (prefix.length >= 20)
            return prefix.slice(0, 40);

        // fallback to contains match
        const contains = this._emojis.filter(e => {
            const desc = e.d.toLowerCase();
            return words.every(w => desc.includes(w));
        });

        // combine dedupe
        const seen = new Set(prefix.map(e => e.e));
        return [...prefix, ...contains.filter(e => !seen.has(e.e))].slice(0, 40);
    }

    // get emojis in a specific category
    getCategory(categoryId) {
        return this._byCategory.get(categoryId) || [];
    }

    // get recently used emojis from settings
    getRecentlyUsed() {
        try {
            return this._settings.get_strv('recently-used-emojis') || [];
        } catch {
            return [];
        }
    }

    // add emoji to recently used moves to top
    addRecentlyUsed(emojiChar) {
        try {
            const recents = this._settings.get_strv('recently-used-emojis') || [];
            const filtered = recents.filter(e => e !== emojiChar);
            filtered.unshift(emojiChar);
            // keep only last 20
            const trimmed = filtered.slice(0, 20);
            this._settings.set_strv('recently-used-emojis', trimmed);
        } catch {
            // settings key may not exist yet
        }
    }

    getCategories() {
        return CATEGORIES;
    }

    getCount() {
        return this._emojis.length;
    }
}
