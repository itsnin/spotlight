import Adw from 'gi://Adw';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { registerClass } from '../../common/gjs.js';
import { ShortcutRow } from './shortcutRow.js';

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

let PopupMenuShortcuts = class PopupMenuShortcuts extends Adw.PreferencesGroup {
	constructor() {
		super({ title: _('Popup Menu') });
		this.add(new ShortcutRow(_('Select Item Type'), '0...9'));
	}
};
PopupMenuShortcuts = __decorate([registerClass()], PopupMenuShortcuts);

export { PopupMenuShortcuts };
