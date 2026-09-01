import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import { registerClass } from '../common/gjs.js';
import { Icon } from '../common/icons.js';

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

let NestedListBox = class NestedListBox extends Adw.PreferencesRow {
	_listbox;

	constructor() {
		super({
			css_classes: ['nested-list-row'],
			focusable: false,
			activatable: false,
		});
		this._listbox = new Gtk.ListBox({
			css_classes: ['boxed-list', 'nested-list'],
			selection_mode: Gtk.SelectionMode.NONE,
		});
		this.child = this._listbox;
		this._listbox.connect('keynav-failed', this.keynav_failed_cb.bind(this));
	}

	get listbox() {
		return this._listbox;
	}

	keynav_failed_cb(_widget, direction) {
		if (direction !== Gtk.DirectionType.UP && direction !== Gtk.DirectionType.DOWN) return false;
		const dir = direction === Gtk.DirectionType.UP ? Gtk.DirectionType.TAB_BACKWARD : Gtk.DirectionType.TAB_FORWARD;
		return this.root.child_focus(dir);
	}
};
NestedListBox = __decorate(
	[
		registerClass({
			Properties: {
				listbox: GObject.ParamSpec.object('listbox', null, null, GObject.ParamFlags.READABLE, Gtk.ListBox),
			},
		}),
	],
	NestedListBox,
);

export { NestedListBox };

export function makeResettable(row, settings, ...keys) {
	const defaultValues = keys.map((key) => settings.get_default_value(key));
	if (defaultValues.some((value) => value === null)) return row;

	function isDefault() {
		return keys.every((key, i) => settings.get_value(key).equal(defaultValues[i]));
	}

	const separator = new Gtk.Separator({
		orientation: Gtk.Orientation.VERTICAL,
		margin_top: 9,
		margin_bottom: 9,
		margin_start: 6,
	});
	row.add_suffix(separator);
	if (row instanceof Adw.ExpanderRow) {
		separator.margin_start = 0;
		separator.margin_end = 6;
	}
	const resetButton = new Gtk.Button({
		icon_name: Icon.Undo,
		valign: Gtk.Align.CENTER,
		css_classes: ['flat'],
		sensitive: !isDefault(),
	});
	row.add_suffix(resetButton);
	resetButton.connect('clicked', () => keys.forEach((key) => settings.reset(key)));
	for (const key of keys) {
		settings.connect(`changed::${key}`, () => (resetButton.sensitive = !isDefault()));
	}
	return row;
}
