import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { getCachePath, getConfigPath, getDataPath } from '../../common/constants.js';
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

let LocationsGroup = class LocationsGroup extends Adw.PreferencesGroup {
	constructor(prefs, window) {
		super({
			title: _('Locations'),
		});
		const dataPath = getDataPath(prefs);
		const dataLauncher = new Gtk.FileLauncher({ file: dataPath });
		const data = new Adw.ActionRow({
			title: _('Data'),
			subtitle: dataPath.get_path(),
			activatable: true,
		});
		data.connect('activated', () => dataLauncher.launch(window, null, () => {}));
		this.add(data);
		const configPath = getConfigPath(prefs);
		const configLauncher = new Gtk.FileLauncher({ file: configPath });
		const config = new Adw.ActionRow({
			title: _('Config'),
			subtitle: configPath.get_path(),
			activatable: true,
		});
		config.connect('activated', () => configLauncher.launch(window, null, () => {}));
		this.add(config);
		const cachePath = getCachePath(prefs);
		const cacheLauncher = new Gtk.FileLauncher({ file: cachePath });
		const cache = new Adw.ActionRow({
			title: _('Cache'),
			subtitle: cachePath.get_path(),
			activatable: true,
		});
		cache.connect('activated', () => cacheLauncher.launch(window, null, () => {}));
		this.add(cache);
	}
};
LocationsGroup = __decorate([registerClass()], LocationsGroup);

export { LocationsGroup };
