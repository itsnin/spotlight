// spotlight - clipboard history view widget
// SPDX-License-Identifier: GPL-3.0-or-later
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import {triggerPaste} from '../services/virtualKeyboard.js';

export const ClipboardView = GObject.registerClass(
class ClipboardView extends St.ScrollView {
    _init(clipboardManager, settings, onSelect) {
        super._init({
            style_class: 'spotlight-clipboard-view',
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            visible: false,
        });
        this._clipboardManager = clipboardManager;
        this._settings = settings;
        this._onSelect = onSelect;
        this._filterText = '';
        this._items = [];

        this._box = new St.BoxLayout({
            vertical: true,
            style_class: 'spotlight-clipboard-list',
        });
        this.add_actor(this._box);

        // empty state shown when no clipboard history
        this._emptyLabel = new St.Label({
            style_class: 'spotlight-clipboard-empty',
            text: 'No clipboard history',
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

    _render() {
        // clear existing items
        for (const item of this._items)
            item.destroy();
        this._items = [];

        const history = this._clipboardManager.getHistory();
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
        const item = new St.Button({
            style_class: 'spotlight-clipboard-item',
            can_focus: true,
            x_align: Clutter.ActorAlign.FILL,
            label: '',
        });

        const hbox = new St.BoxLayout({
            vertical: false,
            x_align: Clutter.ActorAlign.FILL,
            spacing: 10,
        });
        item.set_child(hbox);

        // type icon
        const iconName = entry.isImage()
            ? 'image-x-generic-symbolic'
            : 'edit-paste-symbolic';
        const icon = new St.Icon({
            icon_name: iconName,
            icon_size: 16,
            style_class: 'spotlight-clipboard-icon',
        });
        hbox.add_child(icon);

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
        hbox.add_child(label);

        item.connect('clicked', () => {
            this._clipboardManager.selectEntry(originalIndex);
            if (entry.isText() && this._settings.get_boolean('paste-on-select'))
                triggerPaste();
            if (this._onSelect)
                this._onSelect();
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
