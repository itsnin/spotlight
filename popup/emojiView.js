// spotlight - emoji selector view widget
// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import { CATEGORIES } from '../services/emojiData.js';

const COLUMNS = 10;

export const EmojiView = GObject.registerClass(
class EmojiView extends St.BoxLayout {
    _init(emojiData, clipboardManager, onSelect) {
        super._init({
            style_class: 'spotlight-emoji-view',
            vertical: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            visible: false,
        });
        this._emojiData = emojiData;
        this._clipboardManager = clipboardManager;
        this._onSelect = onSelect;
        this._filterText = '';
        this._activeCategory = null;
        this._buttons = [];
        this._categoryButtons = [];

        // category buttons row
        this._categoryRow = new St.ScrollView({
            style_class: 'spotlight-emoji-categories',
            x_align: Clutter.ActorAlign.FILL,
            hscrollbar_policy: St.PolicyType.AUTOMATIC,
            vscrollbar_policy: St.PolicyType.NEVER,
        });
        this._categoryBox = new St.BoxLayout({
            vertical: false,
            spacing: 2,
        });
        this._categoryRow.add_actor(this._categoryBox);
        this.add_child(this._categoryRow);

        // emoji grid scroll view
        this._scroll = new St.ScrollView({
            x_align: Clutter.ActorAlign.FILL,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
        });
        this._gridBox = new St.BoxLayout({
            vertical: true,
            style_class: 'spotlight-emoji-grid',
            spacing: 2,
        });
        this._scroll.add_actor(this._gridBox);
        this.add_child(this._scroll);

        // empty state
        this._emptyLabel = new St.Label({
            style_class: 'spotlight-emoji-empty',
            text: 'No emojis found',
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        this._gridBox.add_child(this._emptyLabel);

        // build category buttons
        for (const cat of CATEGORIES) {
            const btn = new St.Button({
                style_class: 'spotlight-emoji-category-btn',
                can_focus: true,
                toggle_mode: true,
                label: cat.id.split(' ')[0],
                accessible_name: cat.id,
            });
            btn.connect('clicked', () => {
                if (btn.checked) {
                    this._activeCategory = cat.id;
                    this._updateCategoryButtons();
                    this._render();
                } else {
                    this._activeCategory = null;
                    this._updateCategoryButtons();
                    this._render();
                }
            });
            this._categoryBox.add_child(btn);
            this._categoryButtons.push(btn);
        }

        this._render();
    }

    _updateCategoryButtons() {
        for (let i = 0; i < CATEGORIES.length; i++) {
            this._categoryButtons[i].checked =
                (this._activeCategory === CATEGORIES[i].id);
        }
    }

    // filter emojis by search text
    filter(text) {
        this._filterText = text;
        if (text && text.length > 0)
            this._activeCategory = null;
        this._updateCategoryButtons();
        this._render();
    }

    _render() {
        // clear existing buttons
        for (const btn of this._buttons)
            btn.destroy();
        this._buttons = [];

        let emojis;
        if (this._filterText && this._filterText.length > 0) {
            emojis = this._emojiData.search(this._filterText);
        } else if (this._activeCategory) {
            emojis = this._emojiData.getCategory(this._activeCategory);
        } else {
            // show recently used first then some smileys
            const recents = this._emojiData.getRecentlyUsed();
            const recentEmojis = recents.map(e => ({ e }));
            const smileys = this._emojiData.getCategory('Smileys & Emotion').slice(0, 30);
            emojis = [...recentEmojis, ...smileys];
        }

        this._emptyLabel.visible = (emojis.length === 0);

        // build grid rows
        let rowBox;
        for (let i = 0; i < emojis.length; i++) {
            if (i % COLUMNS === 0) {
                rowBox = new St.BoxLayout({
                    vertical: false,
                    spacing: 2,
                });
                this._gridBox.add_child(rowBox);
                this._buttons.push(rowBox);
            }
            const emojiData = emojis[i];
            const btn = new St.Button({
                style_class: 'spotlight-emoji-btn',
                can_focus: true,
                label: emojiData.e,
                accessible_name: emojiData.d || emojiData.e,
            });
            btn.connect('clicked', () => this._onEmojiClicked(emojiData.e));
            rowBox.add_child(btn);
            this._buttons.push(btn);
        }
    }

    _onEmojiClicked(emojiChar) {
        // copy to clipboard without adding to clipboard history
        this._clipboardManager.setText(emojiChar, St.ClipboardType.CLIPBOARD);
        this._clipboardManager.setText(emojiChar, St.ClipboardType.PRIMARY);
        this._emojiData.addRecentlyUsed(emojiChar);
        if (this._onSelect)
            this._onSelect();
    }

    destroy() {
        for (const btn of this._buttons)
            btn.destroy();
        this._buttons = [];
        this._categoryButtons = [];
        super.destroy();
    }
});
