// spotlight - emoji data service
// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

// skin tone modifier characters index matches settings value 0 none 1 5
export const TONES = ['', '🏻', '🏼', '🏽', '🏾', '🏿'];

// gender suffix characters zero width joiner plus symbol plus variation selector
export const GENDERS = ['', '\u200D\u2640\uFE0F', '\u200D\u2642\uFE0F'];

// person base characters for gendered emojis
// gendered emojis replace neutral person with gendered version plus tone
export const GENDERS2 = ['🧑', '👩', '👨'];

// tone characters used to detect if emoji already has a tone
const TONE_CHARS = new Set(['🏻', '🏼', '🏽', '🏾', '🏿']);

// people and body emojis that do not accept skin tone modifiers
// unicode emoji modifier base property excludes these body parts
// false negatives harmless user just wont get tone option false positives broken
const NOT_TONABLE_KEYWORDS = [
    'eye', 'eyes', 'ear', 'brain', 'heart', 'lungs', 'tooth',
    'bone', 'tongue', 'mouth', 'nose', 'lips', 'kiss', 'foot',
    'feet', 'leg', 'hearing aid', 'mustache', 'glasses',
];

// emojis already gender specific should not get additional gender suffix
const ALREADY_GENDERED_KEYWORDS = [
    'woman', 'man', 'girl', 'boy', 'lady', 'gentleman',
    'princess', 'prince', 'queen', 'king', 'bride', 'groom',
    'santa', 'mrs. claus',
];

// keywords that indicate an emoji can take gender suffix
const GENRABLE_KEYWORDS = [
    'person', 'worker', 'farmer', 'cook', 'student', 'teacher',
    'doctor', 'judge', 'pilot', 'mechanic', 'scientist', 'artist',
    'firefighter', 'astronaut', 'mage', 'vampire', 'zombie',
    'genie', 'merperson', 'elf', 'fairy', 'angel', 'superhero',
    'supervillain', 'singer', 'dancer', 'swimmer', 'surfer',
    'weight lifter', 'biking', 'mountain biking', 'climbing',
    'golfing', 'water polo', 'handball', 'juggling', 'cartwheeling',
    'fencing', 'rowboat', 'kayaking', 'scuba diving', 'skiing',
    'snowboarding', 'lifting weights', 'bouncing ball', 'running',
    'walking', 'standing', 'kneeling', 'sitting', 'lying',
    'baby', 'child', 'older person', 'adult', 'bearded person',
    'person in suit', 'person with veil', 'person with skullcap',
    'person in lotus position', 'person meditating',
    'person in bed', 'person taking bath', 'selfie', 'pregnant',
    'breast feeding', 'deaf person', 'person gesturing no',
    'person gesturing ok', 'person tipping hand', 'person raising hand',
    'person frowning', 'person pouting', 'person gesturing',
    'man dancing', 'woman dancing',
];

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
        this._byChar = new Map();
        this._clickCounts = new Map();
        this._load(extensionPath);
        this._loadClickCounts();
    }

    _load(extensionPath) {
        const path = GLib.build_filenamev([extensionPath, 'data', 'emojis.json']);
        const file = Gio.File.new_for_path(path);
        try {
            const [success, content] = file.load_contents(null);
            if (success) {
                const decoder = new TextDecoder('utf-8');
                this._emojis = JSON.parse(decoder.decode(content));
                // tag each emoji and index by category
                for (const emoji of this._emojis) {
                    this._tagEmoji(emoji);
                    if (!this._byCategory.has(emoji.g))
                        this._byCategory.set(emoji.g, []);
                    this._byCategory.get(emoji.g).push(emoji);
                    this._byChar.set(emoji.e, emoji);
                }
            }
        } catch (e) {
            // bundled data file should never fail with proper installation
            // if it does log error so it shows in journal for debugging
            logError(e, 'spotlight: failed to load bundled emoji data');
        }
    }

    // determine tonable genrable gendered tags for an emoji
    _tagEmoji(emoji) {
        const char = emoji.e;
        const desc = emoji.d.toLowerCase();

        // tonable people and body emojis without existing tone
        const hasTone = [...char].some(c => TONE_CHARS.has(c));
        const isNonTonableBodyPart = NOT_TONABLE_KEYWORDS.some(kw =>
            desc.includes(kw)
        );
        emoji.tonable = (emoji.g === 'People & Body') &&
                        !hasTone &&
                        !isNonTonableBodyPart;

        // gendered contains neutral person character that can be replaced
        emoji.gendered = char.includes('🧑');

        // genrable description suggests gender variant exists
        // exclude already gendered emojis and gendered base characters
        if (!emoji.gendered && emoji.g === 'People & Body') {
            const alreadyGendered = ALREADY_GENDERED_KEYWORDS.some(kw =>
                desc.includes(kw)
            );
            emoji.genrable = !alreadyGendered && GENRABLE_KEYWORDS.some(kw =>
                desc.includes(kw.toLowerCase())
            );
        } else {
            emoji.genrable = false;
        }
    }

    _loadClickCounts() {
        try {
            const raw = this._settings.get_string('emoji-click-counts');
            if (raw && raw.trim()) {
                const obj = JSON.parse(raw);
                for (const [key, val] of Object.entries(obj))
                    this._clickCounts.set(key, val);
            }
        } catch {
            // corrupt or missing start fresh
        }
    }

    _saveClickCounts() {
        try {
            const obj = {};
            for (const [key, val] of this._clickCounts)
                obj[key] = val;
            this._settings.set_string('emoji-click-counts', JSON.stringify(obj));
        } catch {
            // fail silently
        }
    }

    incrementClick(emojiChar) {
        const current = this._clickCounts.get(emojiChar) || 0;
        this._clickCounts.set(emojiChar, current + 1);
        // save on every click gsettings writes are cheap for small strings
        this._saveClickCounts();
    }

    getClickCount(emojiChar) {
        return this._clickCounts.get(emojiChar) || 0;
    }

    // apply skin tone and gender modifiers to an emoji based on settings
    applyModifiers(emoji) {
        if (!emoji.tonable && !emoji.genrable && !emoji.gendered)
            return emoji.e;

        const toneIndex = this._settings.get_int('emoji-skin-tone');
        const genderIndex = this._settings.get_int('emoji-gender');
        let result = emoji.e;

        if (emoji.tonable) {
            if (emoji.gendered) {
                // replace neutral person with gendered version plus tone
                result = emoji.e.replace(
                    GENDERS2[0],
                    GENDERS2[genderIndex] + TONES[toneIndex],
                );
            } else {
                // append tone modifier
                result += TONES[toneIndex];
            }
        }

        if (emoji.genrable && genderIndex > 0) {
            // append gender suffix character
            result += GENDERS[genderIndex];
        }

        return result;
    }

    // search emojis by description prefix first then contains
    // results ranked by click count popularity
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

        let results;
        if (prefix.length >= 20) {
            results = prefix;
        } else {
            // fallback to contains match
            const contains = this._emojis.filter(e => {
                const desc = e.d.toLowerCase();
                return words.every(w => desc.includes(w));
            });
            const seen = new Set(prefix.map(e => e.e));
            results = [...prefix, ...contains.filter(e => !seen.has(e.e))];
        }

        // rank by click count higher clicked first
        results.sort((a, b) =>
            (this._clickCounts.get(b.e) || 0) - (this._clickCounts.get(a.e) || 0)
        );

        return results.slice(0, 40);
    }

    // get emojis in a specific category tonable emojis first
    getCategory(categoryId) {
        const emojis = this._byCategory.get(categoryId) || [];
        // rank by click count within category
        return [...emojis].sort((a, b) =>
            (this._clickCounts.get(b.e) || 0) - (this._clickCounts.get(a.e) || 0)
        );
    }

    // get full emoji data object by character
    getEmoji(char) {
        return this._byChar.get(char) || null;
    }

    // get recently used emojis from settings
    getRecentlyUsed() {
        return this._settings.get_strv('recently-used-emojis');
    }

    // add emoji to recently used moves to top
    addRecentlyUsed(emojiChar) {
        const recents = this._settings.get_strv('recently-used-emojis');
        const filtered = recents.filter(e => e !== emojiChar);
        filtered.unshift(emojiChar);
        // keep only last 20
        const trimmed = filtered.slice(0, 20);
        this._settings.set_strv('recently-used-emojis', trimmed);
    }

    getCategories() {
        return CATEGORIES;
    }

    getCount() {
        return this._emojis.length;
    }

    // save click counts on shutdown
    flush() {
        this._saveClickCounts();
    }
}
