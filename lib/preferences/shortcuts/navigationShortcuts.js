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

let NavigationShortcuts = class NavigationShortcuts extends Adw.PreferencesGroup {
	constructor() {
		super({
			title: _('Navigation'),
		});
		this.add(new ShortcutRow(_('Navigate'), 'Tab Up Down Left Right'));
		this.add(new ShortcutRow(_('Jump to Item'), '<Ctrl>0...9'));
		this.add(new ShortcutRow(_('Jump to Start'), 'Home'));
		this.add(new ShortcutRow(_('Jump to End'), 'End'));
		this.add(new ShortcutRow(_('Jump to Search'), '<Ctrl>F'));
	}
};
NavigationShortcuts = __decorate([registerClass()], NavigationShortcuts);

export { NavigationShortcuts };
