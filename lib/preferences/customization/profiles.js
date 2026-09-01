import Adw from 'gi://Adw';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { registerClass } from '../../common/gjs.js';
import {
	ChildKeys,
	FilePreviewVisibility,
	HeaderControlsVisibility,
	Orientation,
	Position,
	SettingsTypes,
} from '../../common/settings.js';

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

class Profile {
	_settings;
	_values = {};
	_invalidValues = new Set();
	_signals = [];

	constructor(prefs) {
		this._settings = prefs.getSettings();
		this.initProfile();
		this.checkSettings();
	}

	get active() {
		return this._invalidValues.size === 0;
	}

	addSetting(child, key, value) {
		if (child) {
			this._values[child] ??= {};
			const values = this._values[child];
			values[key] = value;
		} else {
			this._values[key] = value;
		}
	}

	connectActive(fn) {
		this._signals.push(fn);
	}

	activate() {
		this._invalidValues.clear();
		for (const [key, valueOrChild] of Object.entries(this._values)) {
			if (typeof valueOrChild === 'object' && !Array.isArray(valueOrChild)) {
				for (const [subkey, value] of Object.entries(valueOrChild)) {
					this.setValue(key, subkey, value);
				}
			} else {
				this.setValue(null, key, valueOrChild);
			}
		}
	}

	notifyActive() {
		for (const fn of this._signals) fn();
	}

	checkSettings() {
		for (const [key, valueOrChild] of Object.entries(this._values)) {
			if (typeof valueOrChild === 'object' && !Array.isArray(valueOrChild)) {
				const child = this._settings.get_child(key);
				for (const [subkey, value] of Object.entries(valueOrChild)) {
					this.checkSetting(key, subkey, value);
					child.connect(`changed::${subkey}`, () => this.checkSetting(key, subkey, value));
				}
			} else {
				this.checkSetting(null, key, valueOrChild);
				this._settings.connect(`changed::${key}`, () => this.checkSetting(null, key, valueOrChild));
			}
		}
	}

	checkSetting(child, key, value) {
		if (this.getValue(child, key) === value) {
			if (this._invalidValues.delete(`${child}:${key}`) && this.active) this.notifyActive();
			return true;
		} else {
			this._invalidValues.add(`${child}:${key}`);
			if (this._invalidValues.size === 1) this.notifyActive();
			return false;
		}
	}

	getValue(child, key) {
		const settings = child ? this._settings.get_child(child) : this._settings;
		const type = child ? SettingsTypes[child][key] : SettingsTypes[key];
		switch (type) {
			case 'boolean':
				return settings.get_boolean(key);
			case 'double':
				return settings.get_double(key);
			case 'enum':
				return settings.get_enum(key);
			case 'flags':
				return settings.get_flags(key);
			case 'int':
				return settings.get_int(key);
			case 'string':
				return settings.get_string(key);
			case 'strv':
				return settings.get_strv(key);
		}
	}

	setValue(child, key, value) {
		const settings = child ? this._settings.get_child(child) : this._settings;
		const type = child ? SettingsTypes[child][key] : SettingsTypes[key];
		switch (type) {
			case 'boolean':
				settings.set_boolean(key, value);
				break;
			case 'double':
				settings.set_double(key, value);
				break;
			case 'enum':
				settings.set_enum(key, value);
				break;
			case 'flags':
				settings.set_flags(key, value);
				break;
			case 'int':
				settings.set_int(key, value);
				break;
			case 'string':
				settings.set_string(key, value);
				break;
		}
	}
}

class DefaultProfile extends Profile {
	initProfile() {
		this.addSetting(null, 'show-at-pointer', false);
		this.addSetting(null, 'clipboard-orientation', Orientation.Horizontal);
		this.addSetting(null, 'clipboard-position-vertical', Position.Top);
		this.addSetting(null, 'clipboard-position-horizontal', Position.Fill);
		this.addSetting(null, 'clipboard-size', 500);
		this.addSetting(null, 'auto-hide-search', false);
		this.addSetting(null, 'item-width', 250);
		this.addSetting(null, 'item-height', 170);
		this.addSetting(null, 'dynamic-item-height', false);
		this.addSetting(null, 'show-header', true);
		this.addSetting(null, 'header-controls-visibility', HeaderControlsVisibility.Visible);
		this.addSetting('file-item', 'file-preview-visibility', FilePreviewVisibility.FilePreviewOrFileInfo);
		this.addSetting('link-item', 'link-preview-orientation', Orientation.Vertical);
	}
}

class CompactProfile extends Profile {
	initProfile() {
		this.addSetting(null, 'show-at-pointer', true);
		this.addSetting(null, 'clipboard-orientation', Orientation.Vertical);
		this.addSetting(null, 'clipboard-position-vertical', Position.Fill);
		this.addSetting(null, 'clipboard-position-horizontal', Position.Left);
		this.addSetting(null, 'clipboard-size', 500);
		this.addSetting(null, 'auto-hide-search', true);
		this.addSetting(null, 'item-width', 300);
		this.addSetting(null, 'item-height', 100);
		this.addSetting(null, 'dynamic-item-height', true);
		this.addSetting(null, 'show-header', false);
		this.addSetting(null, 'header-controls-visibility', HeaderControlsVisibility.VisibleOnHover);
		this.addSetting('file-item', 'file-preview-visibility', FilePreviewVisibility.FileInfoOnly);
		this.addSetting('link-item', 'link-preview-orientation', Orientation.Horizontal);
	}
}

let Profiles = class Profiles extends Adw.PreferencesGroup {
	constructor(prefs) {
		super({
			title: _('Profiles'),
			description: _('Choose between pre-defined profiles'),
		});
		const toggles = new Adw.ToggleGroup();
		this.add(toggles);
		const defaultToggle = new Adw.Toggle({
			name: 'default',
			label: _('Default'),
		});
		toggles.add(defaultToggle);
		const compactToggle = new Adw.Toggle({
			name: 'compact',
			label: _('Compact'),
		});
		toggles.add(compactToggle);
		const customToggle = new Adw.Toggle({
			name: 'custom',
			label: _('Custom'),
		});
		toggles.add(customToggle);
		const defaultProfile = new DefaultProfile(prefs);
		const compactProfile = new CompactProfile(prefs);

		// Set current active profile
		if (defaultProfile.active) toggles.set_active_name('default');
		else if (compactProfile.active) toggles.set_active_name('compact');
		else toggles.set_active_name('custom');

		// Update active profile
		toggles.connect('notify::active-name', () => {
			if (toggles.active_name === 'default' && !defaultProfile.active) {
				defaultProfile.activate();
			} else if (toggles.active_name === 'compact' && !compactProfile.active) {
				compactProfile.activate();
			}
		});

		// Check if profile is active
		defaultProfile.connectActive(() => {
			if (defaultProfile.active) {
				toggles.set_active_name('default');
			} else if (toggles.active_name === 'default') {
				toggles.set_active_name('custom');
			}
		});
		compactProfile.connectActive(() => {
			if (compactProfile.active) {
				toggles.set_active_name('compact');
			} else if (toggles.active_name === 'compact') {
				toggles.set_active_name('custom');
			}
		});
	}
};
Profiles = __decorate([registerClass()], Profiles);

export { Profiles };
