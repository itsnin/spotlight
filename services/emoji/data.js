// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { PrefixedSettings } from '../prefixedSettings.js';

export const CATEGORIES = [
    { id: 0, name: 'Smileys & Emotion', icon: '😀' },
    { id: 1, name: 'People & Body', icon: '👋' },
    { id: 2, name: 'Animals & Nature', icon: '🐾' },
    { id: 3, name: 'Food & Drink', icon: '🍔' },
    { id: 4, name: 'Travel & Places', icon: '✈️' },
    { id: 5, name: 'Activities', icon: '⚽' },
    { id: 6, name: 'Objects', icon: '💡' },
    { id: 7, name: 'Symbols', icon: '❤️' },
    { id: 8, name: 'Flags', icon: '🏁' },
];

export const TONES = ['', '🏻', '🏼', '🏽', '🏾', '🏿'];
export const GENDERS = ['', '♀️', '♂️'];

export class EmojiData {
    constructor(extensionPath, settings) {
        this._settings = new PrefixedSettings(settings, 'emoji-');
        this._path = extensionPath;
        this._emojis = [];
        this._recentlyUsed = [];
        this._loadEmojis();
        this._loadRecentlyUsed();
    }

    _loadEmojis() {
        try {
            const jsonPath = GLib.build_filenamev([this._path, 'data', 'emojis.json']);
            const file = Gio.file_new_for_path(jsonPath);
            const [success, contents] = file.load_contents(null);
            if (success) {
                const text = new TextDecoder('utf-8').decode(contents);
                const raw = JSON.parse(text);
                const rawList = Array.isArray(raw) ? raw : (raw.emojis || []);

                // Map category names to IDs
                const categoryMap = {};
                for (const cat of CATEGORIES) {
                    categoryMap[cat.name] = cat.id;
                }

                // Convert from raw format {e, d, g, s} to our format {char, category, keywords}
                this._emojis = rawList.map(item => {
                    const keywords = item.d ? item.d.split(/\s+/) : [];
                    // Check for tone/gender markers in keywords
                    if (item.s && item.s.length > 0) {
                        keywords.push('HAS_TONE');
                    }
                    return {
                        char: item.e,
                        category: categoryMap[item.g] ?? 0,
                        keywords,
                    };
                });
            }
        } catch (e) {
            log(`[emoji] Failed to load emojis.json: ${e.message}`);
            this._emojis = this._getFallbackEmojis();
        }
    }

    _getFallbackEmojis() {
        return [
            { char: '😂', category: 0, keywords: ['face', 'joy', 'laugh', 'tears'] },
            { char: '❤️', category: 7, keywords: ['heart', 'love', 'red'] },
            { char: '😍', category: 0, keywords: ['face', 'love', 'heart', 'eyes'] },
            { char: '😭', category: 0, keywords: ['face', 'cry', 'sad', 'tears'] },
            { char: '😊', category: 0, keywords: ['face', 'smile', 'happy', 'blush'] },
            { char: '👍', category: 1, keywords: ['hand', 'thumbs', 'up', 'like', 'HAS_TONE'] },
            { char: '🎉', category: 5, keywords: ['party', 'celebration', 'tada'] },
            { char: '🔥', category: 7, keywords: ['fire', 'hot', 'flame'] },
            { char: '✨', category: 7, keywords: ['sparkles', 'star', 'magic'] },
            { char: '💯', category: 7, keywords: ['hundred', 'percent', 'score'] },
        ];
    }

    _loadRecentlyUsed() {
        this._recentlyUsed = this._settings.get_strv('recently-used') || [];
    }

    _saveRecentlyUsed() {
        // Keep only the last 20
        while (this._recentlyUsed.length > 20) {
            this._recentlyUsed.shift();
        }
        this._settings.set_strv('recently-used', this._recentlyUsed);
    }

    getByCategory(categoryId) {
        return this._emojis.filter(e => e.category === categoryId);
    }

    search(query) {
        if (!query || query.trim() === '') return [];
        const q = query.toLowerCase();
        return this._emojis.filter(e => {
            if (e.char.includes(q)) return true;
            if (e.keywords && e.keywords.some(k => k.toLowerCase().includes(q))) return true;
            return false;
        }).slice(0, 50);
    }

    getRecentlyUsed() {
        return this._recentlyUsed;
    }

    markUsed(emojiChar) {
        // Remove if already present
        const idx = this._recentlyUsed.indexOf(emojiChar);
        if (idx >= 0) this._recentlyUsed.splice(idx, 1);
        // Add to end
        this._recentlyUsed.push(emojiChar);
        this._saveRecentlyUsed();
    }

    getSettings() {
        return this._settings;
    }

    getEmojiSize() {
        return this._settings.get_int('emojisize');
    }

    getNbCols() {
        return this._settings.get_int('nbcols');
    }

    getSkinTone() {
        return this._settings.get_int('skin-tone');
    }

    getGender() {
        return this._settings.get_int('gender');
    }

    shouldPasteOnSelect() {
        return this._settings.get_boolean('paste-on-select');
    }

    flush() {
        this._saveRecentlyUsed();
    }
}
