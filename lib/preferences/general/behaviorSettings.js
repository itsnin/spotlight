import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

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

let BehaviorSettings = class BehaviorSettings extends Adw.PreferencesGroup {
	constructor(prefs) {
		super({
			title: _('Behavior'),
		});
		const rememberSearch = new Adw.SwitchRow({
			title: _('Remember Search Query'),
			subtitle: _('Remember the search query when closing and reopening the clipboard dialog'),
		});
		this.add(rememberSearch);
		const excludePinned = new Adw.SwitchRow({
			title: _('Exclude Pinned Items from Main View'),
			subtitle: _('Pinned items appear only when searching for pinned items'),
		});
		this.add(excludePinned);
		const excludeTagged = new Adw.SwitchRow({
			title: _('Exclude Tagged Items from Main View'),
			subtitle: _('Tagged items appear only when searching for tagged items'),
		});
		this.add(excludeTagged);
		const protectPinned = new Adw.SwitchRow({
			title: _('Protect Pinned Items'),
			subtitle: _('Prevents pinned clipboard items from being deleted'),
		});
		this.add(protectPinned);
		const protectTagged = new Adw.SwitchRow({
			title: _('Protect Tagged Items'),
			subtitle: _('Prevents tagged clipboard items from being deleted'),
		});
		this.add(protectTagged);
		const syncPrimary = new Adw.SwitchRow({
			title: _('Sync Primary Clipboard'),
			subtitle: _('Also copy clipboard items to the primary clipboard'),
		});
		this.add(syncPrimary);
		const updateDateOnCopy = new Adw.SwitchRow({
			title: _('Update Date on Copy'),
			subtitle: _('Update the copied date of clipboard items when selected from clipboard history'),
		});
		this.add(updateDateOnCopy);

		// Bind properties
		const settings = prefs.getSettings();
		settings.bind('remember-search', rememberSearch, 'active', Gio.SettingsBindFlags.DEFAULT);
		settings.bind('exclude-pinned', excludePinned, 'active', Gio.SettingsBindFlags.DEFAULT);
		settings.bind('exclude-tagged', excludeTagged, 'active', Gio.SettingsBindFlags.DEFAULT);
		settings.bind('protect-pinned', protectPinned, 'active', Gio.SettingsBindFlags.DEFAULT);
		settings.bind('protect-tagged', protectTagged, 'active', Gio.SettingsBindFlags.DEFAULT);
		settings.bind('sync-primary', syncPrimary, 'active', Gio.SettingsBindFlags.DEFAULT);
		settings.bind('update-date-on-copy', updateDateOnCopy, 'active', Gio.SettingsBindFlags.DEFAULT);
	}
};
BehaviorSettings = __decorate([registerClass()], BehaviorSettings);

export { BehaviorSettings };
