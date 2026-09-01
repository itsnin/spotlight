import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Pango from 'gi://Pango';
import St from 'gi://St';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as BoxPointer from 'resource:///org/gnome/shell/ui/boxpointer.js';
import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { ItemType } from '../../common/constants.js';
import { registerClass } from '../../common/gjs.js';
import { Icon, loadIcon } from '../../common/icons.js';

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

/** Entry with proper height for multiline text and event forwarding */
let Entry = class Entry extends St.Entry {
	constructor(props) {
		super(props);
	}

	vfunc_get_preferred_height(for_width) {
		return this.clutter_text.get_preferred_height(for_width);
	}

	vfunc_button_press_event(event) {
		if (event.get_button() === Clutter.BUTTON_PRIMARY && !this.clutter_text.has_key_focus()) {
			this.clutter_text.grab_key_focus();
		}
		return this.clutter_text.vfunc_button_press_event(event);
	}

	vfunc_button_release_event(event) {
		return this.clutter_text.vfunc_button_release_event(event);
	}

	vfunc_key_press_event(event) {
		const key = event.get_key_symbol();
		if (event.has_control_modifier()) {
			if (key === Clutter.KEY_Home) {
				const end = event.has_shift_modifier() ? this.clutter_text.cursor_position : 0;
				this.clutter_text.set_selection(0, end);
				return Clutter.EVENT_STOP;
			}
			if (key === Clutter.KEY_End) {
				const start = event.has_shift_modifier() ? this.clutter_text.cursor_position : -1;
				this.clutter_text.set_selection(start, -1);
				return Clutter.EVENT_STOP;
			}
			if (key === Clutter.KEY_Tab) {
				this.clutter_text.insert_text('\t', this.clutter_text.cursor_position);
				return Clutter.EVENT_STOP;
			}
		}
		return super.vfunc_key_press_event(event);
	}

	vfunc_motion_event(event) {
		this.updateHover();
		return this.clutter_text.vfunc_motion_event(event);
	}

	updateHover() {
		this.sync_hover();
		if (this.hover) {
			global.display.set_cursor(Meta.Cursor.TEXT);
		} else {
			global.display.set_cursor(Meta.Cursor.DEFAULT);
		}
	}
};
Entry = __decorate([registerClass()], Entry);

export { Entry };

/**
 * Work around for St.Entry not properly supporting multiline mode. Extends St.Entry to follow system theme.
 */
let MultilineEntry = class MultilineEntry extends St.Entry {
	constructor(props) {
		super({ reactive: true, ...props });
		const text = this.clutter_text;
		this.remove_child(text);
		const scrollView = new St.ScrollView({
			style_class: 'multiline-scrollview',
			hscrollbar_policy: St.PolicyType.NEVER,
			vscrollbar_policy: St.PolicyType.AUTOMATIC,
			x_expand: true,
			clip_to_allocation: true,
		});
		this.add_child(scrollView);
		const box = new St.BoxLayout({
			style_class: 'multiline-box',
			x_align: Clutter.ActorAlign.FILL,
			y_align: Clutter.ActorAlign.FILL,
			x_expand: true,
			y_expand: true,
		});
		scrollView.child = box;
		box.add_child(text);
		text.single_line_mode = false;
		text.activatable = false;
		text.line_wrap = true;
		text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;

		// Always keep the cursor visible
		text.connect('cursor-changed', () => {
			const [success, x, y, h] = text.position_to_coords(text.cursor_position);
			if (success) {
				if (x > box.allocation.get_width()) return;
				const y1 = box.vadjustment.value;
				const y2 = y1 + box.vadjustment.page_size;
				if (y < y1) {
					box.vadjustment.value = y;
				} else if (y > y2 - h) {
					box.vadjustment.value = y - box.vadjustment.page_size + h;
				}
			}
		});
	}

	vfunc_allocate(box) {
		super.vfunc_allocate(box);
		const contentBox = this.get_theme_node().get_content_box(box);
		this.first_child.allocate(contentBox);
	}
};
MultilineEntry = __decorate([registerClass()], MultilineEntry);

export { MultilineEntry };

export class ScrollablePopupMenuSection extends PopupMenu.PopupMenuSection {
	constructor() {
		super();

		// @ts-expect-error actor cannot be reassigned
		this.actor = new St.ScrollView({
			style_class: 'scrollable-popup-menu-section',
			child: this.box,
			overlay_scrollbars: true,
		});
	}
}

export class LanguagePopupMenu extends PopupMenu.PopupMenu {
	constructor(ext, sourceActor, arrowAlignment, arrowSide) {
		super(sourceActor, arrowAlignment, arrowSide);
		this.actor.add_style_class_name('language-popupmenu');
		this.actor.hide();
		Main.layoutManager.uiGroup.add_child(this.actor);
		const section = new ScrollablePopupMenuSection();
		this.addMenuItem(section);
		if (ext.hljs) {
			const languages = ext.hljs
				.listLanguages()
				.map((language) => {
					return {
						id: language,
						name: ext.hljs?.getLanguage(language)?.name ?? language,
					};
				})
				.sort((a, b) => a.name.localeCompare(b.name));
			for (const language of languages) {
				section.addAction(language.name, () => this.emit('language', language));
			}
		}
	}
}

let LanguageButton = class LanguageButton extends St.Button {
	_language;
	_label;
	_popupMenu;

	constructor(ext, language) {
		super({
			style_class: 'language-button modal-dialog-button',
			reactive: true,
			can_focus: true,
			x_expand: true,
		});
		this._language = language;
		const box = new St.BoxLayout({
			x_expand: true,
		});
		this.child = box;
		this._label = new St.Label({
			text: language?.name ?? _('None'),
			x_align: Clutter.ActorAlign.CENTER,
			x_expand: true,
		});
		box.add_child(this._label);
		box.add_child(
			new St.Icon({
				gicon: loadIcon(ext, Icon.Down),
				icon_size: 20,
				x_align: Clutter.ActorAlign.END,
			}),
		);
		this._popupMenu = new LanguagePopupMenu(ext, this, 0.5, St.Side.TOP);
		const menuManager = new PopupMenu.PopupMenuManager(this);
		menuManager.addMenu(this._popupMenu, 0);
		this._popupMenu.connectObject('language', (_obj, l) => (this.language = l), this);
	}

	get language() {
		return this._language;
	}

	set language(language) {
		this._language = language;
		this._label.text = language?.name ?? _('None');
	}

	vfunc_clicked(_clicked_button) {
		this._popupMenu.open(BoxPointer.PopupAnimation.FULL);
	}

	destroy() {
		this._popupMenu.destroy();
		super.destroy();
	}
};
LanguageButton = __decorate(
	[
		registerClass({
			Properties: {
				language: GObject.ParamSpec.jsobject('language', null, null, GObject.ParamFlags.READWRITE),
			},
		}),
	],
	LanguageButton,
);

export { LanguageButton };

let EditDialog = class EditDialog extends ModalDialog.ModalDialog {
	_entry;
	_languageButton;

	constructor(ext, entry) {
		super({
			styleClass: 'clipboard-item-edit-dialog',
			destroyOnClose: true,
		});
		const content = new Dialog.MessageDialogContent({
			title: _('Edit Clipboard Item'),
		});
		this.contentLayout.add_child(content);
		if (entry.type === ItemType.Code) {
			const box = new St.Widget({
				style_class: 'modal-dialog-button-box modal-dialog-top-button-box',
				x_expand: true,
				layout_manager: new Clutter.BoxLayout({
					spacing: 12,
					homogeneous: true,
				}),
			});
			content.add_child(box);
			const metadata = { language: null, ...entry.metadata };
			this._languageButton = new LanguageButton(ext, metadata.language);
			box.add_child(this._languageButton);
		}

		// Entry
		this._entry = new MultilineEntry({
			style_class: 'clipboard-item-edit-dialog-entry',
			can_focus: true,
		});
		content.add_child(this._entry);
		this.setInitialKeyFocus(this._entry);
		this._entry.clutterText.text = entry.content;
		this._entry.clutterText.set_selection(0, 0);
		if (entry.type === ItemType.Code) {
			this._entry.add_style_class_name('monospace');
		}

		// Buttons
		this.addButton({
			label: _('Cancel'),
			action: () => this.close(),
			default: true,
			key: Clutter.KEY_Escape,
		});
		this.addButton({
			label: _('Save'),
			action: () => {
				entry.content = this._entry.clutterText.text;
				if (this._languageButton) entry.metadata = { language: this._languageButton.language };
				this.close();
			},
		});
	}

	on_opened() {
		this._entry.clutterText.queue_relayout();
	}
};
EditDialog = __decorate([registerClass()], EditDialog);

export { EditDialog };
