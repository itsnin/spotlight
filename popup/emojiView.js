// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import { EmojiButton } from '../services/emoji/emojiButton.js';
import { EmojiSearchItem } from '../services/emoji/emojiSearchItem.js';
import { EmojiCategory } from '../services/emoji/emojiCategory.js';
import { SkinTonesBar } from '../services/emoji/emojiOptionsBar.js';

// category labels and icons — same order as upstream emoji-copy v38
const CAT_LABELS = [
    'Smileys & Emotion',
    'People & Body',
    'Animals & Nature',
    'Food & Drink',
    'Travel & Places',
    'Activities',
    'Objects',
    'Symbols',
    'Flags',
];

const CAT_ICONS = [
    'emoji-body-symbolic',
    'emoji-people-symbolic',
    'emoji-nature-symbolic',
    'emoji-food-symbolic',
    'emoji-travel-symbolic',
    'emoji-activities-symbolic',
    'emoji-objects-symbolic',
    'emoji-symbols-symbolic',
    'emoji-flags-symbolic',
];

export class EmojiView extends St.BoxLayout {
    static {
        GObject.registerClass(this);
    }

    constructor(sqlite, settings, closePopup, extensionPath, gettext) {
        super({
            vertical: true,
            style: 'spacing: 8px;',
            visible: true,
        });

        this._ = gettext;
        this._closePopup = closePopup;
        this._settings = settings;
        this._sqlite = sqlite;
        this._path = extensionPath;
        this._activeCategory = -1;
        this._emojiCategories = [];

        const nbCols = this._settings.get_int('nbcols');

        // context adapter mimics upstream extension interface
        // this is what EmojiButton, EmojiSearchItem, EmojiCategory all expect
        this._context = {
            _settings: this._settings,
            sqlite: this._sqlite,
            closePopup: () => this._closePopup(),
            clipboardOwned: false,
            emojiCategories: this._emojiCategories,
            searchItem: null,
            path: this._path,
            _onSearchTextChanged: () => this._onContextSearchChanged(),
            clearCategories: () => this._hideAllCategories(),
        };

        // --- search item (search entry + recents) ---
        this._searchItem = new EmojiSearchItem(this._context, nbCols);
        this._context.searchItem = this._searchItem;
        this.add_child(this._searchItem.super_item);

        // --- skin tone bar ---
        this._skinTonesBar = new SkinTonesBar(this._context, false);
        this._skinTonesBar.addBar(this);

        // --- category tabs ---
        this._tabsBox = new St.BoxLayout({
            style: 'spacing: 4px; padding: 0 4px;',
            x_expand: true,
        });
        this.add_child(this._tabsBox);

        // --- scroll view holds category containers ---
        this._scrollView = new St.ScrollView({
            style: 'max-height: 300px;',
            x_expand: true,
            y_expand: true,
        });
        this.add_child(this._scrollView);

        // --- create all 9 EmojiCategory instances (upstream pattern) ---
        for (let i = 0; i < 9; i++) {
            const category = new EmojiCategory(
                this._context,
                CAT_LABELS[i],
                CAT_ICONS[i],
                i,
            );
            category.setNbCols(nbCols);
            this._emojiCategories.push(category);
            this._tabsBox.add_child(category.getButton());
            this._scrollView.add_child(category.super_item);
        }

        // settings changes that require ui refresh
        this._settings.connectObject(
            'changed::skin-tone', () => this._rebuildActiveCategory(),
            'changed::gender', () => this._rebuildActiveCategory(),
            'changed::nbcols', () => this._rebuildAllCategories(),
            'changed::emojisize', () => this._updateAllButtonStyles(),
            this,
        );

        // show first category by default
        this._showCategory(0);
    }

    _showCategory(id) {
        if (id < 0 || id >= this._emojiCategories.length) return;
        this._activeCategory = id;

        // update tab visual state and show only this category
        for (let i = 0; i < this._emojiCategories.length; i++) {
            const cat = this._emojiCategories[i];
            if (i === id) {
                cat.categoryButton.set_checked(true);
                if (!cat._built) {
                    cat.build();
                    cat.updateStyle();
                }
                cat.skinTonesBar.update();
                cat.super_item.visible = true;
            } else {
                cat.categoryButton.set_checked(false);
                cat.super_item.visible = false;
            }
        }
    }

    _hideAllCategories() {
        for (const cat of this._emojiCategories) {
            cat.categoryButton.set_checked(false);
            cat.super_item.visible = false;
        }
        this._activeCategory = -1;
    }

    _rebuildActiveCategory() {
        if (this._activeCategory >= 0) {
            const cat = this._emojiCategories[this._activeCategory];
            cat.clear();
            cat._built = false;
            cat._loaded = false;
            cat.load();
            cat.build();
            cat.updateStyle();
        }
    }

    _rebuildAllCategories() {
        const nbCols = this._settings.get_int('nbcols');
        for (const cat of this._emojiCategories) {
            cat.setNbCols(nbCols);
            cat.clear();
            cat._built = false;
            cat._loaded = false;
            cat.load();
        }
        if (this._activeCategory >= 0) {
            const cat = this._emojiCategories[this._activeCategory];
            cat.build();
            cat.updateStyle();
        }
    }

    _updateAllButtonStyles() {
        for (const cat of this._emojiCategories) {
            if (cat._built) {
                cat.updateStyle();
            }
        }
    }

    // called by upstream widgets via this.emojiCopy._onSearchTextChanged()
    _onContextSearchChanged() {
        const text = this._searchItem.searchEntry.get_text();
        if (text && text.trim().length > 0) {
            // user is searching — EmojiSearchItem shows results inline
            this._hideAllCategories();
        } else if (this._activeCategory < 0) {
            // search cleared — restore the last active category
            this._showCategory(0);
        }
    }

    focusSearch() {
        if (this._searchItem && this._searchItem.searchEntry) {
            this._searchItem.searchEntry.grab_key_focus();
        }
    }

    destroy() {
        this._settings.disconnectObject(this);

        // destroy search item and its contents
        if (this._searchItem) {
            this._searchItem.destroy();
            this._searchItem = null;
        }

        // destroy all categories (each destroys its own emoji buttons)
        for (const cat of this._emojiCategories) {
            cat.destroy();
        }
        this._emojiCategories = [];

        // destroy the shared tooltip that lives on global.stage
        EmojiButton.destroyTooltip();

        super.destroy();
    }
}
