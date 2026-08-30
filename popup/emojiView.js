// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import GLib from 'gi://GLib';
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
        this._focusedIndex = -1;

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
        this._searchEntry.clutter_text.connect('text-changed', () => {
            this._focusedIndex = -1;
            this._onSearch();
        });
        this._searchEntry.clutter_text.connect('key-press-event', (actor, event) => {
            return this._handleKeyPress(event);
        });
        this.add_child(this._searchEntry);

        // Category tabs
        this._tabsBox = new St.BoxLayout({
            style: 'spacing: 2px; margin-bottom: 4px;',
            x_align: Clutter.ActorAlign.CENTER,
        });
        for (const cat of CATEGORIES) {
            const tab = new St.Button({
                style_class: 'button',
                style: 'padding: 4px 10px; border-radius: 6px; font-size: 11px;',
                label: cat.icon + ' ' + cat.name,
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
        this._emojiButtons = [];
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
            this._emojiButtons.push(btn);
            row.add_child(btn);
            colCount++;
        }
    }

    _onEmojiClicked(char) {
        // Copy to clipboard (both CLIPBOARD and PRIMARY for Shift+Insert compatibility)
        const clipboard = St.Clipboard.get_default();
        clipboard.set_text(St.ClipboardType.CLIPBOARD, char);
        clipboard.set_text(St.ClipboardType.PRIMARY, char);

        // Mark as recently used
        this._data.markUsed(char);

        // Close popup first so paste doesn't target our search entry
        this._closePopup();

        // Paste if enabled (after small delay to ensure focus shifts)
        if (this._data.shouldPasteOnSelect()) {
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
                this._triggerPaste();
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    focusSearch() {
        this._searchEntry.grab_key_focus();
    }

    _handleKeyPress(event) {
        const key = event.get_key_symbol();
        const buttons = this._emojiButtons || [];
        const nbCols = this._data.getNbCols();

        if (buttons.length === 0)
            return Clutter.EVENT_PROPAGATE;

        if (key === Clutter.KEY_Right || key === Clutter.KEY_KP_Right) {
            this._focusedIndex = this._focusedIndex < 0 ? 0 : Math.min(this._focusedIndex + 1, buttons.length - 1);
            this._updateEmojiFocus(buttons);
            return Clutter.EVENT_STOP;
        } else if (key === Clutter.KEY_Left || key === Clutter.KEY_KP_Left) {
            this._focusedIndex = this._focusedIndex <= 0 ? 0 : this._focusedIndex - 1;
            this._updateEmojiFocus(buttons);
            return Clutter.EVENT_STOP;
        } else if (key === Clutter.KEY_Down || key === Clutter.KEY_KP_Down) {
            if (this._focusedIndex < 0) {
                this._focusedIndex = 0;
            } else {
                this._focusedIndex = Math.min(this._focusedIndex + nbCols, buttons.length - 1);
            }
            this._updateEmojiFocus(buttons);
            return Clutter.EVENT_STOP;
        } else if (key === Clutter.KEY_Up || key === Clutter.KEY_KP_Up) {
            if (this._focusedIndex > 0) {
                this._focusedIndex = Math.max(this._focusedIndex - nbCols, 0);
                this._updateEmojiFocus(buttons);
            }
            return Clutter.EVENT_STOP;
        } else if (key === Clutter.KEY_Return || key === Clutter.KEY_KP_Enter) {
            if (this._focusedIndex >= 0 && this._focusedIndex < buttons.length) {
                this._onEmojiClicked(buttons[this._focusedIndex]._emojiChar);
            }
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _updateEmojiFocus(buttons) {
        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            if (i === this._focusedIndex) {
                btn.style = btn.style.replace(/background: [^;]+;/, 'background: rgba(255, 255, 255, 0.2);');
                btn.grab_key_focus();
                // ensure visible in scroll view
                const adjustment = this._scrollView.vscroll.adjustment;
                const btnY = btn.get_allocation_box().y1;
                const viewHeight = this._scrollView.height;
                if (btnY < adjustment.value) {
                    adjustment.value = btnY;
                } else if (btnY > adjustment.value + viewHeight - 30) {
                    adjustment.value = btnY - viewHeight + 30;
                }
            } else {
                btn.style = btn.style.replace(/background: [^;]+;/, 'background: transparent;');
            }
        }
    }

    destroy() {
        super.destroy();
    }
}
