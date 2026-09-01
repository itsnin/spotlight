import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
	ActionOutput,
	instanceofColorAction,
	instanceofCommandAction,
	instanceofQrCodeAction,
} from '../../common/actions.js';
import { ColorSpace, ColorSpaces } from '../../common/color.js';
import { ItemType } from '../../common/constants.js';
import { registerClass } from '../../common/gjs.js';
import { Icon } from '../../common/icons.js';
import { ShortcutRow } from '../shortcuts/shortcutRow.js';

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

let TypesBox = class TypesBox extends Gtk.Box {
	_all;
	_typesBox;

	constructor() {
		super({
			margin_end: 3,
		});
		this._all = new Gtk.Label({ label: _('All'), css_classes: ['dim-label'] });
		this.append(this._all);
		this._typesBox = new Gtk.FlowBox({
			selection_mode: Gtk.SelectionMode.NONE,
			min_children_per_line: 3,
			max_children_per_line: 3,
			sensitive: false,
			valign: Gtk.Align.CENTER,
			orientation: Gtk.Orientation.HORIZONTAL,
		});
		this.append(this._typesBox);
	}

	set types(types) {
		const count = new Set(types).size;
		if (count === 0 || count === 8) {
			this._all.visible = true;
			this._typesBox.visible = false;
			return;
		}
		const childrenPerLine = count > 6 ? 4 : 3;
		this._typesBox.min_children_per_line = childrenPerLine;
		this._typesBox.max_children_per_line = childrenPerLine;
		this._all.visible = false;
		this._typesBox.visible = true;
		this._typesBox.remove_all();
		if (types.includes(ItemType.Text))
			this._typesBox.append(new Gtk.Image({ icon_name: Icon.Text, css_classes: ['dim-label'] }));
		if (types.includes(ItemType.Code))
			this._typesBox.append(new Gtk.Image({ icon_name: Icon.Code, css_classes: ['dim-label'] }));
		if (types.includes(ItemType.Image))
			this._typesBox.append(new Gtk.Image({ icon_name: Icon.Image, css_classes: ['dim-label'] }));
		if (types.includes(ItemType.File))
			this._typesBox.append(new Gtk.Image({ icon_name: Icon.File, css_classes: ['dim-label'] }));
		if (types.includes(ItemType.Files))
			this._typesBox.append(new Gtk.Image({ icon_name: Icon.Folder, css_classes: ['dim-label'] }));
		if (types.includes(ItemType.Link))
			this._typesBox.append(new Gtk.Image({ icon_name: Icon.Link, css_classes: ['dim-label'] }));
		if (types.includes(ItemType.Character))
			this._typesBox.append(new Gtk.Image({ icon_name: Icon.Character, css_classes: ['dim-label'] }));
		if (types.includes(ItemType.Color))
			this._typesBox.append(new Gtk.Image({ icon_name: Icon.Color, css_classes: ['dim-label'] }));
	}
};
TypesBox = __decorate(
	[
		registerClass({
			Properties: {
				types: GObject.ParamSpec.boxed('types', null, null, GObject.ParamFlags.WRITABLE, GLib.strv_get_type()),
			},
		}),
	],
	TypesBox,
);

export { TypesBox };

let TypeRow = class TypeRow extends Gtk.ListBoxRow {
	type;
	_check;

	constructor(type, text) {
		super();
		this.type = type;
		const box = new Gtk.Box();
		this.child = box;
		box.append(new Gtk.Label({ label: text, valign: Gtk.Align.CENTER }));
		this._check = new Gtk.Image({ icon_name: Icon.Check, visible: false });
		box.append(this._check);
	}

	get selected() {
		return this._check.get_visible();
	}

	set selected(selected) {
		this._check.visible = selected;
	}

	toggle() {
		return (this._check.visible = !this._check.get_visible());
	}
};
TypeRow = __decorate([registerClass()], TypeRow);
let SelectTypesRow = class SelectTypesRow extends Adw.ActionRow {
	_types = [];
	_popover;
	_typeRows;

	constructor() {
		super({
			title: _('Types'),
			subtitle: _('Select which types are allowed'),
			activatable: true,
		});
		const typesBox = new TypesBox();
		this.bind_property('types', typesBox, 'types', GObject.BindingFlags.SYNC_CREATE);
		this.add_suffix(typesBox);
		const arrowBox = new Gtk.Box({
			valign: Gtk.Align.CENTER,
		});
		this.add_suffix(arrowBox);
		const arrow = new Gtk.Image({ icon_name: Icon.Down, css_classes: ['dropdown-arrow'] });
		arrowBox.append(arrow);

		// Popover
		this._popover = new Gtk.Popover({
			css_classes: ['menu'],
		});
		arrowBox.append(this._popover);
		const scrolledWindow = new Gtk.ScrolledWindow({
			hscrollbar_policy: Gtk.PolicyType.NEVER,
			max_content_height: 400,
			propagate_natural_height: true,
			propagate_natural_width: true,
		});
		this._popover.child = scrolledWindow;
		const list = new Gtk.ListBox();
		scrolledWindow.child = list;
		list.connect('row-activated', (_list, row) => {
			if (row.toggle()) {
				this._types.push(row.type);
			} else {
				this._types = this._types.filter((type) => type !== row.type);
			}
			this.notify('types');
		});

		// Items
		this._typeRows = {
			[ItemType.Text]: new TypeRow(ItemType.Text, _('Text')),
			[ItemType.Code]: new TypeRow(ItemType.Code, _('Code')),
			[ItemType.Image]: new TypeRow(ItemType.Image, _('Image')),
			[ItemType.File]: new TypeRow(ItemType.File, _('File')),
			[ItemType.Files]: new TypeRow(ItemType.Files, _('Files')),
			[ItemType.Link]: new TypeRow(ItemType.Link, _('Link')),
			[ItemType.Character]: new TypeRow(ItemType.Character, _('Character')),
			[ItemType.Color]: new TypeRow(ItemType.Color, _('Color')),
		};
		Object.values(this._typeRows).forEach((row) => list.append(row));
	}

	get types() {
		return this._types;
	}

	set types(types) {
		this._types = types;
		if (this._types.includes(ItemType.Text)) this._typeRows[ItemType.Text].selected = true;
		if (this._types.includes(ItemType.Code)) this._typeRows[ItemType.Code].selected = true;
		if (this._types.includes(ItemType.Image)) this._typeRows[ItemType.Image].selected = true;
		if (this._types.includes(ItemType.File)) this._typeRows[ItemType.File].selected = true;
		if (this._types.includes(ItemType.Files)) this._typeRows[ItemType.Files].selected = true;
		if (this._types.includes(ItemType.Link)) this._typeRows[ItemType.Link].selected = true;
		if (this._types.includes(ItemType.Character)) this._typeRows[ItemType.Character].selected = true;
		if (this._types.includes(ItemType.Color)) this._typeRows[ItemType.Color].selected = true;
		this.notify('types');
	}

	vfunc_activate() {
		this._popover.popup();
	}

	vfunc_size_allocate(width, height, baseline) {
		super.vfunc_size_allocate(width, height, baseline);
		this._popover.present();
	}
};
SelectTypesRow = __decorate(
	[
		registerClass({
			Properties: {
				types: GObject.ParamSpec.boxed('types', null, null, GObject.ParamFlags.READWRITE, GLib.strv_get_type()),
			},
		}),
	],
	SelectTypesRow,
);
let ActionDialog = class ActionDialog extends Adw.AlertDialog {
	_action;
	_suggestedId;
	_activeForm;

	constructor(action, heading, suggestedId, suggestedLabel) {
		super({ heading });
		this._action = action;
		this._suggestedId = suggestedId;
		this.add_response('cancel', _('Cancel'));
		this.set_close_response('cancel');
		this.add_response(suggestedId, suggestedLabel);
		this.set_response_appearance(suggestedId, Adw.ResponseAppearance.SUGGESTED);
		this.set_response_enabled(suggestedId, false);

		// Content
		const box = new Gtk.Box({
			orientation: Gtk.Orientation.VERTICAL,
			spacing: 20,
		});
		this.extra_child = box;

		// Kind Selector
		if (action === null) {
			const kindBox = new Gtk.ListBox({
				css_classes: ['boxed-list'],
				selection_mode: Gtk.SelectionMode.NONE,
			});
			box.append(kindBox);
			const kindSelector = new Adw.ComboRow({
				title: _('Kind'),
				model: Gtk.StringList.new([_('Command'), _('Color'), _('QR Code')]),
			});
			kindBox.append(kindSelector);

			// Form
			const stack = new Gtk.Stack({
				transition_type: Gtk.StackTransitionType.NONE,
				vhomogeneous: false,
			});
			box.append(stack);
			const forms = [new CommandActionForm(null), new ColorActionForm(null), new QrCodeActionForm(null)];
			for (const form of forms) {
				form.connect('notify::valid', this.updateResponse.bind(this));
				stack.add_child(form);
			}
			this._activeForm = forms[0];
			kindSelector.connect('notify::selected', () => {
				const form = forms[kindSelector.selected];
				if (!form) return;
				stack.set_visible_child(form);
				this._activeForm = form;
			});
		} else {
			let form;
			if (instanceofCommandAction(action)) form = new CommandActionForm(action);
			else if (instanceofColorAction(action)) form = new ColorActionForm(action);
			else if (instanceofQrCodeAction(action)) form = new QrCodeActionForm(action);
			else throw new Error('Unknown Action');
			form.connect('notify::valid', this.updateResponse.bind(this));
			box.append(form);
			this._activeForm = form;
			this.updateResponse();
		}
	}

	get action() {
		return this._action;
	}

	on_response(response) {
		if (response === this._suggestedId) {
			this._action = this._activeForm.action;
			this.notify('action');
		}
	}

	updateResponse() {
		this.set_response_enabled(this._suggestedId, this._activeForm.valid);
	}
};
ActionDialog = __decorate(
	[
		registerClass({
			Properties: {
				action: GObject.ParamSpec.jsobject('action', null, null, GObject.ParamFlags.READABLE),
			},
		}),
	],
	ActionDialog,
);

export { ActionDialog };

let InfoRow = class InfoRow extends Adw.EntryRow {
	constructor(props, popover) {
		super(props);
		this.add_suffix(
			new Gtk.MenuButton({
				icon_name: Icon.Help,
				can_focus: false,
				valign: Gtk.Align.CENTER,
				popover,
				css_classes: ['flat'],
			}),
		);
	}
};
InfoRow = __decorate([registerClass()], InfoRow);
let RegexPopover = class RegexPopover extends Gtk.Popover {
	constructor() {
		super({ has_arrow: true });
		const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12, margin_start: 6, margin_end: 6 });
		this.child = box;
		box.append(
			new Gtk.Label({
				label: _(
					'The regular expression does not use any flags for matching. Leaving this empty will match everything.',
				),
				xalign: 0,
				max_width_chars: 30,
				wrap: true,
			}),
		);
		const grid = new Gtk.Grid({
			column_spacing: 16,
			row_spacing: 6,
		});
		box.append(grid);
		grid.attach(new Gtk.Label({ label: _('Type'), xalign: 0, css_classes: ['heading'] }), 0, 0, 1, 1);
		grid.attach(new Gtk.Label({ label: _('Example'), xalign: 0, css_classes: ['heading'] }), 1, 0, 1, 1);
		grid.attach(new Gtk.Label({ label: _('Text'), xalign: 0 }), 0, 1, 1, 1);
		grid.attach(new Gtk.Label({ label: 'Lorem ipsum dolor sit amet', xalign: 0 }), 1, 1, 1, 1);
		grid.attach(new Gtk.Label({ label: _('Code'), xalign: 0 }), 0, 2, 1, 1);
		grid.attach(new Gtk.Label({ label: "console.log('Hello, World!')", xalign: 0 }), 1, 2, 1, 1);
		grid.attach(new Gtk.Label({ label: _('Image'), xalign: 0 }), 0, 3, 1, 1);
		grid.attach(new Gtk.Label({ label: 'file:///path/to/temp/image.png', xalign: 0 }), 1, 3, 1, 1);
		grid.attach(new Gtk.Label({ label: _('File'), xalign: 0 }), 0, 4, 1, 1);
		grid.attach(new Gtk.Label({ label: 'file:///path/to/file.txt', xalign: 0 }), 1, 4, 1, 1);
		grid.attach(new Gtk.Label({ label: _('Files'), xalign: 0 }), 0, 5, 1, 1);
		grid.attach(new Gtk.Label({ label: 'file:///file1.txt\\nfile:///file2.txt', xalign: 0 }), 1, 5, 1, 1);
		grid.attach(new Gtk.Label({ label: _('Link'), xalign: 0 }), 0, 6, 1, 1);
		grid.attach(new Gtk.Label({ label: 'https://example.org', xalign: 0 }), 1, 6, 1, 1);
		grid.attach(new Gtk.Label({ label: _('Character'), xalign: 0 }), 0, 7, 1, 1);
		grid.attach(new Gtk.Label({ label: '🙂', xalign: 0 }), 1, 7, 1, 1);
		grid.attach(new Gtk.Label({ label: _('Color'), xalign: 0 }), 0, 8, 1, 1);
		grid.attach(new Gtk.Label({ label: '#FF0000', xalign: 0 }), 1, 8, 1, 1);
	}
};
RegexPopover = __decorate([registerClass()], RegexPopover);
let PatternRow = class PatternRow extends InfoRow {
	constructor(props) {
		super({ title: _('Regular Expression'), ...props }, new RegexPopover());
	}
};
PatternRow = __decorate([registerClass()], PatternRow);
let CommandRow = class CommandRow extends InfoRow {
	constructor(props) {
		super(
			{ title: _('Command'), ...props },
			new Gtk.Popover({
				has_arrow: true,
				child: new Gtk.Label({
					label: _(
						'Clipboard content will be provided via stdin. Capture groups of the regular expression will be passed as positional parameters $1, $2, $3, ...',
					),
					margin_start: 6,
					margin_end: 6,
					max_width_chars: 30,
					wrap: true,
				}),
			}),
		);
	}
};
CommandRow = __decorate([registerClass()], CommandRow);
let CommandActionForm = class CommandActionForm extends Gtk.ListBox {
	_action;
	_nameRow;
	_patternRow;
	_typesRow;
	_commandRow;
	_outputRow;
	_shortcutRow;

	constructor(action) {
		super({
			css_classes: ['boxed-list'],
			selection_mode: Gtk.SelectionMode.NONE,
		});
		this._action = action;
		this._nameRow = new Adw.EntryRow({ title: _('Name'), text: action?.name ?? '' });
		this.append(this._nameRow);
		this._patternRow = new PatternRow({ text: action?.pattern ?? '' });
		this.append(this._patternRow);
		this._typesRow = new SelectTypesRow();
		this._typesRow.types = action?.types ?? [];
		this.append(this._typesRow);
		this._commandRow = new CommandRow({ text: action?.command ?? '' });
		this.append(this._commandRow);
		const selected =
			action === null
				? 0
				: [ActionOutput.Ignore, ActionOutput.Copy, ActionOutput.Paste].indexOf(action.output ?? '');
		this._outputRow = new Adw.ComboRow({
			title: _('Output'),
			subtitle: _('Select how to handle the output'),
			model: Gtk.StringList.new([_('Ignore'), _('Copy'), _('Paste')]),
			selected,
		});
		this.append(this._outputRow);
		this._shortcutRow = new ShortcutRow(_('Shortcut'), action?.shortcut?.join(' '), true);
		this.append(this._shortcutRow);

		// Connect signals
		this._nameRow.connect('notify::text', () => this.notify('valid'));
		this._commandRow.connect('notify::text', () => this.notify('valid'));
	}

	get action() {
		this._action ??= {
			kind: 'command',
			id: GLib.uuid_string_random(),
			name: '',
			pattern: null,
			types: null,
			command: '',
			output: ActionOutput.Ignore,
			shortcut: [],
		};
		this._action.name = this._nameRow.text;
		this._action.pattern = this._patternRow.text.length ? this._patternRow.text : null;
		this._action.types = this._typesRow.types.length ? this._typesRow.types : null;
		this._action.command = this._commandRow.text;
		this._action.output = [ActionOutput.Ignore, ActionOutput.Copy, ActionOutput.Paste][this._outputRow.selected];
		this._action.shortcut = this._shortcutRow.shortcuts;
		return this._action;
	}

	get valid() {
		return this._nameRow.text.trim().length !== 0 && this._commandRow.text.length !== 0;
	}
};
CommandActionForm = __decorate(
	[
		registerClass({
			Properties: {
				valid: GObject.ParamSpec.boolean('valid', null, null, GObject.ParamFlags.READABLE, false),
			},
		}),
	],
	CommandActionForm,
);
let ColorActionForm = class ColorActionForm extends Gtk.ListBox {
	_action;
	_nameRow;
	_patternRow;
	_spaceRow;
	_outputRow;
	_shortcutRow;

	constructor(action) {
		super({
			css_classes: ['boxed-list'],
			selection_mode: Gtk.SelectionMode.NONE,
		});
		this._action = action;
		this._nameRow = new Adw.EntryRow({ title: _('Name'), text: action?.name ?? '' });
		this.append(this._nameRow);
		this._patternRow = new PatternRow({ text: action?.pattern ?? '' });
		this.append(this._patternRow);
		this._spaceRow = new Adw.ComboRow({
			title: _('Color Space'),
			subtitle: _('Select which color space to convert to'),
			model: Gtk.StringList.new([
				_('Rgb'),
				_('Hex'),
				_('Hsl'),
				_('Hwb'),
				_('Linear Rgb'),
				_('Xyz'),
				_('Lab'),
				_('Lch'),
				_('Oklab'),
				_('Oklch'),
			]),
			selected: action === null ? 0 : ColorSpaces.indexOf(action.space),
		});
		this.append(this._spaceRow);
		const selected = action === null ? 0 : [ActionOutput.Copy, ActionOutput.Paste].indexOf(action.output ?? '');
		this._outputRow = new Adw.ComboRow({
			title: _('Output'),
			subtitle: _('Select how to handle the output'),
			model: Gtk.StringList.new([_('Copy'), _('Paste')]),
			selected,
		});
		this.append(this._outputRow);
		this._shortcutRow = new ShortcutRow(_('Shortcut'), action?.shortcut?.join(' '), true);
		this.append(this._shortcutRow);

		// Connect signals
		this._nameRow.connect('notify::text', () => this.notify('valid'));
	}

	get action() {
		this._action ??= {
			kind: 'color',
			id: GLib.uuid_string_random(),
			name: '',
			pattern: null,
			types: [ItemType.Color],
			space: ColorSpace.Rgb,
			output: ActionOutput.Copy,
			shortcut: [],
		};
		this._action.name = this._nameRow.text;
		this._action.pattern = this._patternRow.text.length ? this._patternRow.text : null;
		this._action.space = ColorSpaces[this._spaceRow.selected] ?? ColorSpace.Rgb;
		this._action.output = [ActionOutput.Copy, ActionOutput.Paste][this._outputRow.selected];
		this._action.shortcut = this._shortcutRow.shortcuts;
		return this._action;
	}

	get valid() {
		return this._nameRow.text.trim().length !== 0;
	}
};
ColorActionForm = __decorate(
	[
		registerClass({
			Properties: {
				valid: GObject.ParamSpec.boolean('valid', null, null, GObject.ParamFlags.READABLE, false),
			},
		}),
	],
	ColorActionForm,
);
let QrCodeActionForm = class QrCodeActionForm extends Gtk.ListBox {
	_action;
	_nameRow;
	_patternRow;
	_typesRow;
	_shortcutRow;

	constructor(action) {
		super({
			css_classes: ['boxed-list'],
			selection_mode: Gtk.SelectionMode.NONE,
		});
		this._action = action;
		this._nameRow = new Adw.EntryRow({ title: _('Name'), text: action?.name ?? '' });
		this.append(this._nameRow);
		this._patternRow = new PatternRow({ text: action?.pattern ?? '' });
		this.append(this._patternRow);
		this._typesRow = new SelectTypesRow();
		this._typesRow.types = action?.types ?? [];
		this.append(this._typesRow);
		this._shortcutRow = new ShortcutRow(_('Shortcut'), action?.shortcut?.join(' '), true);
		this.append(this._shortcutRow);

		// Connect signals
		this._nameRow.connect('notify::text', () => this.notify('valid'));
	}

	get action() {
		this._action ??= {
			kind: 'qrcode',
			id: GLib.uuid_string_random(),
			name: '',
			pattern: null,
			types: null,
			output: ActionOutput.Ignore,
			shortcut: [],
		};
		this._action.name = this._nameRow.text;
		this._action.pattern = this._patternRow.text.length ? this._patternRow.text : null;
		this._action.types = this._typesRow.types.length ? this._typesRow.types : null;
		this._action.shortcut = this._shortcutRow.shortcuts;
		return this._action;
	}

	get valid() {
		return this._nameRow.text.trim().length !== 0;
	}
};
QrCodeActionForm = __decorate(
	[
		registerClass({
			Properties: {
				valid: GObject.ParamSpec.boolean('valid', null, null, GObject.ParamFlags.READABLE, false),
			},
		}),
	],
	QrCodeActionForm,
);
let AddActionDialog = class AddActionDialog extends ActionDialog {
	constructor(action) {
		super(action, _('Add Action'), 'add', _('Add'));
	}
};
AddActionDialog = __decorate([registerClass()], AddActionDialog);

export { AddActionDialog };

let EditActionDialog = class EditActionDialog extends ActionDialog {
	constructor(action) {
		super(action, _('Edit Action'), 'save', _('Save'));
	}
};
EditActionDialog = __decorate([registerClass()], EditActionDialog);

export { EditActionDialog };
