import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { registerClass } from '../../../common/gjs.js';
import { bind_enum } from '../../../common/settings.js';
import { makeResettable } from '../../utils.js';

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

let TextItemCustomization = class TextItemCustomization extends Adw.ExpanderRow {
	constructor(prefs) {
		super({
			title: _('Text Item'),
			subtitle: _('Configure text clipboard items'),
		});
		const showTextInfo = new Adw.SwitchRow({
			title: _('Show Text Info'),
			subtitle: _('Show extra information in the text item'),
		});
		this.add_row(showTextInfo);
		const textCounter = new Adw.ComboRow({
			title: _('Text Count Mode'),
			subtitle: _('Show the number of characters, words or lines'),
			model: Gtk.StringList.new([_('Characters'), _('Words'), _('Lines')]),
		});
		this.add_row(textCounter);

		// Bind properties
		const settings = prefs.getSettings().get_child('text-item');
		settings.bind('show-text-info', showTextInfo, 'active', null);
		bind_enum(settings, 'text-count-mode', textCounter, 'selected');
		makeResettable(textCounter, settings, 'text-count-mode');
		showTextInfo.bind_property('active', textCounter, 'sensitive', GObject.BindingFlags.SYNC_CREATE);
	}
};
TextItemCustomization = __decorate([registerClass()], TextItemCustomization);

export { TextItemCustomization };
