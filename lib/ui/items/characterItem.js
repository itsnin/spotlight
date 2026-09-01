import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import St from 'gi://St';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { registerClass } from '../../common/gjs.js';
import { Icon } from '../../common/icons.js';
import { ClipboardItem } from './clipboardItem.js';

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

let CharacterItem = class CharacterItem extends ClipboardItem {
	characterItemSettings;
	_character;
	_chars;

	constructor(ext, entry) {
		super(ext, entry, Icon.Character, _('Char'));
		this.characterItemSettings = this.ext.settings.get_child('character-item');
		this.add_style_class_name('character-item');
		this._character = new St.Label({
			style_class: 'character-item-content',
			text: entry.content.trim(),
			min_width: 0,
			x_align: Clutter.ActorAlign.CENTER,
			y_align: Clutter.ActorAlign.CENTER,
			y_expand: true,
			style: 'font-size: 16px',
		});
		this._character.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
		this._content.add_child(this._character);
		const chars = [...entry.content.trim()]
			.map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
			.join(' ');
		this._chars = new St.Label({
			style_class: 'character-item-chars',
			text: chars,
			x_align: Clutter.ActorAlign.CENTER,
			y_align: Clutter.ActorAlign.END,
		});
		this._content.add_child(this._chars);

		// Bind properties
		this.characterItemSettings.connectObject('changed::show-unicode', this.updateSettings.bind(this), this);
		this.updateSettings();
	}

	updateSettings() {
		this._chars.visible = this.characterItemSettings.get_boolean('show-unicode');
	}

	vfunc_allocate(box) {
		super.vfunc_allocate(box);
		this.updateHeight();
		super.vfunc_allocate(box);
	}

	updateHeight() {
		const themeNode = this._content.get_theme_node();
		const padding = themeNode.get_horizontal_padding();
		const scale = this.get_resource_scale();

		// Calculate max font size
		const [, extents] = this._character.clutter_text.get_layout().get_pixel_extents();
		const size = this._character.get_theme_node().get_font().get_size() / Pango.SCALE;
		const fontFactor = extents ? extents.height / scale / size : 1;
		const width = this._content.allocation.get_width() - padding;
		const maxSize = extents ? Math.min(Math.floor((width / extents.width) * scale * size), 80) : 80;

		// Update size
		const charsHeight = this._chars.has_allocation() ? this._chars.allocation.get_height() : 0;
		const height = (this._content.allocation.get_height() - charsHeight) / fontFactor;
		const characterSize = Math.clamp(Math.floor((200 * height) / (height + 200)), 20, maxSize);
		this._character.set_style(`font-size: ${characterSize}px;`);
	}

	destroy() {
		this.characterItemSettings.disconnectObject(this);
		super.destroy();
	}
};
CharacterItem = __decorate([registerClass()], CharacterItem);

export { CharacterItem };
