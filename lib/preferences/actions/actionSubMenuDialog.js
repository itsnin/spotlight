import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

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

let ActionSubmenuDialog = class ActionSubmenuDialog extends Adw.AlertDialog {
	_actionSubmenu;
	_suggestedId;
	_nameRow;

	constructor(actionSubmenu, heading, suggestedId, suggestedLabel) {
		super({
			heading,
		});
		this._suggestedId = suggestedId;
		actionSubmenu ??= {
			name: '',
			actions: [],
		};
		this._actionSubmenu = actionSubmenu;
		this.add_response('cancel', _('Cancel'));
		this.set_close_response('cancel');
		this.add_response(suggestedId, suggestedLabel);
		this.set_response_appearance(suggestedId, Adw.ResponseAppearance.SUGGESTED);
		this.set_response_enabled(suggestedId, false);

		// Form
		const box = new Gtk.ListBox({
			css_classes: ['boxed-list'],
			selection_mode: Gtk.SelectionMode.NONE,
		});
		this.extra_child = box;
		this._nameRow = new Adw.EntryRow({ title: _('Name'), text: actionSubmenu.name });
		box.append(this._nameRow);

		// Connect signals
		this._nameRow.connect('notify::text', this.updateEnabled.bind(this));
	}

	get actionSubmenu() {
		return this._actionSubmenu;
	}

	on_response(response) {
		if (response === this._suggestedId && this.actionSubmenu !== null) {
			this.actionSubmenu.name = this._nameRow.text;
			this.notify('action-submenu');
		}
	}

	updateEnabled() {
		this.set_response_enabled(this._suggestedId, this._nameRow.text !== '');
	}
};
ActionSubmenuDialog = __decorate(
	[
		registerClass({
			Properties: {
				'action-submenu': GObject.ParamSpec.jsobject('action-submenu', null, null, GObject.ParamFlags.READABLE),
			},
		}),
	],
	ActionSubmenuDialog,
);

export { ActionSubmenuDialog };

let AddActionSubmenuDialog = class AddActionSubmenuDialog extends ActionSubmenuDialog {
	constructor(actionSubmenu) {
		super(actionSubmenu, _('Add Submenu'), 'add', _('Add'));
	}
};
AddActionSubmenuDialog = __decorate([registerClass()], AddActionSubmenuDialog);

export { AddActionSubmenuDialog };

let EditActionSubmenuDialog = class EditActionSubmenuDialog extends ActionSubmenuDialog {
	constructor(actionSubmenu) {
		super(actionSubmenu, _('Edit Submenu'), 'edit', _('Edit'));
	}
};
EditActionSubmenuDialog = __decorate([registerClass()], EditActionSubmenuDialog);

export { EditActionSubmenuDialog };
