import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { enumParamSpec, registerClass } from '../../common/gjs.js';
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

export const State = {
	Empty: 0,
	NoResults: 1,
};

let StatusItem = class StatusItem extends St.BoxLayout {
	ext;
	_state;
	_emptyIcon;
	_noResultsIcon;
	_icon;
	_text;

	constructor(ext) {
		super({
			style_class: 'clipboard-item status-item',
			orientation: Clutter.Orientation.VERTICAL,
			can_focus: false,
			width: 300,
			height: 200,
			x_align: Clutter.ActorAlign.CENTER,
			y_align: Clutter.ActorAlign.CENTER,
			x_expand: true,
			y_expand: true,
		});
		this.ext = ext;
		this._state = State.Empty;
		const box = new St.BoxLayout({
			style_class: 'status-item-content',
			x_align: Clutter.ActorAlign.CENTER,
			y_align: Clutter.ActorAlign.CENTER,
			x_expand: true,
			y_expand: true,
			orientation: Clutter.Orientation.VERTICAL,
		});
		this.add_child(box);
		this._emptyIcon = loadIcon(ext, Icon.Clipboard);
		this._noResultsIcon = loadIcon(ext, Icon.SearchClipboard);
		this._icon = new St.Icon({
			style_class: 'status-item-icon',
			gicon: this._emptyIcon,
			x_align: Clutter.ActorAlign.CENTER,
			x_expand: true,
		});
		box.add_child(this._icon);
		this._text = new St.Label({
			style_class: 'status-item-title',
			text: _('Clipboard is Empty'),
			x_align: Clutter.ActorAlign.CENTER,
			x_expand: true,
			y_expand: true,
		});
		this._text.clutter_text.line_wrap = true;
		box.add_child(this._text);

		// Bind properties
		ext.settings.connectObject(
			'changed::item-width',
			this.updateSize.bind(this),
			'changed::item-height',
			this.updateSize.bind(this),
			this,
		);
		this.updateSize();
	}

	get state() {
		return this._state;
	}

	set state(state) {
		if (this._state === state) {
			return;
		}
		this._state = state;
		this.notify('state');
		if (this.state === State.Empty) {
			this._icon.gicon = this._emptyIcon;
			this._text.text = _('Clipboard is Empty');
		} else {
			this._icon.gicon = this._noResultsIcon;
			this._text.text = _('No Items Found');
		}
	}

	updateSize() {
		this.width = this.ext.settings.get_int('item-width');
		this.height = this.ext.settings.get_int('item-height');
	}

	destroy() {
		this.ext.settings.disconnectObject(this);
		super.destroy();
	}
};
StatusItem = __decorate(
	[
		registerClass({
			Properties: {
				state: enumParamSpec('state', GObject.ParamFlags.READWRITE, State, State.Empty),
			},
		}),
	],
	StatusItem,
);

export { StatusItem };
