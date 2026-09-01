// spotlight - emoji category (adapted from upstream emoji-copy v38)
// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import { SkinTonesBar } from './emojiOptionsBar.js';
import { EmojiButton } from './emojiButton.js';

// Map of emoji's group — must match sqlite group names exactly
const EMOJIS_CATEGORIES = {
    0: 'Smileys & Emotion',
    1: 'People & Body',
    2: 'Animals & Nature',
    3: 'Food & Drink',
    4: 'Travel & Places',
    5: 'Activities',
    6: 'Objects',
    7: 'Symbols',
    8: 'Flags',
};

export class EmojiCategory {
    /**
     * Adapted from upstream emoji-copy v38.
     * Original used PopupMenu items; Spotlight uses plain St widgets.
     * Logic preserved: lazy loading, skin tone handling, filter changes, destroy.
     */
    constructor(emojiCopy, categoryName, iconName, id) {
        // container replaces original PopupSubMenuMenuItem
        // holds the emoji grid rows; shown when category is active
        this.super_item = new St.BoxLayout({
            vertical: true,
            style_class: 'spotlight-emoji-category',
            visible: false,
        });
        // emoji grid is a separate child so clear() can remove only emojis
        // while preserving the skin tones bar added by addBar()
        this._gridContainer = new St.BoxLayout({
            vertical: true,
        });
        this.super_item.add_child(this._gridContainer);

        this.categoryName = categoryName;
        this.emojiCopy = emojiCopy;
        this._settings = this.emojiCopy._settings;
        this.emojiButtons = [];
        this._nbColumns = this._settings.get_int('nbcols');
        this.id = id;
        this.emojis = this.emojiCopy.sqlite.select_by_group(
            EMOJIS_CATEGORIES[this.id],
        );

        // options bar for skin tones — same logic as original
        if (this.id === 1 || this.id === 5) {
            this.skinTonesBar = new SkinTonesBar(this.emojiCopy, true);
        } else {
            this.skinTonesBar = new SkinTonesBar(this.emojiCopy, false);
        }

        // Smileys & Body, Peoples, Activities get skin tone bar
        if (this.id === 0 || this.id === 1 || this.id === 5) {
            this.skinTonesBar.addBar(this.super_item);
        }

        // listen for skin tone/gender changes — owned by this so destroy() can disconnect
        this._settings.connectObject(
            'changed::skin-tone', () => this._onFilterChanged(),
            'changed::gender', () => this._onFilterChanged(),
            this,
        );

        // category tab button
        this.categoryButton = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            toggle_mode: true,
            accessible_name: categoryName,
            style_class: 'spotlight-emoji-category-btn',
            child: new St.Icon({
                icon_name: iconName,
                icon_size: 16,
            }),
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.categoryButton.connect('clicked', () => this._toggle());

        this._built = false;
        this._loaded = false;
        this.load();
    }

    _onFilterChanged() {
        if (this.super_item.visible) {
            this.clear();
            const selectedTone = this._settings.get_int('skin-tone');
            const selectedGender = this._settings.get_int('gender');
            this.emojis = this.emojiCopy.sqlite.select_by_group(
                EMOJIS_CATEGORIES[this.id],
                selectedTone,
                selectedGender,
            );
            for (let i = 0; i < this.emojis.length; i++) {
                const button = new EmojiButton(
                    this.emojiCopy,
                    this.emojis[i].unicode,
                    this.emojis[i].description,
                );
                this.emojiButtons.push(button);
            }
            this._built = false;
            this.build();
            this.updateStyle();
            this.emojiCopy._onSearchTextChanged();
        }
    }

    setNbCols(nbColumns) {
        this._nbColumns = nbColumns;
    }

    load() {
        if (this._loaded) return;
        for (let i = 0; i < this.emojis.length; i++) {
            const button = new EmojiButton(
                this.emojiCopy,
                this.emojis[i].unicode,
                this.emojis[i].description,
            );
            this.emojiButtons.push(button);
        }
        this._loaded = true;
    }

    clear() {
        this.emojiButtons.forEach((b) => b.destroy());
        // only clear the emoji grid container, skin tones bar stays on super_item
        this._gridContainer.remove_all_children();
        this.emojiButtons = [];
        this.emojis = [];
    }

    build() {
        if (this._built) return;
        let ln, container;
        for (let i = 0; i < this.emojiButtons.length; i++) {
            if (i % this._nbColumns === 0) {
                ln = new St.BoxLayout({
                    style_class: 'spotlight-emoji-grid',
                    vertical: false,
                });
                this._gridContainer.add_child(ln);
                container = ln;
            }
            this.emojiButtons[i].build(this);
            container.add_child(this.emojiButtons[i].super_btn);
        }
        this._built = true;
    }

    _toggle() {
        if (this.super_item.visible) {
            this.emojiCopy.clearCategories();
        } else {
            this._openCategory();
        }
    }

    _openCategory() {
        this.emojiCopy.clearCategories();
        if (!this._built) {
            this.build();
            this.updateStyle();
        }
        this.skinTonesBar.update();
        this.categoryButton.set_checked(true);
        this.super_item.visible = true;
        this.emojiCopy._onSearchTextChanged();
    }

    updateStyle() {
        const emojiSize = this._settings.get_int('emojisize');
        const style = `font-size: ${emojiSize}px;`;
        this.emojiButtons.forEach((b) => b.updateStyle(style));
    }

    destroy() {
        this._settings.disconnectObject(this);
        this.emojiButtons.forEach((b) => b.destroy());
        this.emojiButtons = [];
        if (this.categoryButton) {
            this.categoryButton.destroy();
            this.categoryButton = null;
        }
        if (this.super_item) {
            this.super_item.destroy();
            this.super_item = null;
        }
    }

    getButton() {
        return this.categoryButton;
    }
}
