import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { registerClass } from '../../../common/gjs.js';
import { globToRegex } from '../../../common/glob.js';
import { Icon } from '../../../common/icons.js';

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

Gio._promisify(Gtk.FileDialog.prototype, 'open', 'open_finish');
let GlobSyntaxPopover = class GlobSyntaxPopover extends Gtk.Popover {
	constructor() {
		super({ has_arrow: true });
		const grid = new Gtk.Grid({
			column_spacing: 12,
			row_spacing: 6,
			margin_top: 12,
			margin_bottom: 12,
			margin_start: 12,
			margin_end: 12,
		});
		this.child = grid;
		const asterisk = new Gtk.Label({ label: '*', css_classes: ['monospace'], xalign: 0 });
		grid.attach(asterisk, 0, 0, 1, 1);
		const asteriskDescription = new Gtk.Label({ label: _('Zero or More Characters'), xalign: 0 });
		grid.attach(asteriskDescription, 1, 0, 1, 1);
		const questionMark = new Gtk.Label({ label: '?', css_classes: ['monospace'], xalign: 0 });
		grid.attach(questionMark, 0, 1, 1, 1);
		const questionMarkDescription = new Gtk.Label({ label: _('One Character'), xalign: 0 });
		grid.attach(questionMarkDescription, 1, 1, 1, 1);
		const globstar = new Gtk.Label({ label: '**', css_classes: ['monospace'], xalign: 0 });
		grid.attach(globstar, 0, 2, 1, 1);
		const globstarDescription = new Gtk.Label({ label: _('Recursive Wildcard'), xalign: 0 });
		grid.attach(globstarDescription, 1, 2, 1, 1);
		const list = new Gtk.Label({ label: '{a,b,c}', css_classes: ['monospace'], xalign: 0 });
		grid.attach(list, 0, 3, 1, 1);
		const listDescription = new Gtk.Label({ label: _('List'), xalign: 0 });
		grid.attach(listDescription, 1, 3, 1, 1);
		const range = new Gtk.Label({ label: '[abc]', css_classes: ['monospace'], xalign: 0 });
		grid.attach(range, 0, 4, 1, 1);
		const rangeDescription = new Gtk.Label({ label: _('Range'), xalign: 0 });
		grid.attach(rangeDescription, 1, 4, 1, 1);
		const notInRange = new Gtk.Label({ label: '[^abc]', css_classes: ['monospace'], xalign: 0 });
		grid.attach(notInRange, 0, 5, 1, 1);
		const notInRangeDescription = new Gtk.Label({ label: _('Not in Range'), xalign: 0 });
		grid.attach(notInRangeDescription, 1, 5, 1, 1);
	}
};
GlobSyntaxPopover = __decorate([registerClass()], GlobSyntaxPopover);
let AddExclusionPatternDialog = class AddExclusionPatternDialog extends Adw.AlertDialog {
	glob;
	_pattern = '';
	_patternEntry;
	_testEntry;
	_invalidPattern;
	_shown;
	_hidden;

	constructor(heading, body, testTitle, glob) {
		super({ heading, body });
		this.glob = glob;
		this.add_response('cancel', _('Cancel'));
		this.set_close_response('cancel');
		this.add_response('add', _('Add'));
		this.set_response_appearance('add', Adw.ResponseAppearance.SUGGESTED);
		this.set_response_enabled('add', false);
		const box = new Gtk.Box({
			orientation: Gtk.Orientation.VERTICAL,
			spacing: 16,
		});
		this.extra_child = box;

		// Pattern
		const patternBox = new Gtk.ListBox({ css_classes: ['boxed-list'] });
		box.append(patternBox);
		this._patternEntry = new Adw.EntryRow({
			title: _('Pattern'),
		});
		this._patternEntry.connect('changed', () => (this.pattern = this._patternEntry.text));
		patternBox.append(this._patternEntry);
		if (glob) {
			const syntaxButton = new Gtk.MenuButton({
				icon_name: Icon.Help,
				valign: Gtk.Align.CENTER,
				popover: new GlobSyntaxPopover(),
				css_classes: ['flat'],
			});
			this._patternEntry.add_suffix(syntaxButton);
		}

		// Test Pattern
		const testGroup = new Adw.PreferencesGroup({
			description: _('You can test your pattern below'),
		});
		box.append(testGroup);
		this._testEntry = new Adw.EntryRow({ title: testTitle });
		this._testEntry.connect('changed', this.testPattern.bind(this));
		testGroup.add(this._testEntry);
		if (glob) {
			const fileSelectButton = new Gtk.Button({
				icon_name: Icon.Folder,
				valign: Gtk.Align.CENTER,
				css_classes: ['flat'],
			});
			this._testEntry.add_suffix(fileSelectButton);
			fileSelectButton.connect('clicked', async () => {
				const dialog = new Gtk.FileDialog();
				try {
					const result = await dialog.open(null, null);
					const path = result?.get_path();
					if (path != null) this._testEntry.text = path;
				} catch {
					// Ignore
				}
			});
		}
		const testLegend = new Gtk.Box({ spacing: 16, margin_top: 8, css_classes: ['dim-label'] });
		testGroup.add(testLegend);
		this._invalidPattern = new Gtk.Box({ spacing: 6, css_classes: ['error'], visible: false });
		this._invalidPattern.append(new Gtk.Image({ icon_name: Icon.Warning }));
		this._invalidPattern.append(new Gtk.Label({ label: _('Invalid Pattern') }));
		testLegend.append(this._invalidPattern);
		this._shown = new Gtk.Box({ spacing: 6, visible: false });
		this._shown.append(new Gtk.Image({ icon_name: Icon.Show }));
		this._shown.append(new Gtk.Label({ label: _('Preview Shown') }));
		testLegend.append(this._shown);
		this._hidden = new Gtk.Box({ spacing: 6, visible: false });
		this._hidden.append(new Gtk.Image({ icon_name: Icon.Hide }));
		this._hidden.append(new Gtk.Label({ label: _('Preview Hidden') }));
		testLegend.append(this._hidden);

		// Spacer
		testLegend.append(new Gtk.Label({ label: ' ', opacity: 0 }));
	}

	get pattern() {
		return this._pattern;
	}

	set pattern(pattern) {
		this._pattern = pattern;
		let error = false;
		try {
			new RegExp(this.glob ? globToRegex(pattern) : pattern);
		} catch {
			error = true;
		}
		this.testPattern();
		this.set_response_enabled('add', this._pattern !== '' && !error);
		this.notify('pattern');
	}

	testPattern() {
		try {
			const regex = new RegExp(this.glob ? globToRegex(this.pattern) : this.pattern);
			this._invalidPattern.visible = false;
			if (this._testEntry.text === '') {
				this._shown.visible = false;
				this._hidden.visible = false;
			} else if (regex.test(this._testEntry.text)) {
				this._shown.visible = false;
				this._hidden.visible = true;
			} else {
				this._shown.visible = true;
				this._hidden.visible = false;
			}
		} catch {
			this._invalidPattern.visible = true;
			this._shown.visible = false;
			this._hidden.visible = false;
		}
	}

	vfunc_map() {
		super.vfunc_map();
		this._patternEntry.text = '';
		this.testPattern();
	}
};
AddExclusionPatternDialog = __decorate(
	[
		registerClass({
			Properties: {
				pattern: GObject.ParamSpec.string('pattern', null, null, GObject.ParamFlags.READABLE, ''),
			},
		}),
	],
	AddExclusionPatternDialog,
);
let ExclusionsGroup = class ExclusionsGroup extends Adw.PreferencesGroup {
	_listModel = new Gtk.StringList();

	constructor(window, dialogHeading, dialogBody, dialogTestTitle, glob, params) {
		super({
			...params,
			header_suffix: new Gtk.Button({
				icon_name: Icon.Add,
				valign: Gtk.Align.CENTER,
				css_classes: ['flat'],
			}),
		});
		const addFileExclusionPatternDialog = new AddExclusionPatternDialog(
			dialogHeading,
			dialogBody,
			dialogTestTitle,
			glob,
		);
		addFileExclusionPatternDialog.connect('response', (_dialog, response) => {
			if (response === 'add') {
				const pattern = addFileExclusionPatternDialog.pattern;
				this._listModel.append(pattern);
				this.notify('exclusion-patterns');
			}
		});
		this.header_suffix.connect('clicked', () => {
			addFileExclusionPatternDialog.present(window);
		});
		const list = new Gtk.ListBox({ css_classes: ['boxed-list'], selection_mode: Gtk.SelectionMode.NONE });
		list.bind_model(this._listModel, (item) => {
			const row = new Adw.ActionRow({ title: item.string });
			const deleteButton = new Gtk.Button({
				icon_name: Icon.Delete,
				valign: Gtk.Align.CENTER,
				css_classes: ['flat', 'destructive-action'],
			});
			deleteButton.connect('clicked', () => {
				this._listModel.remove(row.get_index());
				this.notify('exclusion-patterns');
			});
			row.add_suffix(deleteButton);
			return row;
		});
		list.set_placeholder(
			new Adw.ActionRow({
				title: _('No Exclusion Patterns'),
				sensitive: false,
			}),
		);
		this.add(list);
	}

	get exclusionPatterns() {
		const strings = [];
		for (let i = 0; i < this._listModel.n_items; i++) {
			const string = this._listModel.get_string(i);
			if (string) strings.push(string);
		}
		return strings;
	}

	set exclusionPatterns(patterns) {
		this._listModel.splice(0, this._listModel.n_items, patterns);
		this.notify('exclusion-patterns');
	}
};
ExclusionsGroup = __decorate(
	[
		registerClass({
			Properties: {
				'exclusion-patterns': GObject.ParamSpec.boxed(
					'exclusion-patterns',
					null,
					null,
					GObject.ParamFlags.READWRITE,
					GLib.strv_get_type(),
				),
			},
		}),
	],
	ExclusionsGroup,
);

export { ExclusionsGroup };
