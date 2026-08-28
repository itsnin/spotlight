// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import { PrefsFields } from '../services/clipboard/constants.js';

export class ClipboardView extends St.BoxLayout {
    static {
        GObject.registerClass(this);
    }

    constructor(manager, settings, closePopup, gettext) {
        super({
            vertical: true,
            style: 'spacing: 6px; padding: 12px;',
            visible: true,
        });

        this._manager = manager;
        this._settings = settings;
        this._closePopup = closePopup;
        this._ = gettext;
        this._entries = [];

        this._buildUI();
        this._refresh();
    }

    _buildUI() {
        // Header with search and private mode toggle
        const headerBox = new St.BoxLayout({
            style: 'spacing: 8px; margin-bottom: 4px;',
        });

        this._searchEntry = new St.Entry({
            style: 'padding: 6px 12px; border-radius: 8px;',
            can_focus: true,
            hint_text: this._('Search clipboard history...'),
            x_expand: true,
        });
        this._searchEntry.clutter_text.connect('text-changed', () => this._refresh());
        headerBox.add_child(this._searchEntry);

        this._privateBtn = new St.Button({
            style_class: 'button',
            style: 'padding: 6px 12px; border-radius: 8px;',
            label: this._('Private'),
            toggle_mode: true,
        });
        this._privateBtn.connect('clicked', () => {
            this._manager.setPrivateMode(this._privateBtn.checked);
        });
        headerBox.add_child(this._privateBtn);

        this.add_child(headerBox);

        // Favorites section
        this._favoritesBox = new St.BoxLayout({ vertical: true, style: 'spacing: 4px;' });
        this._favoritesLabel = new St.Label({
            style: 'font-weight: bold; font-size: 11px; color: #888; margin-left: 4px;',
            text: this._('FAVORITES'),
        });
        this._favoritesBox.add_child(this._favoritesLabel);
        this._favoritesList = new St.BoxLayout({ vertical: true, style: 'spacing: 2px;' });
        this._favoritesBox.add_child(this._favoritesList);
        this.add_child(this._favoritesBox);

        // History section
        this._historyBox = new St.BoxLayout({ vertical: true, style: 'spacing: 4px;' });
        this._historyLabel = new St.Label({
            style: 'font-weight: bold; font-size: 11px; color: #888; margin-left: 4px; margin-top: 8px;',
            text: this._('HISTORY'),
        });
        this._historyBox.add_child(this._historyLabel);

        this._scrollView = new St.ScrollView({
            style: 'max-height: 300px;',
            overlay_scrollbars: true,
        });
        this._historyList = new St.BoxLayout({ vertical: true, style: 'spacing: 2px;' });
        this._scrollView.add_child(this._historyList);
        this._historyBox.add_child(this._scrollView);
        this.add_child(this._historyBox);

        // Footer with clear button
        const footerBox = new St.BoxLayout({
            style: 'spacing: 8px; margin-top: 8px;',
        });
        footerBox.x_align = Clutter.ActorAlign.END;

        this._clearBtn = new St.Button({
            style_class: 'button',
            style: 'padding: 6px 12px; border-radius: 8px;',
            label: this._('Clear History'),
        });
        this._clearBtn.connect('clicked', () => {
            this._manager.clearHistory();
            this._refresh();
        });
        footerBox.add_child(this._clearBtn);
        this.add_child(footerBox);
    }

    _refresh() {
        const searchText = this._searchEntry.get_text().toLowerCase();
        const pinnedOnBottom = this._manager.getSettings().get_boolean(PrefsFields.PINNED_ON_BOTTOM);

        // Clear lists
        this._favoritesList.remove_all_children();
        this._historyList.remove_all_children();
        this._entries = [];

        const favorites = this._manager.getFavorites();
        const history = this._manager.getHistory();

        const filter = (entry) => {
            if (!searchText) return true;
            return entry.getStringValue().toLowerCase().includes(searchText);
        };

        // Favorites
        const filteredFavs = favorites.filter(filter);
        this._favoritesLabel.visible = filteredFavs.length > 0;
        for (const entry of filteredFavs) {
            const item = this._createItem(entry, true);
            if (pinnedOnBottom) {
                this._historyList.add_child(item);
            } else {
                this._favoritesList.add_child(item);
            }
        }

        // History
        const filteredHistory = history.filter(filter);
        for (const entry of filteredHistory) {
            const item = this._createItem(entry, false);
            this._historyList.add_child(item);
        }

        // Show empty message
        if (filteredFavs.length === 0 && filteredHistory.length === 0) {
            const emptyLabel = new St.Label({
                style: 'color: #888; padding: 20px; text-align: center;',
                text: this._('No clipboard entries'),
            });
            this._historyList.add_child(emptyLabel);
        }
    }

    _createItem(entry, isFavorite) {
        const item = new St.BoxLayout({
            style: `padding: 6px 8px; border-radius: 6px; background: ${isFavorite ? 'rgba(255, 215, 0, 0.1)' : 'transparent'};`,
            style_class: 'button',
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        // Preview text
        const previewSize = this._manager.getSettings().get_int(PrefsFields.PREVIEW_SIZE);
        let text = entry.getStringValue();
        if (text.length > previewSize) text = text.substring(0, previewSize) + '...';
        text = text.replace(/\n/g, ' ');

        const label = new St.Label({
            text,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        item.add_child(label);

        // Buttons
        const btnBox = new St.BoxLayout({ style: 'spacing: 4px;' });

        // Pin button
        if (this._manager.getSettings().get_boolean(PrefsFields.SHOW_PIN_BUTTON)) {
            const pinBtn = new St.Button({
                style_class: 'button',
                style: 'padding: 2px 6px; border-radius: 4px; font-size: 12px;',
                label: isFavorite ? '★' : '☆',
            });
            pinBtn.connect('clicked', (btn) => {
                btn.stop_signal_emission('button-press-event');
                this._manager.toggleFavorite(entry);
                this._refresh();
            });
            btnBox.add_child(pinBtn);
        }

        // Delete button
        if (this._manager.getSettings().get_boolean(PrefsFields.SHOW_DELETE_BUTTON)) {
            const delBtn = new St.Button({
                style_class: 'button',
                style: 'padding: 2px 6px; border-radius: 4px; font-size: 12px;',
                label: '✕',
            });
            delBtn.connect('clicked', (btn) => {
                btn.stop_signal_emission('button-press-event');
                if (entry.isFavorite() && this._manager.getSettings().get_boolean(PrefsFields.CONFIRM_ON_PINNED_DELETE)) {
                    this._manager.getDialogManager().open(
                        this._('Delete pinned entry?'),
                        this._('Are you sure you want to delete this pinned entry?'),
                        '',
                        this._('Delete'),
                        this._('Cancel'),
                        () => {
                            this._manager.deleteEntry(entry);
                            this._refresh();
                        }
                    );
                } else {
                    this._manager.deleteEntry(entry);
                    this._refresh();
                }
            });
            btnBox.add_child(delBtn);
        }

        item.add_child(btnBox);

        // Click to select
        item.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 1) {
                this._manager.selectEntry(entry);
                this._closePopup();
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Hover effect
        item.connect('notify::hover', (actor) => {
            if (actor.hover) {
                actor.style = `padding: 6px 8px; border-radius: 6px; background: ${isFavorite ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)'};`;
            } else {
                actor.style = `padding: 6px 8px; border-radius: 6px; background: ${isFavorite ? 'rgba(255, 215, 0, 0.1)' : 'transparent'};`;
            }
        });

        return item;
    }

    focusSearch() {
        this._searchEntry.grab_key_focus();
    }

    destroy() {
        super.destroy();
    }
}
