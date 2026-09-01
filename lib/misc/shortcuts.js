import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { instanceofAction, instanceofActionSubmenu, loadConfig } from '../common/actions.js';
import { getActionsConfigPath } from '../common/constants.js';
import { registerClass } from '../common/gjs.js';

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

export const Shortcut = {
	Open: 'open-clipboard-dialog-shortcut',
	Incognito: 'toggle-incognito-mode-shortcut',
	Pin: 'pin-item-shortcut',
	Delete: 'delete-item-shortcut',
	Edit: 'edit-item-shortcut',
	EditTitle: 'edit-title-shortcut',
	Menu: 'open-menu-shortcut',
};

let ShortcutBinding = class ShortcutBinding extends GObject.Object {
	_shortcuts = [];

	constructor(settings, key) {
		super();
		settings.bind(key, this, 'shortcuts', Gio.SettingsBindFlags.DEFAULT);
	}

	get shortcuts() {
		return this._shortcuts;
	}

	set shortcuts(value) {
		this._shortcuts = value;
		this.notify('shortcuts');
	}
};
ShortcutBinding = __decorate(
	[
		registerClass({
			Properties: {
				shortcuts: GObject.ParamSpec.boxed(
					'shortcuts',
					null,
					null,
					GObject.ParamFlags.READWRITE,
					GLib.strv_get_type(),
				),
			},
		}),
	],
	ShortcutBinding,
);
let ShortcutManager = class ShortcutManager extends GObject.Object {
	ext;
	_actor;
	_shortcuts = {};
	_actions = {};
	_shiftL = false;
	_shiftR = false;
	_monitor;

	constructor(ext, actor) {
		super();
		this.ext = ext;
		this.registerGlobalShortcut(Shortcut.Open, 'open-clipboard-dialog');
		this.registerGlobalShortcut(Shortcut.Incognito, 'toggle-incognito-mode');
		this.registerShortcut(Shortcut.Pin);
		this.registerShortcut(Shortcut.Delete);
		this.registerShortcut(Shortcut.Edit);
		this.registerShortcut(Shortcut.EditTitle);
		this.registerShortcut(Shortcut.Menu);
		this._actor = actor;
		actor.connectObject(
			'key-press-event',
			this.keyPressEvent.bind(this),
			'key-release-event',
			this.keyReleaseEvent.bind(this),
			'hide',
			this.hideEvent.bind(this),
			'destroy',
			() => (this._actor = null),
			this,
		);
		this._monitor = getActionsConfigPath(ext).monitor(Gio.FileMonitorFlags.NONE, null);
		this._monitor.connectObject(
			'changed',
			async (_source, _file, _otherFile, eventType) => {
				if (eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT) {
					await this.updateActions();
				}
			},
			this,
		);
		this.updateActions(true).catch(() => {});
	}

	registerGlobalShortcut(key, signal) {
		Main.wm.addKeybinding(key, this.ext.settings, Meta.KeyBindingFlags.NONE, Shell.ActionMode.ALL, () =>
			this.emit(signal),
		);
	}

	unregisterGlobalShortcut(key) {
		Main.wm.removeKeybinding(key);
	}

	registerShortcut(key) {
		this._shortcuts[key] = new ShortcutBinding(this.ext.settings, key);
	}

	keyPressEvent(_actor, event) {
		const key = event.get_key_symbol();
		if (key === Clutter.KEY_Shift_L) {
			this._shiftL = true;
			this.notify('shift');
		} else if (key === Clutter.KEY_Shift_R) {
			this._shiftR = true;
			this.notify('shift');
		}
	}

	keyReleaseEvent(_actor, event) {
		const key = event.get_key_symbol();
		if (key === Clutter.KEY_Shift_L) {
			this._shiftL = false;
			this.notify('shift');
		} else if (key === Clutter.KEY_Shift_R) {
			this._shiftR = false;
			this.notify('shift');
		}
	}

	hideEvent(_actor) {
		this._shiftL = false;
		this._shiftR = false;
		this.notify('shift');
	}

	async updateActions(save = false) {
		this._actions = {};
		const actions = await loadConfig(this.ext, save);
		for (const action of actions.actions) {
			if (instanceofActionSubmenu(action)) {
				for (const subAction of action.actions) {
					for (const shortcut of subAction.shortcut ?? []) {
						this._actions[shortcut] = subAction.id;
					}
				}
			} else if (instanceofAction(action)) {
				for (const shortcut of action.shortcut ?? []) {
					this._actions[shortcut] = action.id;
				}
			}
		}
	}

	get shift() {
		return this._shiftL || this._shiftR;
	}

	getShortcutForKeyBinding(keyval, mask) {
		const accelerator = Meta.accelerator_name(mask, keyval);
		for (const [key, binding] of Object.entries(this._shortcuts)) {
			if (binding.shortcuts.includes(accelerator)) return key;
		}
		return null;
	}

	getActionForKeyBinding(keyval, mask) {
		const accelerator = Meta.accelerator_name(mask, keyval);
		return this._actions[accelerator] ?? null;
	}

	destroy() {
		this.unregisterGlobalShortcut(Shortcut.Open);
		this.unregisterGlobalShortcut(Shortcut.Incognito);
		this._shortcuts = {};
		this._actor?.disconnectObject(this);
		this._monitor?.disconnectObject(this);
		this._monitor.cancel();
	}
};
ShortcutManager = __decorate(
	[
		registerClass({
			Properties: {
				shift: GObject.ParamSpec.boolean('shift', null, null, GObject.ParamFlags.READABLE, false),
			},
			Signals: {
				'open-clipboard-dialog': {},
				'toggle-incognito-mode': {},
			},
		}),
	],
	ShortcutManager,
);

export { ShortcutManager };
