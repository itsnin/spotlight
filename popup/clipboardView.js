// spotlight - clipboard history view widget
// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Cogl from 'gi://Cogl';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {triggerPaste} from '../services/virtualKeyboard.js';

export const ClipboardView = GObject.registerClass(
class ClipboardView extends St.BoxLayout {
    _init(clipboardManager, settings, onSelect, _ = s => s) {
        super._init({
            vertical: true,
            visible: false,
        });
        this._clipboardManager = clipboardManager;
        this._settings = settings;
        this._onSelect = onSelect;
        this._ = _;
        this._filterText = '';
        this._items = [];

        // toolbar with action buttons and private mode
        this._toolbar = new St.BoxLayout({
            vertical: false,
            style_class: 'spotlight-clipboard-toolbar',
        });
        this._toolbar.style = 'spacing: 8px; padding-bottom: 8px;';
        this.add_child(this._toolbar);

        // clear history button
        this._clearBtn = new St.Button({
            style_class: 'spotlight-action-btn spotlight-toolbar-btn',
            can_focus: true,
            child: new St.BoxLayout({
                vertical: false,
                style: 'spacing: 6px;',
            }),
        });
        this._clearBtn.child.add_child(new St.Icon({
            icon_name: 'user-trash-symbolic',
            icon_size: 14,
        }));
        this._clearBtn.child.add_child(new St.Label({
            text: _('Clear'),
            y_align: Clutter.ActorAlign.CENTER,
        }));
        this._clearBtn.connect('clicked', () => this._clearHistory());
        this._toolbar.add_child(this._clearBtn);

        // spacer
        const spacer = new St.Widget({x_expand: true});
        this._toolbar.add_child(spacer);

        // favorites count label
        this._favLabel = new St.Label({
            style_class: 'spotlight-clipboard-favcount',
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._toolbar.add_child(this._favLabel);

        // private mode toggle
        this._privateBtn = new St.Button({
            style_class: 'spotlight-action-btn spotlight-toolbar-btn',
            can_focus: true,
            toggle_mode: true,
            child: new St.BoxLayout({
                vertical: false,
                style: 'spacing: 6px;',
            }),
        });
        this._privateBtn.child.add_child(new St.Icon({
            icon_name: 'security-medium-symbolic',
            icon_size: 14,
        }));
        this._privateBtn.child.add_child(new St.Label({
            text: _('Private'),
            y_align: Clutter.ActorAlign.CENTER,
        }));
        this._privateBtn.connect('clicked', () => {
            this._clipboardManager.setPrivateMode(this._privateBtn.checked);
            this._updatePrivateModeStyle();
            this._render();
        });
        this._toolbar.add_child(this._privateBtn);

        // favorites section label + scroll
        this._favSectionLabel = new St.Label({
            style_class: 'spotlight-clipboard-section-label',
            text: _('Pinned'),
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._favSectionLabel.style = 'padding: 4px 8px; font-size: 11px; font-weight: 600; color: rgba(245,245,247,0.4); text-transform: uppercase; letter-spacing: 0.5px;';
        this._favSectionLabel.visible = false;
        this.add_child(this._favSectionLabel);

        this._favScrollView = new St.ScrollView({
            style_class: 'spotlight-clipboard-fav-section',
            overlay_scrollbars: true,
        });
        this._favBox = new St.BoxLayout({
            vertical: true,
            style_class: 'spotlight-clipboard-list',
        });
        this._favScrollView.set_child(this._favBox);
        this._favScrollView.style = 'max-height: 120px;';
        this.add_child(this._favScrollView);

        // separator between favs and history
        this._separator = new St.Widget({
            style_class: 'spotlight-clipboard-separator',
        });
        this._separator.style = 'height: 1px; background: rgba(255,255,255,0.08); margin: 4px 0;';
        this._separator.visible = false;
        this.add_child(this._separator);

        // history section label + scroll
        this._histSectionLabel = new St.Label({
            style_class: 'spotlight-clipboard-section-label',
            text: _('History'),
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._histSectionLabel.style = 'padding: 4px 8px; font-size: 11px; font-weight: 600; color: rgba(245,245,247,0.4); text-transform: uppercase; letter-spacing: 0.5px;';
        this._histSectionLabel.visible = false;
        this.add_child(this._histSectionLabel);

        // scrollable history list
        this._scrollView = new St.ScrollView({
            style_class: 'spotlight-clipboard-view',
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            x_expand: true,
            y_expand: true,
            overlay_scrollbars: true,
        });
        this.add_child(this._scrollView);

        this._box = new St.BoxLayout({
            vertical: true,
            style_class: 'spotlight-clipboard-list',
        });
        this._scrollView.set_child(this._box);

        // empty state shown when no clipboard history
        this._emptyLabel = new St.Label({
            style_class: 'spotlight-clipboard-empty',
            text: _('No clipboard history'),
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        this._box.add_child(this._emptyLabel);

        // private mode empty state
        this._privateEmptyLabel = new St.Label({
            style_class: 'spotlight-clipboard-empty',
            text: _('Private mode — clipboard not tracked'),
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        this._privateEmptyLabel.visible = false;
        this._box.add_child(this._privateEmptyLabel);

        // subscribe to clipboard changes
        this._unsubscribe = clipboardManager.subscribe(() => this._render());
        this._render();
    }

    // filter visible items by search text
    filter(text) {
        this._filterText = text;
        this._render();
    }

    _updatePrivateModeStyle() {
        if (this._privateBtn.checked) {
            this._privateBtn.add_style_class_name('spotlight-private-active');
        } else {
            this._privateBtn.remove_style_class_name('spotlight-private-active');
        }
    }

    _clearHistory() {
        if (this._settings.get_boolean('clipboard-confirm-clear')) {
            this._showConfirmDialog(
                _('Clear all history?'),
                _('Are you sure you want to clear all clipboard history? Pinned items will be kept.'),
                _('Clear'),
                () => this._clipboardManager.clearHistory(),
            );
        } else {
            this._clipboardManager.clearHistory();
        }
    }

    _showConfirmDialog(title, message, confirmLabel, onConfirm) {
        const dialog = new ModalDialog.ModalDialog({ destroyOnClose: true });

        dialog.contentLayout.add_child(new St.Label({
            text: title,
            style: 'font-size: 18px; font-weight: 600; padding-bottom: 8px;',
            x_align: Clutter.ActorAlign.CENTER,
        }));
        dialog.contentLayout.add_child(new St.Label({
            text: message,
            style: 'font-size: 14px; color: rgba(245,245,247,0.7);',
            x_align: Clutter.ActorAlign.CENTER,
        }));

        dialog.addButton({
            label: _('Cancel'),
            action: () => dialog.close(),
            key: Clutter.KEY_Escape,
        });
        dialog.addButton({
            label: confirmLabel,
            action: () => {
                onConfirm();
                dialog.close();
            },
            default: true,
        });

        dialog.open();
    }

    _showTagDialog(entry, originalIndex) {
        const dialog = new ModalDialog.ModalDialog({ destroyOnClose: true });

        const textEntry = new St.Entry({
            text: entry.getTag() || '',
            hint_text: _('Enter tag…'),
            can_focus: true,
            x_expand: true,
            style: 'min-width: 300px;',
        });

        dialog.contentLayout.add_child(new St.Label({
            text: _('Tag entry'),
            style: 'font-size: 18px; font-weight: 600; padding-bottom: 16px;',
            x_align: Clutter.ActorAlign.CENTER,
        }));
        dialog.contentLayout.add_child(textEntry);

        dialog.addButton({
            label: _('Cancel'),
            action: () => dialog.close(),
            key: Clutter.KEY_Escape,
        });
        dialog.addButton({
            label: _('Save'),
            action: () => {
                entry.setTag(textEntry.get_text());
                this._clipboardManager._persist();
                this._render();
                dialog.close();
            },
            default: true,
        });

        dialog.open();
        textEntry.grab_key_focus();
    }

    _showEditDialog(entry, originalIndex) {
        const dialog = new ModalDialog.ModalDialog({ destroyOnClose: true });

        const scrollView = new St.ScrollView({
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            x_expand: true,
            style: 'min-width: 400px; min-height: 100px; max-height: 400px;',
        });

        const clutterText = new Clutter.Text({
            text: entry.getStringValue(),
            editable: true,
            reactive: true,
            single_line_mode: false,
            activatable: false,
            line_wrap: true,
        });

        const white = new Cogl.Color();
        white.init_from_4f(1.0, 1.0, 1.0, 1.0);
        const selBlue = new Cogl.Color();
        selBlue.init_from_4f(0.39, 0.59, 1.0, 0.71);
        clutterText.color = white;
        clutterText.selection_color = selBlue;
        clutterText.selected_text_color = white;

        const textBox = new St.BoxLayout({
            style_class: 'ci-edit-textbox',
            x_expand: true,
            y_expand: true,
            vertical: true,
        });
        textBox.add_child(clutterText);
        scrollView.add_child(textBox);

        dialog.contentLayout.add_child(new St.Label({
            text: _('Edit entry'),
            style: 'font-size: 18px; font-weight: 600; padding-bottom: 16px;',
            x_align: Clutter.ActorAlign.CENTER,
        }));
        dialog.contentLayout.add_child(scrollView);

        dialog.addButton({
            label: _('Cancel'),
            action: () => dialog.close(),
            key: Clutter.KEY_Escape,
        });
        dialog.addButton({
            label: _('Save'),
            action: () => {
                entry.setText(clutterText.get_text());
                this._clipboardManager._persist();
                this._render();
                dialog.close();
            },
            default: true,
        });

        dialog.open();
        clutterText.grab_key_focus();
    }

    _showConfirmPinnedDelete(entry, originalIndex) {
        this._showConfirmDialog(
            _('Delete pinned item?'),
            _('Are you sure you want to delete this pinned item?'),
            _('Delete'),
            () => this._clipboardManager.deleteEntry(originalIndex),
        );
    }

    _matchesFilter(entry) {
        if (!this._filterText)
            return true;
        if (!entry.isText())
            return false;

        let text = entry.getStringValue();
        let tag = entry.getTag() || '';
        let query = this._filterText;

        if (!this._settings.get_boolean('clipboard-case-sensitive')) {
            text = text.toLowerCase();
            tag = tag.toLowerCase();
            query = query.toLowerCase();
        }

        if (this._settings.get_boolean('clipboard-regex-search')) {
            try {
                const flags = this._settings.get_boolean('clipboard-case-sensitive') ? '' : 'i';
                const re = new RegExp(query, flags);
                return re.test(text) || re.test(tag);
            } catch {
                // invalid regex fall back to plain text
                return text.includes(query) || tag.includes(query);
            }
        }

        return text.includes(query) || tag.includes(query);
    }

    _render() {
        // clear existing items
        for (const item of this._items)
            item.destroy();
        this._items = [];

        const history = this._clipboardManager.getHistory();
        const isPrivate = this._clipboardManager.isPrivateMode();

        // update private mode button state
        if (this._privateBtn.checked !== isPrivate) {
            this._privateBtn.checked = isPrivate;
            this._updatePrivateModeStyle();
        }

        // show/hide empty states
        this._emptyLabel.visible = !isPrivate && history.length === 0;
        this._privateEmptyLabel.visible = isPrivate;

        if (isPrivate) {
            this._favSectionLabel.visible = false;
            this._favScrollView.visible = false;
            this._separator.visible = false;
            this._histSectionLabel.visible = false;
            this._favLabel.text = '';
            return;
        }

        // split into favorites and history
        const favorites = history.filter(e => e.isFavorite() && this._matchesFilter(e));
        const regular = history.filter(e => !e.isFavorite() && this._matchesFilter(e));

        const pinnedOnBottom = this._settings.get_boolean('clipboard-pinned-on-bottom');
        const showPin = this._settings.get_boolean('clipboard-show-pin-button');
        const showDelete = this._settings.get_boolean('clipboard-show-delete-button');
        const showPaste = this._settings.get_boolean('clipboard-show-paste-button');
        const showEdit = this._settings.get_boolean('clipboard-show-edit-button');
        const showTag = this._settings.get_boolean('clipboard-show-tag-button');

        // update favorites count
        const totalFavs = history.filter(e => e.isFavorite()).length;
        if (totalFavs > 0)
            this._favLabel.text = this._('%d pinned').replace('%d', totalFavs);
        else
            this._favLabel.text = '';

        // clear existing
        this._favBox.remove_all_children();
        this._box.remove_all_children();
        this._box.add_child(this._emptyLabel);
        this._box.add_child(this._privateEmptyLabel);

        const hasFavs = favorites.length > 0;
        const hasRegular = regular.length > 0;

        if (pinnedOnBottom) {
            // history first, then pinned
            this._histSectionLabel.visible = hasRegular;
            this._renderItems(regular, history, this._box, showPin, showDelete, showPaste, showEdit, showTag);

            this._separator.visible = hasFavs && hasRegular;

            this._favSectionLabel.visible = hasFavs;
            this._favScrollView.visible = hasFavs;
            this._renderItems(favorites, history, this._favBox, showPin, showDelete, showPaste, showEdit, showTag);
        } else {
            // pinned first, then history
            this._favSectionLabel.visible = hasFavs;
            this._favScrollView.visible = hasFavs;
            this._renderItems(favorites, history, this._favBox, showPin, showDelete, showPaste, showEdit, showTag);

            this._separator.visible = hasFavs && hasRegular;

            this._histSectionLabel.visible = hasRegular;
            this._renderItems(regular, history, this._box, showPin, showDelete, showPaste, showEdit, showTag);
        }
    }

    _renderItems(entries, fullHistory, container, showPin, showDelete, showPaste, showEdit, showTag) {
        for (const entry of entries) {
            const originalIndex = fullHistory.indexOf(entry);
            const item = this._createItem(entry, originalIndex, showPin, showDelete, showPaste, showEdit, showTag);
            container.add_child(item);
            this._items.push(item);
        }
    }

    _createItem(entry, originalIndex, showPin, showDelete, showPaste, showEdit, showTag) {
        const item = new St.BoxLayout({
            vertical: false,
            style_class: 'spotlight-clipboard-item' + (entry.isFavorite() ? ' spotlight-clipboard-item-fav' : ''),
            can_focus: true,
            reactive: true,
            x_align: Clutter.ActorAlign.FILL,
        });
        item.style = 'spacing: 8px; padding: 8px 12px; border-radius: 8px;';

        // favorite pin button
        if (showPin) {
            const favBtn = new St.Button({
                style_class: 'spotlight-action-btn' + (entry.isFavorite() ? ' spotlight-fav-active' : ''),
                can_focus: true,
                child: new St.Icon({
                    icon_name: 'view-pin-symbolic',
                    icon_size: 14,
                }),
            });
            favBtn.connect('clicked', () => {
                this._clipboardManager.toggleFavorite(originalIndex);
            });
            item.add_child(favBtn);
        }

        // type icon
        const iconName = entry.isImage()
            ? 'image-x-generic-symbolic'
            : 'edit-paste-symbolic';
        const icon = new St.Icon({
            icon_name: iconName,
            icon_size: 16,
            style_class: 'spotlight-clipboard-icon',
        });
        item.add_child(icon);

        // content preview
        let displayText;
        if (entry.isImage()) {
            displayText = `[Image] ${entry.mimetype()}`;
        } else {
            const text = entry.getStringValue();
            const preview = text.length > 120
                ? text.substring(0, 120) + '…'
                : text;
            displayText = preview.replace(/\n/g, ' ');
        }
        const label = new St.Label({
            style_class: 'spotlight-clipboard-preview',
            text: displayText,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        item.add_child(label);

        // tag label
        if (entry.getTag()) {
            const tagLabel = new St.Label({
                style_class: 'spotlight-clipboard-tag',
                text: entry.getTag(),
                y_align: Clutter.ActorAlign.CENTER,
            });
            tagLabel.style = 'background: rgba(255,255,255,0.1); border-radius: 4px; padding: 2px 8px; font-size: 11px; color: rgba(245,245,247,0.7);';
            item.add_child(tagLabel);
        }

        // tag button
        if (showTag) {
            const tagBtn = new St.Button({
                style_class: 'spotlight-action-btn',
                can_focus: true,
                child: new St.Icon({
                    icon_name: 'user-bookmarks-symbolic',
                    icon_size: 14,
                }),
            });
            tagBtn.connect('clicked', () => this._showTagDialog(entry, originalIndex));
            item.add_child(tagBtn);
        }

        // edit button (text only)
        if (showEdit && entry.isText()) {
            const editBtn = new St.Button({
                style_class: 'spotlight-action-btn',
                can_focus: true,
                child: new St.Icon({
                    icon_name: 'document-edit-symbolic',
                    icon_size: 14,
                }),
            });
            editBtn.connect('clicked', () => this._showEditDialog(entry, originalIndex));
            item.add_child(editBtn);
        }

        // paste button
        if (showPaste) {
            const pasteBtn = new St.Button({
                style_class: 'spotlight-action-btn',
                can_focus: true,
                child: new St.Icon({
                    icon_name: 'edit-paste-symbolic',
                    icon_size: 14,
                }),
            });
            pasteBtn.connect('clicked', () => {
                this._clipboardManager.selectEntry(originalIndex);
                if (entry.isText())
                    triggerPaste();
                if (this._onSelect)
                    this._onSelect();
            });
            item.add_child(pasteBtn);
        }

        // delete button
        if (showDelete) {
            const deleteBtn = new St.Button({
                style_class: 'spotlight-action-btn',
                can_focus: true,
                child: new St.Icon({
                    icon_name: 'edit-delete-symbolic',
                    icon_size: 14,
                }),
            });
            deleteBtn.connect('clicked', () => {
                if (entry.isFavorite() && this._settings.get_boolean('clipboard-confirm-pinned-delete')) {
                    this._showConfirmPinnedDelete(entry, originalIndex);
                } else {
                    this._clipboardManager.deleteEntry(originalIndex);
                }
            });
            item.add_child(deleteBtn);
        }

        // main click on item selects it
        item.connect('button-press-event', (actor, event) => {
            if (event.get_button() !== 1)
                return Clutter.EVENT_PROPAGATE;
            this._activateItem(entry, originalIndex);
            return Clutter.EVENT_STOP;
        });

        // keyboard support
        item.connect('key-press-event', (actor, event) => {
            const symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter) {
                this._activateItem(entry, originalIndex);
                return Clutter.EVENT_STOP;
            }
            if (symbol === Clutter.KEY_Delete || symbol === Clutter.KEY_d) {
                if (entry.isFavorite() && this._settings.get_boolean('clipboard-confirm-pinned-delete')) {
                    this._showConfirmPinnedDelete(entry, originalIndex);
                } else {
                    this._clipboardManager.deleteEntry(originalIndex);
                }
                return Clutter.EVENT_STOP;
            }
            if (symbol === Clutter.KEY_p) {
                this._clipboardManager.toggleFavorite(originalIndex);
                return Clutter.EVENT_STOP;
            }
            if (symbol === Clutter.KEY_v && entry.isText()) {
                this._clipboardManager.selectEntry(originalIndex);
                triggerPaste();
                if (this._onSelect)
                    this._onSelect();
                return Clutter.EVENT_STOP;
            }
            if (symbol === Clutter.KEY_e && entry.isText()) {
                this._showEditDialog(entry, originalIndex);
                return Clutter.EVENT_STOP;
            }
            if (symbol === Clutter.KEY_t) {
                this._showTagDialog(entry, originalIndex);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        return item;
    }

    _activateItem(entry, originalIndex) {
        this._clipboardManager.selectEntry(originalIndex);
        if (entry.isText() && this._settings.get_boolean('paste-on-select'))
            triggerPaste();
        if (this._onSelect)
            this._onSelect();
    }

    destroy() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
        for (const item of this._items)
            item.destroy();
        this._items = [];
        super.destroy();
    }
});
