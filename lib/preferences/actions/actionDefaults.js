import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { instanceofAction, instanceofActionSubmenu } from '../../common/actions.js';
import { ItemType } from '../../common/constants.js';
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

function validType(type, types) {
	if (types == null || types.length === 0) return true;
	return types.includes(type);
}

let ActionListItem = class ActionListItem extends GObject.Object {
	id;
	name;
	submenu;

	constructor(id, name, submenu = null) {
		super();
		this.id = id;
		this.name = name;
		this.submenu = submenu;
	}

	get path() {
		return this.submenu ? `${this.submenu} › ${this.name}` : this.name;
	}
};
ActionListItem = __decorate(
	[
		registerClass({
			Properties: {
				id: GObject.ParamSpec.string('id', null, null, GObject.ParamFlags.READABLE, ''),
				path: GObject.ParamSpec.string('path', null, null, GObject.ParamFlags.READABLE, ''),
			},
		}),
	],
	ActionListItem,
);
let ActionDefault = class ActionDefault extends Adw.ComboRow {
	type;

	constructor(type, title, actions, defaultValue = null) {
		super({ title });
		this.type = type;
		this.expression = Gtk.PropertyExpression.new(ActionListItem.$gtype, null, 'path');
		this.update(actions, defaultValue);
		this.connect('notify::selected-item', () => this.notify('default-value'));
	}

	get defaultValue() {
		return this.selected_item?.id ?? null;
	}

	update(actions, id = null) {
		id ??= this.defaultValue;
		let selected = 0;
		const list = new Gio.ListStore({ item_type: ActionListItem.$gtype });
		list.append(new ActionListItem(null, _('None')));
		for (const action of actions) {
			if (instanceofAction(action)) {
				if (validType(this.type, action.types)) {
					if (action.id === id) selected = list.n_items;
					list.append(new ActionListItem(action.id, action.name));
				}
			} else if (instanceofActionSubmenu(action)) {
				for (const subAction of action.actions) {
					if (validType(this.type, subAction.types)) {
						if (subAction.id === id) selected = list.n_items;
						list.append(new ActionListItem(subAction.id, subAction.name, action.name));
					}
				}
			}
		}
		this.model = list;
		this.selected = selected;
	}
};
ActionDefault = __decorate(
	[
		registerClass({
			Properties: {
				'default-value': GObject.ParamSpec.string('default-value', null, null, GObject.ParamFlags.READABLE, ''),
			},
		}),
	],
	ActionDefault,
);
let ActionDefaultsPage = class ActionDefaultsPage extends Adw.NavigationPage {
	_defaults;
	_textDefault;
	_codeDefault;
	_imageDefault;
	_fileDefault;
	_filesDefault;
	_linkDefault;
	_characterDefault;
	_colorDefault;

	constructor(config) {
		super({
			title: _('Default Actions'),
		});
		config.defaults ??= {};
		this._defaults = config.defaults;
		const toolbarView = new Adw.ToolbarView();
		toolbarView.add_top_bar(new Adw.HeaderBar());
		this.child = toolbarView;
		const page = new Adw.PreferencesPage();
		toolbarView.content = page;

		// Defaults
		const defaults = new Adw.PreferencesGroup({
			title: _('Default Actions'),
		});
		page.add(defaults);
		this._textDefault = new ActionDefault(ItemType.Text, _('Text'), config.actions, config.defaults?.Text);
		this.connectDefault(ItemType.Text, this._textDefault);
		defaults.add(this._textDefault);
		this._codeDefault = new ActionDefault(ItemType.Code, _('Code'), config.actions, config.defaults?.Code);
		this.connectDefault(ItemType.Code, this._codeDefault);
		defaults.add(this._codeDefault);
		this._imageDefault = new ActionDefault(ItemType.Image, _('Image'), config.actions, config.defaults?.Image);
		this.connectDefault(ItemType.Image, this._imageDefault);
		defaults.add(this._imageDefault);
		this._fileDefault = new ActionDefault(ItemType.File, _('File'), config.actions, config.defaults?.File);
		this.connectDefault(ItemType.File, this._fileDefault);
		defaults.add(this._fileDefault);
		this._filesDefault = new ActionDefault(ItemType.Files, _('Files'), config.actions, config.defaults?.Files);
		this.connectDefault(ItemType.Files, this._filesDefault);
		defaults.add(this._filesDefault);
		this._linkDefault = new ActionDefault(ItemType.Link, _('Link'), config.actions, config.defaults?.Link);
		this.connectDefault(ItemType.Link, this._linkDefault);
		defaults.add(this._linkDefault);
		this._characterDefault = new ActionDefault(
			ItemType.Character,
			_('Character'),
			config.actions,
			config.defaults?.Character,
		);
		this.connectDefault(ItemType.Character, this._characterDefault);
		defaults.add(this._characterDefault);
		this._colorDefault = new ActionDefault(ItemType.Color, _('Color'), config.actions, config.defaults?.Color);
		this.connectDefault(ItemType.Color, this._colorDefault);
		defaults.add(this._colorDefault);
	}

	get defaults() {
		return this._defaults;
	}

	setDefaults(config) {
		this._defaults = config.defaults ?? {};
		this._textDefault.update(config.actions, this._defaults?.Text);
		this._codeDefault.update(config.actions, this._defaults?.Code);
		this._imageDefault.update(config.actions, this._defaults?.Image);
		this._fileDefault.update(config.actions, this._defaults?.File);
		this._filesDefault.update(config.actions, this._defaults?.Files);
		this._linkDefault.update(config.actions, this._defaults?.Link);
		this._characterDefault.update(config.actions, this._defaults?.Character);
		this._colorDefault.update(config.actions, this._defaults?.Color);
	}

	update(config) {
		this._textDefault.update(config.actions);
		this._codeDefault.update(config.actions);
		this._imageDefault.update(config.actions);
		this._fileDefault.update(config.actions);
		this._filesDefault.update(config.actions);
		this._linkDefault.update(config.actions);
		this._characterDefault.update(config.actions);
		this._colorDefault.update(config.actions);
	}

	connectDefault(type, action) {
		action.connect('notify::default-value', () => {
			const value = action.defaultValue;
			if (value) {
				this._defaults[type] = value;
			} else {
				delete this._defaults[type];
			}
			this.notify('defaults');
		});
	}
};
ActionDefaultsPage = __decorate(
	[
		registerClass({
			Properties: {
				defaults: GObject.ParamSpec.jsobject('defaults', null, null, GObject.ParamFlags.READABLE),
			},
		}),
	],
	ActionDefaultsPage,
);

export { ActionDefaultsPage };
