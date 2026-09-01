import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { registerClass } from '../../common/gjs.js';
import { bind_enum } from '../../common/settings.js';
import { makeResettable } from '../utils.js';
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

let DialogShortcuts = class DialogShortcuts extends Adw.PreferencesGroup {
	constructor(prefs) {
		super({
			title: _('Dialog'),
		});
		const openDialog = new ShortcutRow(_('Open Clipboard Dialog'), '', true);
		this.add(openDialog);
		const toggleIncognito = new ShortcutRow(_('Toggle Incognito Mode'), '', true);
		this.add(toggleIncognito);
		const openDialogBehaviour = new Adw.ComboRow({
			title: _('Open Clipboard Dialog Behavior'),
			model: Gtk.StringList.new([_('Toggle Dialog'), _('Open / Select Next Item')]),
		});
		this.add(openDialogBehaviour);

		// Bind properties
		const settings = prefs.getSettings();
		settings.bind('open-clipboard-dialog-shortcut', openDialog, 'shortcuts', Gio.SettingsBindFlags.DEFAULT);
		settings.bind('toggle-incognito-mode-shortcut', toggleIncognito, 'shortcuts', Gio.SettingsBindFlags.DEFAULT);
		bind_enum(settings, 'open-clipboard-dialog-behavior', openDialogBehaviour, 'selected');
		makeResettable(openDialog, settings, 'open-clipboard-dialog-shortcut');
		makeResettable(toggleIncognito, settings, 'toggle-incognito-mode-shortcut');
		makeResettable(openDialogBehaviour, settings, 'open-clipboard-dialog-behavior');
	}
};
DialogShortcuts = __decorate([registerClass()], DialogShortcuts);

export { DialogShortcuts };
