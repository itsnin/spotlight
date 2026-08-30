// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import { EmojiButton } from '../services/emoji/emojiButton.js';
import { EmojiSearchItem } from '../services/emoji/emojiSearchItem.js';
import { SkinTonesBar } from '../services/emoji/emojiOptionsBar.js';

// upstream category names must match the sqlite group names exactly
const CATEGORY_SQL_NAMES = [
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
        this._categoryGrids = [];
        this._tabButtons = [];
        this._contextCategories = [];

        const nbCols = this._settings.get_int('nbcols');

        // context adapter that mimics the upstream extension interface
        // this is what EmojiButton EmojiSearchItem EmojiCategory all expect
        this._context = {
            _settings: this._settings,
            sqlite: this._sqlite,
            closePopup: () => this._closePopup(),
            clipboardOwned: false,
            emojiCategories: this._contextCategories,
            searchItem: null,
            path: this._path,
            _onSearchTextChanged: () => this._onContextSearchChanged(),
            clearCategories: () => this._hideAllCategoryGrids(),
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

        const tabIconNames = [
            'emoji-body-symbolic',       // Smileys
            'emoji-people-symbolic',     // People
            'emoji-nature-symbolic',     // Animals
            'emoji-food-symbolic',       // Food
            'emoji-travel-symbolic',     // Travel
            'emoji-activities-symbolic', // Activities
            'emoji-objects-symbolic',    // Objects
            'emoji-symbols-symbolic',    // Symbols
            'emoji-flags-symbolic',      // Flags
        ];

        for (let id = 0; id < 9; id++) {
            // tab button
            const tabBtn = new St.Button({
                style_class: 'emoji-category-tab',
                child: new St.Icon({
                    icon_name: tabIconNames[id],
                    icon_size: 16,
                }),
                x_expand: true,
                x_align: Clutter.ActorAlign.CENTER,
                can_focus: true,
            });
            tabBtn._categoryId = id;
            tabBtn.connect('clicked', () => this._showCategory(id));
            this._tabsBox.add_child(tabBtn);
            this._tabButtons.push(tabBtn);

            // grid container for this category's emojis
            const grid = new St.BoxLayout({
                vertical: true,
                style: 'spacing: 2px; padding: 4px;',
                visible: false,
            });
            grid._categoryId = id;
            grid._emojiButtons = [];
            grid._built = false;
            this._categoryGrids.push(grid);

            // wrapper for upstream keyboard navigation
            // EmojiSearchItem calls .find() on emojiCategories and expects
            // objects with a .getButton() method returning a focusable actor
            this._contextCategories.push({
                id,
                getButton: () => tabBtn,
                _grid: grid,
            });
        }

        // scroll view holds all category grids (only one visible at a time)
        this._scrollView = new St.ScrollView({
            style: 'max-height: 300px;',
            x_expand: true,
            y_expand: true,
        });
        for (const grid of this._categoryGrids) {
            this._scrollView.add_child(grid);
        }
        this.add_child(this._scrollView);

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
        if (id < 0 || id >= this._categoryGrids.length) return;

        this._activeCategory = id;

        // update tab visual state
        for (let i = 0; i < this._tabButtons.length; i++) {
            if (i === id) {
                this._tabButtons[i].add_style_pseudo_class('checked');
            } else {
                this._tabButtons[i].remove_style_pseudo_class('checked');
            }
        }

        // show only this category's grid
        for (const grid of this._categoryGrids) {
            grid.visible = (grid._categoryId === id);
        }

        // build emoji buttons on demand
        const grid = this._categoryGrids[id];
        if (!grid._built) {
            this._buildCategoryGrid(id);
        }
    }

    _buildCategoryGrid(id) {
        const grid = this._categoryGrids[id];
        const nbCols = this._settings.get_int('nbcols');
        const skinTone = this._settings.get_int('skin-tone');
        const gender = this._settings.get_int('gender');

        // destroy existing buttons first
        grid._emojiButtons.forEach(b => b.destroy());
        grid._emojiButtons = [];
        grid.remove_all_children();

        const emojis = this._sqlite.select_by_group(
            CATEGORY_SQL_NAMES[id],
            skinTone,
            gender,
        );

        let row = null;
        for (let i = 0; i < emojis.length; i++) {
            if (i % nbCols === 0) {
                row = new St.BoxLayout({ style: 'spacing: 2px;' });
                grid.add_child(row);
            }

            const btn = new EmojiButton(
                this._context,
                emojis[i].unicode,
                emojis[i].description,
            );
            btn.build();
            btn.updateStyle();
            grid._emojiButtons.push(btn);
            row.add_child(btn.super_btn);
        }

        grid._built = true;
    }

    _hideAllCategoryGrids() {
        for (const grid of this._categoryGrids) {
            grid.visible = false;
        }
        this._activeCategory = -1;
    }

    _rebuildActiveCategory() {
        if (this._activeCategory >= 0) {
            const grid = this._categoryGrids[this._activeCategory];
            grid._built = false;
            this._buildCategoryGrid(this._activeCategory);
        }
    }

    _rebuildAllCategories() {
        for (const grid of this._categoryGrids) {
            grid._built = false;
            grid._emojiButtons.forEach(b => b.destroy());
            grid._emojiButtons = [];
            grid.remove_all_children();
        }
        if (this._activeCategory >= 0) {
            this._buildCategoryGrid(this._activeCategory);
        }
    }

    _updateAllButtonStyles() {
        for (const grid of this._categoryGrids) {
            for (const btn of grid._emojiButtons) {
                btn.updateStyle();
            }
        }
    }

    // called by upstream widgets via this.emojiCopy._onSearchTextChanged()
    _onContextSearchChanged() {
        const text = this._searchItem.searchEntry.get_text();
        if (text && text.trim().length > 0) {
            // user is searching — EmojiSearchItem shows results inline
            // hide our category grids so they don't duplicate
            this._hideAllCategoryGrids();
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

        // destroy all emoji buttons we created
        for (const grid of this._categoryGrids) {
            grid._emojiButtons.forEach(b => b.destroy());
            grid._emojiButtons = [];
        }

        // destroy the shared tooltip that lives on global.stage
        EmojiButton.destroyTooltip();

        super.destroy();
    }
}
