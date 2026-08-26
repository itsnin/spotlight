// spotlight - emoji selector view widget
// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { CATEGORIES, TONES } from '../services/emojiData.js';
import {triggerPaste} from '../services/virtualKeyboard.js';

const COLUMNS = 10;

// tone preview colors for the selector buttons
const TONE_COLORS = [
    '#FFEE00', // none yellow default
    '#FFD8A8', // light
    '#E5B590', // medium light
    '#B88750', // medium
    '#9B6020', // medium dark
    '#4B2000', // dark
];

// shared tooltip label for all emoji buttons added to global stage
let _tooltipLabel = null;

function getTooltipLabel() {
    // check parent actor survives disable enable cycles
    // if tooltip was destroyed or removed from stage recreate it
    if (_tooltipLabel && !_tooltipLabel.get_parent()) {
        _tooltipLabel = null;
    }
    if (!_tooltipLabel) {
        _tooltipLabel = new St.Label({
            style_class: 'emoji-tooltip',
            visible: false,
            opacity: 230,
        });
        global.stage.add_child(_tooltipLabel);
    }
    return _tooltipLabel;
}

export function destroyTooltip() {
    if (_tooltipLabel) {
        _tooltipLabel.destroy();
        _tooltipLabel = null;
    }
}

export const EmojiView = GObject.registerClass(
class EmojiView extends St.BoxLayout {
    _init(emojiData, clipboardManager, settings, onSelect, _ = s => s) {
        super._init({
            style_class: 'spotlight-emoji-view',
            vertical: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            visible: false,
        });
        this._emojiData = emojiData;
        this._clipboardManager = clipboardManager;
        this._settings = settings;
        this._onSelect = onSelect;
        this._ = _;
        this._filterText = '';
        this._activeCategory = null;
        this._buttons = [];
        this._categoryButtons = [];
        this._toneButtons = [];
        this._tooltipTimeoutId = 0;
        this._settingHandlerIds = [];

        // category buttons row
        this._categoryRow = new St.ScrollView({
            style_class: 'spotlight-emoji-categories',
            x_align: Clutter.ActorAlign.FILL,
            hscrollbar_policy: St.PolicyType.AUTOMATIC,
            vscrollbar_policy: St.PolicyType.NEVER,
        });
        this._categoryBox = new St.BoxLayout({
            vertical: false,
        });
        this._categoryBox.style = 'spacing: 2px;';
        this._categoryRow.set_child(this._categoryBox);
        this.add_child(this._categoryRow);

        // skin tone selector row
        this._toneRow = new St.BoxLayout({
            style_class: 'spotlight-emoji-tones',
            vertical: false,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._toneRow.style = 'spacing: 4px; padding-top: 4px; padding-bottom: 4px;';
        this._buildToneButtons();
        this.add_child(this._toneRow);

        // emoji grid scroll view
        this._scroll = new St.ScrollView({
            x_align: Clutter.ActorAlign.FILL,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
        });
        this._gridBox = new St.BoxLayout({
            vertical: true,
            style_class: 'spotlight-emoji-grid',
        });
        this._gridBox.style = 'spacing: 2px;';
        this._scroll.set_child(this._gridBox);
        this.add_child(this._scroll);

        // empty state
        this._emptyLabel = new St.Label({
            style_class: 'spotlight-emoji-empty',
            text: _('No emojis found'),
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

        // re render when tone or gender settings change
        this._settingHandlerIds.push(
            this._settings.connect('changed::emoji-skin-tone', () => {
                this._updateToneButtons();
                this._render();
            }),
        );
        this._settingHandlerIds.push(
            this._settings.connect('changed::emoji-gender', () => {
                this._render();
            }),
        );

        this._render();
    }

    _buildToneButtons() {
        for (let i = 0; i < TONES.length; i++) {
            const btn = new St.Button({
                style_class: 'spotlight-emoji-tone-btn',
                can_focus: true,
                toggle_mode: true,
                accessible_name: _('Skin tone %d').replace('%d', i),
                style: `background-color: ${TONE_COLORS[i]};`,
            });
            const idx = i;
            btn.connect('clicked', () => {
                this._settings.set_int('emoji-skin-tone', idx);
            });
            this._toneRow.add_child(btn);
            this._toneButtons.push(btn);
        }
        this._updateToneButtons();
    }

    _updateToneButtons() {
        const current = this._settings.get_int('emoji-skin-tone');
        for (let i = 0; i < this._toneButtons.length; i++) {
            this._toneButtons[i].checked = (i === current);
        }
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
        // cancel pending tooltip
        if (this._tooltipTimeoutId) {
            GLib.source_remove(this._tooltipTimeoutId);
            this._tooltipTimeoutId = 0;
        }
        const tooltip = getTooltipLabel();
        tooltip.visible = false;

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
            // show recently used first then smileys
            const recents = this._emojiData.getRecentlyUsed();
            const recentEmojis = recents
                .map(e => this._emojiData.getEmoji(e))
                .filter(e => e !== null);
            const smileys = this._emojiData.getCategory('Smileys & Emotion').slice(0, 40);
            emojis = [...recentEmojis, ...smileys];
        }

        this._emptyLabel.visible = (emojis.length === 0);

        // build grid rows
        let rowBox;
        for (let i = 0; i < emojis.length; i++) {
            if (i % COLUMNS === 0) {
                rowBox = new St.BoxLayout({
                    vertical: false,
                });
                rowBox.style = 'spacing: 2px;';
                this._gridBox.add_child(rowBox);
                this._buttons.push(rowBox);
            }
            const emojiItem = emojis[i];
            const btn = this._createEmojiButton(emojiItem);
            rowBox.add_child(btn);
            this._buttons.push(btn);
        }
    }

    _createEmojiButton(emojiItem) {
        // display base character apply modifiers on copy
        const displayChar = emojiItem.e;
        const btn = new St.Button({
            style_class: 'spotlight-emoji-btn',
            can_focus: true,
            label: displayChar,
            accessible_name: emojiItem.d || emojiItem.e,
        });

        // store full emoji item on button for activation
        btn._emojiItem = emojiItem;

        // tooltip on hover
        btn.connect('notify::hover', (actor) => {
            if (this._tooltipTimeoutId) {
                GLib.source_remove(this._tooltipTimeoutId);
                this._tooltipTimeoutId = 0;
            }
            const tooltip = getTooltipLabel();
            if (actor.hover && emojiItem.d) {
                this._tooltipTimeoutId = GLib.timeout_add(
                    GLib.PRIORITY_DEFAULT, 400, () => {
                        const [x, y] = global.get_pointer();
                        const words = emojiItem.d.split(' ');
                        tooltip.text = `${words[0] || ''} ${words[1] || ''}`.trim();
                        tooltip.set_position(x + 16, y - 8);
                        tooltip.visible = true;
                        this._tooltipTimeoutId = 0;
                        return GLib.SOURCE_REMOVE;
                    });
            } else {
                tooltip.visible = false;
            }
        });

        btn.connect('clicked', () => this._activateEmoji(emojiItem));

        // keyboard support enter activates
        btn.connect('key-press-event', (actor, event) => {
            const symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter) {
                this._activateEmoji(emojiItem);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        return btn;
    }

    _activateEmoji(emojiItem) {
        // apply skin tone and gender modifiers based on settings
        const finalEmoji = this._emojiData.applyModifiers(emojiItem);

        // track popularity
        this._emojiData.incrementClick(emojiItem.e);

        // copy to clipboard without adding to clipboard history
        this._clipboardManager.setText(finalEmoji);
        this._emojiData.addRecentlyUsed(emojiItem.e);

        if (this._settings.get_boolean('paste-on-select'))
            triggerPaste();
        if (this._onSelect)
            this._onSelect();
    }

    destroy() {
        if (this._tooltipTimeoutId) {
            GLib.source_remove(this._tooltipTimeoutId);
            this._tooltipTimeoutId = 0;
        }
        // disconnect setting handlers
        for (const id of this._settingHandlerIds)
            this._settings.disconnect(id);
        this._settingHandlerIds = [];

        for (const btn of this._buttons)
            btn.destroy();
        this._buttons = [];
        this._categoryButtons = [];
        this._toneButtons = [];
        super.destroy();
    }
});
