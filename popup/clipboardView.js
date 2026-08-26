// spotlight - clipboard history view widget
// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
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

        // toolbar with action buttons
        this._toolbar = new St.BoxLayout({
            vertical: false,
            style_class: 'spotlight-clipboard-toolbar',
        });
        this._toolbar.style = 'spacing: 8px; padding-bottom: 8px;';
        this.add_child(this._toolbar);

        // clear history button
        this._clearBtn = new St.Button({
            style_class: 'spotlight-action-btn',
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
            text: _('Clear history'),
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

        // scrollable list
        this._scrollView = new St.ScrollView({
            style_class: 'spotlight-clipboard-view',
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            x_expand: true,
            y_expand: true,
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

        // subscribe to clipboard changes
        this._unsubscribe = clipboardManager.subscribe(() => this._render());
        this._render();
    }

    // filter visible items by search text
    filter(text) {
        this._filterText = text.toLowerCase();
        this._render();
    }

    _clearHistory() {
        this._clipboardManager.clearHistory();
    }

    _render() {
        // clear existing items
        for (const item of this._items)
            item.destroy();
        this._items = [];

        const history = this._clipboardManager.getHistory();
        const favCount = history.filter(e => e.isFavorite()).length;
        if (favCount > 0)
            this._favLabel.text = this._('%d pinned').replace('%d', favCount);
        else
            this._favLabel.text = '';

        const filtered = this._filterText
            ? history.filter(e => {
                if (!e.isText())
                    return false;
                return e.getStringValue().toLowerCase().includes(this._filterText);
            })
            : history;

        this._emptyLabel.visible = (filtered.length === 0);

        for (let i = 0; i < filtered.length; i++) {
            const entry = filtered[i];
            const item = this._createItem(entry, history.indexOf(entry));
            this._box.add_child(item);
            this._items.push(item);
        }
    }

    _createItem(entry, originalIndex) {
        const item = new St.BoxLayout({
            vertical: false,
            style_class: 'spotlight-clipboard-item',
            can_focus: true,
            reactive: true,
            x_align: Clutter.ActorAlign.FILL,
        });
        item.style = 'spacing: 8px; padding: 8px 12px; border-radius: 8px;';

        // favorite pin button
        const favBtn = new St.Button({
            style_class: entry.isFavorite()
                ? 'spotlight-action-btn spotlight-fav-active'
                : 'spotlight-action-btn',
            can_focus: true,
            child: new St.Icon({
                icon_name: entry.isFavorite()
                    ? 'view-pin-symbolic'
                    : 'view-pin-symbolic',
                icon_size: 14,
            }),
        });
        if (entry.isFavorite())
            favBtn.style = favBtn.style + ' opacity: 1;';
        favBtn.connect('clicked', () => {
            this._clipboardManager.toggleFavorite(originalIndex);
        });
        item.add_child(favBtn);

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

        // paste button
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

        // delete button
        const deleteBtn = new St.Button({
            style_class: 'spotlight-action-btn',
            can_focus: true,
            child: new St.Icon({
                icon_name: 'edit-delete-symbolic',
                icon_size: 14,
            }),
        });
        deleteBtn.connect('clicked', () => {
            this._clipboardManager.deleteEntry(originalIndex);
        });
        item.add_child(deleteBtn);

        // main click on item selects it
        item.connect('button-press-event', (actor, event) => {
            // only handle left click not on buttons
            if (event.get_button() !== 1)
                return Clutter.EVENT_PROPAGATE;
            this._clipboardManager.selectEntry(originalIndex);
            if (entry.isText() && this._settings.get_boolean('paste-on-select'))
                triggerPaste();
            if (this._onSelect)
                this._onSelect();
            return Clutter.EVENT_STOP;
        });

        // keyboard support enter activates item
        item.connect('key-press-event', (actor, event) => {
            const symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter) {
                this._clipboardManager.selectEntry(originalIndex);
                if (entry.isText() && this._settings.get_boolean('paste-on-select'))
                    triggerPaste();
                if (this._onSelect)
                    this._onSelect();
                return Clutter.EVENT_STOP;
            }
            if (symbol === Clutter.KEY_Delete || symbol === Clutter.KEY_d) {
                this._clipboardManager.deleteEntry(originalIndex);
                return Clutter.EVENT_STOP;
            }
            if (symbol === Clutter.KEY_p) {
                this._clipboardManager.toggleFavorite(originalIndex);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        return item;
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
