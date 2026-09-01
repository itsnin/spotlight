// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import { PrefsFields } from '../services/clipboard/constants.js';

export class ClipboardView extends St.BoxLayout {
    static {
        GObject.registerClass(this);
    }

    constructor(manager, settings, closePopup, triggerPaste, gettext) {
        super({
            vertical: true,
            style: 'spacing: 6px; padding: 12px;',
            visible: true,
        });

        this._manager = manager;
        this._settings = settings;
        this._closePopup = closePopup;
        this._triggerPaste = triggerPaste;
        this._ = gettext;
        this._entries = [];
        this._focusedIndex = -1;

        this._buildUI();
        this._refresh();

        // subscribe to manager changes for live updates
        this._unsubscribe = this._manager.subscribe(() => this._refresh());
    }

    refresh() {
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
        this._searchEntry.clutter_text.connect('text-changed', () => {
            this._focusedIndex = -1;
            this._refresh();
        });
        this._searchEntry.clutter_text.connect('key-press-event', (actor, event) => {
            return this._handleKeyPress(event);
        });
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
        const rawSearchText = this._searchEntry.get_text();
        const useRegex = this._settings.get_boolean(PrefsFields.REGEX_SEARCH);
        const caseSensitive = this._settings.get_boolean(PrefsFields.CASE_SENSITIVE_SEARCH);
        const pinnedOnBottom = this._settings.get_boolean(PrefsFields.PINNED_ON_BOTTOM);

        // Clear lists
        this._favoritesList.remove_all_children();
        this._historyList.remove_all_children();
        this._entries = [];

        const favorites = this._manager.getFavorites();
        const history = this._manager.getHistory();

        // Build filter function based on settings
        let filter;
        if (!rawSearchText) {
            filter = () => true;
        } else if (useRegex) {
            try {
                const flags = caseSensitive ? '' : 'i';
                const regex = new RegExp(rawSearchText, flags);
                filter = (entry) => {
                    if (entry.isImage()) return false;
                    return regex.test(entry.getStringValue());
                };
            } catch (e) {
                // invalid regex — fall back to plain text search
                const searchText = caseSensitive ? rawSearchText : rawSearchText.toLowerCase();
                filter = (entry) => {
                    if (entry.isImage()) return false;
                    const val = caseSensitive ? entry.getStringValue() : entry.getStringValue().toLowerCase();
                    return val.includes(searchText);
                };
            }
        } else {
            const searchText = caseSensitive ? rawSearchText : rawSearchText.toLowerCase();
            filter = (entry) => {
                if (entry.isImage()) return false;
                const val = caseSensitive ? entry.getStringValue() : entry.getStringValue().toLowerCase();
                return val.includes(searchText);
            };
        }

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
        // attach arbitrary JS data as post-construction properties
        // (GObject constructors only accept registered GObject properties)
        item._entry = entry;
        item._isFavorite = isFavorite;

        // Preview content: image thumbnail or text
        if (entry.isImage()) {
            // image entry — show thumbnail asynchronously
            const imgBin = new St.Bin({
                style: 'min-width: 48px; min-height: 32px;',
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            item.add_child(imgBin);
            this._manager.getRegistry().getEntryAsImage(entry).then(img => {
                if (img && !item.is_destroyed()) {
                    img.style = 'max-width: 200px; max-height: 48px;';
                    imgBin.set_child(img);
                }
            }).catch(err => {
                console.warn('clipboardView: failed to load image thumbnail', err);
            });
        } else {
            // text entry
            const previewSize = this._settings.get_int(PrefsFields.PREVIEW_SIZE);
            let text = entry.getStringValue();
            if (text.length > previewSize) text = text.substring(0, previewSize) + '...';
            text = text.replace(/\n/g, ' ');
            const label = new St.Label({
                text,
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            item.add_child(label);
        }

        // Buttons
        const btnBox = new St.BoxLayout({ style: 'spacing: 4px;' });

        // Image preview button (images only)
        if (entry.isImage() && this._settings.get_boolean(PrefsFields.SHOW_PREVIEW_BUTTON)) {
            const previewBtn = new St.Button({
                style_class: 'button',
                style: 'padding: 2px 6px; border-radius: 4px; font-size: 12px;',
                label: '🖼',
            });
            previewBtn.connect('clicked', (btn) => {
                btn.stop_signal_emission('button-press-event');
                this._showImagePreview(entry);
            });
            btnBox.add_child(previewBtn);
        }

        // Edit button (text only)
        if (entry.isText() && this._settings.get_boolean(PrefsFields.SHOW_EDIT_BUTTON)) {
            const editBtn = new St.Button({
                style_class: 'button',
                style: 'padding: 2px 6px; border-radius: 4px; font-size: 12px;',
                label: '✎',
            });
            editBtn.connect('clicked', (btn) => {
                btn.stop_signal_emission('button-press-event');
                this._showEditDialog(entry);
            });
            btnBox.add_child(editBtn);
        }

        // Paste button
        if (this._settings.get_boolean(PrefsFields.PASTE_BUTTON)) {
            const pasteBtn = new St.Button({
                style_class: 'button',
                style: 'padding: 2px 6px; border-radius: 4px; font-size: 12px;',
                label: '📋',
            });
            pasteBtn.connect('clicked', (btn) => {
                btn.stop_signal_emission('button-press-event');
                this._selectAndPaste(entry);
            });
            btnBox.add_child(pasteBtn);
        }

        // Pin button
        if (this._settings.get_boolean(PrefsFields.SHOW_PIN_BUTTON)) {
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
        if (this._settings.get_boolean(PrefsFields.SHOW_DELETE_BUTTON)) {
            const delBtn = new St.Button({
                style_class: 'button',
                style: 'padding: 2px 6px; border-radius: 4px; font-size: 12px;',
                label: '✕',
            });
            delBtn.connect('clicked', (btn) => {
                btn.stop_signal_emission('button-press-event');
                if (entry.isFavorite() && this._settings.get_boolean(PrefsFields.CONFIRM_ON_PINNED_DELETE)) {
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

        // Click to select and paste
        item.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 1) {
                this._selectAndPaste(entry);
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

    _selectAndPaste(entry) {
        this._manager.selectEntry(entry);
        this._closePopup();
        // paste after small delay to ensure focus shifts away from popup
        if (this._triggerPaste && this._settings.get_boolean(PrefsFields.PASTE_ON_SELECT)) {
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
                this._triggerPaste();
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _handleKeyPress(event) {
        const key = event.get_key_symbol();
        const allItems = this._getAllFocusableItems();

        if (key === Clutter.KEY_Down || key === Clutter.KEY_KP_Down) {
            this._focusedIndex = Math.min(this._focusedIndex + 1, allItems.length - 1);
            this._updateFocusVisual(allItems);
            return Clutter.EVENT_STOP;
        } else if (key === Clutter.KEY_Up || key === Clutter.KEY_KP_Up) {
            this._focusedIndex = Math.max(this._focusedIndex - 1, 0);
            this._updateFocusVisual(allItems);
            return Clutter.EVENT_STOP;
        } else if (key === Clutter.KEY_Return || key === Clutter.KEY_KP_Enter) {
            if (this._focusedIndex >= 0 && this._focusedIndex < allItems.length) {
                const entry = allItems[this._focusedIndex]._entry;
                if (entry) this._selectAndPaste(entry);
            }
            return Clutter.EVENT_STOP;
        } else if (key === Clutter.KEY_Delete || key === Clutter.KEY_KP_Delete) {
            if (this._focusedIndex >= 0 && this._focusedIndex < allItems.length) {
                const entry = allItems[this._focusedIndex]._entry;
                if (entry) {
                    this._manager.deleteEntry(entry);
                    this._focusedIndex = Math.min(this._focusedIndex, this._getAllFocusableItems().length - 1);
                    this._refresh();
                }
            }
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _getAllFocusableItems() {
        const items = [];
        const collect = (box) => {
            if (!box) return;
            for (let i = 0; i < box.get_n_children(); i++) {
                const child = box.get_child_at_index(i);
                if (child && child._entry) items.push(child);
            }
        };
        collect(this._favoritesList);
        collect(this._historyList);
        return items;
    }

    _updateFocusVisual(allItems) {
        for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i];
            if (i === this._focusedIndex) {
                item.style = item.style.replace(/background: [^;]+;/, 'background: rgba(255, 255, 255, 0.15);');
                item.grab_key_focus();
            } else if (item._isFavorite) {
                item.style = item.style.replace(/background: [^;]+;/, 'background: rgba(255, 215, 0, 0.1);');
            } else {
                item.style = item.style.replace(/background: [^;]+;/, 'background: transparent;');
            }
        }
    }

    _showImagePreview(entry) {
        // simple full-size image preview overlay
        this._manager.getRegistry().getEntryAsImage(entry).then(img => {
            if (!img || this.is_destroyed()) return;

            const overlay = new St.Widget({
                style: 'background: rgba(0, 0, 0, 0.85);',
                reactive: true,
            });
            const bin = new Clutter.BinLayout();
            overlay.layout_manager = bin;

            img.style = 'padding: 20px;';
            overlay.add_child(img);

            const parent = this.get_parent();
            if (!parent) return;
            const parentWidth = parent.width;
            const parentHeight = parent.height;
            overlay.set_size(parentWidth, parentHeight);
            overlay.set_position(0, 0);

            overlay.connect('button-press-event', () => {
                overlay.destroy();
                return Clutter.EVENT_STOP;
            });

            parent.add_child(overlay);
            overlay.raise_top();
        }).catch(err => {
            console.warn('clipboardView: failed to show image preview', err);
        });
    }

    _showEditDialog(entry) {
        // simple inline edit: replace item content with a text entry
        const items = this._getAllFocusableItems();
        let item = null;
        for (const it of items) {
            if (it._entry === entry) {
                item = it;
                break;
            }
        }
        if (!item) return;

        // save original children to restore later
        const originalChildren = [];
        for (let i = 0; i < item.get_n_children(); i++) {
            originalChildren.push(item.get_child_at_index(i));
        }
        item.remove_all_children();

        const entryWidget = new St.Entry({
            text: entry.getStringValue(),
            x_expand: true,
            can_focus: true,
        });
        entryWidget.clutter_text.set_selection(0, -1);
        item.add_child(entryWidget);
        entryWidget.grab_key_focus();

        const commitEdit = (save) => {
            if (save) {
                const newText = entryWidget.get_text();
                if (newText && newText !== entry.getStringValue()) {
                    this._manager.editEntry(entry, newText);
                }
            }
            // restore original layout
            item.remove_all_children();
            for (const child of originalChildren) {
                item.add_child(child);
            }
            this._refresh();
        };

        entryWidget.clutter_text.connect('key-press-event', (actor, event) => {
            const key = event.get_key_symbol();
            if (key === Clutter.KEY_Return || key === Clutter.KEY_KP_Enter) {
                commitEdit(true);
                return Clutter.EVENT_STOP;
            } else if (key === Clutter.KEY_Escape) {
                commitEdit(false);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        entryWidget.connect('button-press-event', () => Clutter.EVENT_STOP);
    }

    destroy() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
        super.destroy();
    }
}
