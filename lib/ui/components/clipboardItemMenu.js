import Clutter from 'gi://Clutter';
import St from 'gi://St';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as BoxPointer from 'resource:///org/gnome/shell/ui/boxpointer.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { ItemType, Tags } from '../../common/constants.js';
import { registerClass } from '../../common/gjs.js';
import { Shortcut } from '../../misc/shortcuts.js';
import { ActionPopupMenuSection } from './actionMenu.js';
import { EditDialog } from './editDialog.js';
import { ShortcutLabel } from './shortcutLabel.js';
import { TagsItem } from './tagsItem.js';

var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return (c > 3 && r && Object.defineProperty(target, key, r), r);
	};

function canEdit(entry) {
	return entry.type === ItemType.Text || entry.type === ItemType.Code;
}

let PopupMenuShortcutItem = class PopupMenuShortcutItem extends PopupMenu.PopupBaseMenuItem {
	ext;
	_shortcutLabel;

	constructor(ext, text, shortcut) {
		super();
		this.ext = ext;
		const label = new St.Label({
			text,
			y_expand: true,
			y_align: Clutter.ActorAlign.CENTER,
		});
		this.add_child(label);
		this._shortcutLabel = new ShortcutLabel(this.ext.settings.get_strv(shortcut)[0] ?? '', {
			x_expand: true,
			y_expand: true,
			x_align: Clutter.ActorAlign.END,
			y_align: Clutter.ActorAlign.CENTER,
			opacity: 180,
		});
		this.add_child(this._shortcutLabel);
		this.ext.settings.connectObject(
			`changed::${shortcut}`,
			() => (this._shortcutLabel.shortcut = this.ext.settings.get_strv(shortcut)[0] ?? ''),
			this,
		);
	}

	destroy() {
		this.ext.settings.disconnectObject(this);
		super.destroy();
	}
};
PopupMenuShortcutItem = __decorate([registerClass()], PopupMenuShortcutItem);

export class ClipboardItemMenu extends PopupMenu.PopupMenu {
	ext;
	_entry = null;
	_tagsItem;
	_editSection;
	_actionMenuSection;

	constructor(ext) {
		super(Main.layoutManager.dummyCursor, 0, St.Side.TOP);
		this.ext = ext;
		this.actor.add_style_class_name('clipboard-item-menu');

		// Tags
		this._tagsItem = new TagsItem();
		this.addMenuItem(this._tagsItem);
		this._tagsItem.connect('tag-changed', () => this.close(BoxPointer.PopupAnimation.FADE));
		this._tagsItem.connect('notify::tag', () => {
			if (this._entry) {
				this._entry.tag = this._tagsItem.tag;
			}
		});
		this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

		// Edit
		this._editSection = new PopupMenu.PopupMenuSection();
		this.addMenuItem(this._editSection);
		const menuItem = new PopupMenuShortcutItem(ext, _('Edit'), Shortcut.Edit);
		menuItem.connect('activate', () => {
			if (this._entry) this.edit(this._entry);
		});
		this._editSection.addMenuItem(menuItem);

		// Action menu
		this._actionMenuSection = new ActionPopupMenuSection(ext);
		this.addMenuItem(this._actionMenuSection);
		this._actionMenuSection.connectObject(
			'activate',
			(_menu, e) => this.emit('activate', e),
			'copy',
			(_menu, s) => this.emit('copy', s),
			'paste',
			(_menu, s) => this.emit('paste', s),
			this,
		);

		// Add to ui
		Main.layoutManager.uiGroup.add_child(this.actor);
		this.actor.hide();
		this.actor.connect('captured-event', (_actor, event) => {
			if (event.type() === Clutter.EventType.KEY_PRESS) {
				const key = event.get_key_symbol();

				// Select tag with number
				if (key === Clutter.KEY_0) {
					this._tagsItem.tag = null;
					this.close(BoxPointer.PopupAnimation.FADE);
					return;
				}
				if (key >= Clutter.KEY_1 && key <= Clutter.KEY_9) {
					let tag = Tags[key - Clutter.KEY_1] ?? null;
					tag = this._tagsItem.tag === tag ? null : tag;
					this._tagsItem.tag = tag;
					this.close(BoxPointer.PopupAnimation.FADE);
					return;
				}

				// Allow action menu to be closed with the action menu shortcut
				const action = ext.shortcutsManager?.getShortcutForKeyBinding(key, event.get_state());
				if (action === Shortcut.Menu) {
					this.close(BoxPointer.PopupAnimation.FADE);
				}
			}
		});
	}

	set arrowAlignment(alignment) {
		this._arrowAlignment = alignment;
	}

	set entry(entry) {
		this._entry = entry;
		this._actionMenuSection.entry = entry;
		this._tagsItem.tag = entry.tag;
		this._editSection.actor.visible = canEdit(entry);
	}

	edit(entry) {
		if (canEdit(entry)) {
			const editDialog = new EditDialog(this.ext, entry);
			editDialog.open();
		}
	}

	activateDefaultAction(entry) {
		return this._actionMenuSection.activateDefaultAction(entry);
	}

	activateAction(entry, id) {
		return this._actionMenuSection.activateAction(entry, id);
	}
}
