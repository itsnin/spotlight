import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { registerClass } from '../../common/gjs.js';

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
var ShortcutLabel_1;

let ShortcutLabel = (ShortcutLabel_1 = class ShortcutLabel extends St.Label {
	_shortcut;

	constructor(shortcut, props) {
		super(props);
		this._shortcut = shortcut;
		this.text = ShortcutLabel_1.shortcutToLabel(shortcut);
	}

	get shortcut() {
		return this._shortcut;
	}

	set shortcut(shortcut) {
		this._shortcut = shortcut;
		this.notify('shortcuts');
		this.text = ShortcutLabel_1.shortcutToLabel(shortcut);
	}

	static shortcutToLabel(shortcut) {
		return shortcut
			.split(' ')
			.map((s) =>
				s
					.replace(/(?<=^|>)(\w)/g, (_match, key) => key.toUpperCase())
					.replace(/<(\w+)>(?=(.?))/g, (_match, key, next) => {
						const plus = next.length > 0 ? '+' : '';
						switch (key.toLowerCase()) {
							case 'shift':
								return GLib.dpgettext2('gtk40', 'Keyboard label', 'Shift') + plus;
							case 'control':
								return GLib.dpgettext2('gtk40', 'Keyboard label', 'Ctrl') + plus;
							case 'alt':
								return GLib.dpgettext2('gtk40', 'Keyboard label', 'Alt') + plus;
							case 'meta':
								return GLib.dpgettext2('gtk40', 'Keyboard label', 'Meta') + plus;
							case 'super':
								return GLib.dpgettext2('gtk40', 'Keyboard label', 'Super') + plus;
							case 'hyper':
								return GLib.dpgettext2('gtk40', 'Keyboard label', 'Hyper') + plus;
							default:
								return key + plus;
						}
					})
					.replace('&', '+'),
			)
			.join(' ');
	}
});
ShortcutLabel = ShortcutLabel_1 = __decorate(
	[
		registerClass({
			Properties: {
				shortcut: GObject.ParamSpec.string('shortcuts', null, null, GObject.ParamFlags.READWRITE, null),
			},
		}),
	],
	ShortcutLabel,
);

export { ShortcutLabel };
