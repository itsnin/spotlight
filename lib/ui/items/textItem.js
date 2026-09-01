import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { registerClass } from '../../common/gjs.js';
import { Icon } from '../../common/icons.js';
import { TextInfo } from '../components/contentInfo.js';
import { Label } from '../components/label.js';
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

let TextItem = class TextItem extends ClipboardItem {
	textItemSettings;
	_text;
	_textInfo;

	constructor(ext, entry) {
		super(ext, entry, Icon.Text, _('Text'));
		this.textItemSettings = this.ext.settings.get_child('text-item');
		this.add_style_class_name('text-item');
		this._text = new Label({
			style_class: 'text-item-content',
			y_align: Clutter.ActorAlign.FILL,
			y_expand: true,
			min_height: 0,
		});
		this._text.clutter_text.line_wrap = true;
		this._text.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
		this._content.add_child(this._text);
		this.textItemSettings.connectObject('changed', this.updateTextInfo.bind(this), this);
		this.ext.settings.connectObject('changed::tab-width', this.updateText.bind(this), this._text);
		entry.bind_property('content', this._text, 'label', GObject.BindingFlags.SYNC_CREATE);
		entry.connectObject('notify::content', this.updateTextInfo.bind(this));
		this.updateText();
		this.updateTextInfo();
	}

	updateText() {
		this._text.tabWidth = this.ext.settings.get_int('tab-width');
	}

	updateTextInfo() {
		const show = this.textItemSettings.get_boolean('show-text-info');
		const textCountMode = this.textItemSettings.get_enum('text-count-mode');
		if (this._textInfo) {
			this._textInfo.visible = show;
			this._textInfo.text = this.entry.content;
			this._textInfo.textCountMode = textCountMode;
		} else if (show) {
			this._textInfo = new TextInfo(this.entry.content, textCountMode);
			this._content.add_child(this._textInfo);
		}
	}

	destroy() {
		this.textItemSettings.disconnectObject(this);
		this.ext.settings.disconnectObject(this._text);
		this.entry.disconnectObject(this);
		super.destroy();
	}
};
TextItem = __decorate([registerClass()], TextItem);

export { TextItem };
