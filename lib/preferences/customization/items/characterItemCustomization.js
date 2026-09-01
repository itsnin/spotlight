import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { registerClass } from '../../../common/gjs.js';

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

let CharacterItemCustomization = class CharacterItemCustomization extends Adw.ExpanderRow {
	constructor(prefs) {
		super({
			title: _('Character Item'),
			subtitle: _('Configure character clipboard items'),
		});
		const maxCharacters = new Adw.SpinRow({
			title: _('Maximum Characters'),
			subtitle: _('Maximum number of characters that are recognized as a character item'),
			adjustment: new Gtk.Adjustment({ lower: 1, upper: 4, step_increment: 1, value: 1 }),
		});
		this.add_row(maxCharacters);
		const showUnicode = new Adw.SwitchRow({
			title: _('Show Unicode'),
			subtitle: _('Show the Unicode of the character'),
		});
		this.add_row(showUnicode);

		// Bind properties
		const settings = prefs.getSettings().get_child('character-item');
		settings.bind('max-characters', maxCharacters, 'value', Gio.SettingsBindFlags.DEFAULT);
		settings.bind('show-unicode', showUnicode, 'active', Gio.SettingsBindFlags.DEFAULT);
	}
};
CharacterItemCustomization = __decorate([registerClass()], CharacterItemCustomization);

export { CharacterItemCustomization };
