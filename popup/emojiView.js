// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import { CATEGORIES, TONES } from '../services/emoji/data.js';

export class EmojiView extends St.BoxLayout {
    static {
        GObject.registerClass(this);
    }

    constructor(emojiData, settings, closePopup, triggerPaste, gettext) {
        super({
            vertical: true,
            style: 'spacing: 8px; padding: 12px;',
            visible: true,
        });

        this._data = emojiData;
        this._settings = settings;
        this._closePopup = closePopup;
        this._triggerPaste = triggerPaste;
        this._ = gettext;
        this._activeCategory = 0;
        this._skinTone = emojiData.getSkinTone();

        this._buildUI();
        this._showCategory(0);
    }

    _buildUI() {
        // Search bar
        this._searchEntry = new St.Entry({
            style: 'padding: 6px 12px; border-radius: 8px; margin-bottom: 4px;',
            can_focus: true,
            hint_text: this._('Search emojis...'),
        });
        this._searchEntry.clutter_text.connect('text-changed', () => this._onSearch());
        this.add_child(this._searchEntry);

        // Category tabs
        this._tabsBox = new St.BoxLayout({
            style: 'spacing: 2px; margin-bottom: 4px;',
            x_align: Clutter.ActorAlign.CENTER,
        });
        for (const cat of CATEGORIES) {
            const tab = new St.Button({
                style_class: 'button',
                style: 'padding: 4px 8px; border-radius: 6px; font-size: 16px;',
                label: cat.icon,
                toggle_mode: true,
            });
            tab._categoryId = cat.id;
            tab.connect('clicked', (btn) => {
                this._setActiveCategory(btn._categoryId);
            });
            this._tabsBox.add_child(tab);
        }
        this.add_child(this._tabsBox);

        // Skin tone selector
        const toneBox = new St.BoxLayout({
            style: 'spacing: 4px; margin-bottom: 4px;',
            x_align: Clutter.ActorAlign.CENTER,
        });
        for (let i = 0; i < TONES.length; i++) {
            const toneBtn = new St.Button({
                style_class: 'button',
                style: `padding: 2px 6px; border-radius: 4px; font-size: 14px; background: ${i === this._skinTone ? 'rgba(255,255,255,0.2)' : 'transparent'};`,
                label: TONES[i] || '◯',
                toggle_mode: true,
                checked: i === this._skinTone,
            });
            toneBtn._toneIndex = i;
            toneBtn.connect('clicked', (btn) => {
                this._skinTone = btn._toneIndex;
                this._showCategory(this._activeCategory);
            });
            toneBox.add_child(toneBtn);
        }
        this.add_child(toneBox);

        // Emoji grid
        this._scrollView = new St.ScrollView({
            style: 'max-height: 280px;',
            overlay_scrollbars: true,
        });
        this._grid = new St.BoxLayout({
            vertical: true,
            style: 'spacing: 2px;',
        });
        this._scrollView.add_child(this._grid);
        this.add_child(this._scrollView);

        // Set first tab active
        if (this._tabsBox.get_children()[0]) {
            this._tabsBox.get_children()[0].checked = true;
        }
    }

    _setActiveCategory(categoryId) {
        // Update tab states
        for (const tab of this._tabsBox.get_children()) {
            tab.checked = tab._categoryId === categoryId;
        }
        this._activeCategory = categoryId;
        this._searchEntry.set_text('');
        this._showCategory(categoryId);
    }

    _showCategory(categoryId) {
        this._grid.remove_all_children();
        const emojis = this._data.getByCategory(categoryId);
        this._renderEmojis(emojis);
    }

    _onSearch() {
        const query = this._searchEntry.get_text().trim();
        this._grid.remove_all_children();

        if (query === '') {
            this._showCategory(this._activeCategory);
            return;
        }

        const results = this._data.search(query);
        this._renderEmojis(results);
    }

    _renderEmojis(emojis) {
        if (emojis.length === 0) {
            const emptyLabel = new St.Label({
                style: 'color: #888; padding: 20px; text-align: center;',
                text: this._('No emojis found'),
            });
            this._grid.add_child(emptyLabel);
            return;
        }

        const emojiSize = this._data.getEmojiSize();
        const nbCols = this._data.getNbCols();
        let row = null;
        let colCount = 0;

        for (const emoji of emojis) {
            if (colCount % nbCols === 0) {
                row = new St.BoxLayout({ style: 'spacing: 2px;' });
                this._grid.add_child(row);
            }

            let char = emoji.char;
            // Apply skin tone if applicable
            if (this._skinTone > 0 && emoji.keywords && emoji.keywords.includes('HAS_TONE')) {
                char = char + TONES[this._skinTone];
            }

            const btn = new St.Button({
                style_class: 'button',
                style: `padding: 2px; min-width: ${emojiSize + 8}px; min-height: ${emojiSize + 8}px; border-radius: 4px; font-size: ${emojiSize}px;`,
                label: char,
                can_focus: true,
            });
            btn._emojiChar = char;
            btn.connect('clicked', (b) => this._onEmojiClicked(b._emojiChar));
            row.add_child(btn);
            colCount++;
        }
    }

    _onEmojiClicked(char) {
        // Copy to clipboard
        const clipboard = St.Clipboard.get_default();
        clipboard.set_text(St.ClipboardType.CLIPBOARD, char);

        // Mark as recently used
        this._data.markUsed(char);

        // Paste if enabled
        if (this._data.shouldPasteOnSelect()) {
            this._triggerPaste();
        }

        this._closePopup();
    }

    focusSearch() {
        this._searchEntry.grab_key_focus();
    }

    destroy() {
        super.destroy();
    }
}
