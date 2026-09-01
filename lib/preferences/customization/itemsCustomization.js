import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { registerClass } from '../../common/gjs.js';
import { CharacterItemCustomization } from './items/characterItemCustomization.js';
import { CodeItemCustomization } from './items/codeItemCustomization.js';
import { FileItemCustomization } from './items/fileItemCustomization.js';
import { ImageItemCustomization } from './items/imageItemCustomization.js';
import { LinkItemCustomization } from './items/linkItemCustomization.js';
import { TextItemCustomization } from './items/textItemCustomization.js';

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

let ItemsCustomization = class ItemsCustomization extends Adw.PreferencesGroup {
	constructor(prefs, window) {
		super({
			title: _('Items'),
		});
		this.add(new TextItemCustomization(prefs));
		const code = new CodeItemCustomization(prefs);
		this.add(code);
		this.add(new ImageItemCustomization(prefs));
		const file = new FileItemCustomization(prefs, window);
		this.add(file);
		this.add(new LinkItemCustomization(prefs, window));
		this.add(new CharacterItemCustomization(prefs));
		this.bind_property('hljs', code, 'sensitive', GObject.BindingFlags.SYNC_CREATE);
		this.bind_property('hljs', file, 'hljs', GObject.BindingFlags.SYNC_CREATE);
	}
};
ItemsCustomization = __decorate(
	[
		registerClass({
			Properties: {
				hljs: GObject.ParamSpec.boolean('hljs', null, null, GObject.ParamFlags.READWRITE, false),
			},
		}),
	],
	ItemsCustomization,
);

export { ItemsCustomization };
