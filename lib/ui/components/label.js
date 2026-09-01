import GObject from 'gi://GObject';
import St from 'gi://St';

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

/**
 * Remove leading/trailing blank lines (empty lines or lines containing just spaces/tabs)
 * @param text The text to trim
 */
export function trim(text) {
	return text.replace(/^([ \t]*\n)*/, '').replace(/(\n[ \t]*)*$/, '');
}

/**
 * Normalize indentation by replacing tabs with spaces and removing any leading indentation
 * @param text The text to normalize
 * @param tabWidth The number of spaces in a tab
 */
export function normalizeIndentation(text, tabWidth) {
	// Replace tabs with spaces
	text = text.replaceAll('\t', ' '.repeat(tabWidth));

	// Remove leading indentation
	let length = Number.MAX_SAFE_INTEGER;
	for (const match of text.matchAll(/^ *(?! |$)/gm)) {
		length = Math.min(length, match[0].length);
	}
	if (length === Number.MAX_SAFE_INTEGER) return text;
	return text.replace(new RegExp('^' + ' '.repeat(length), 'gm'), '');
}

let Label = class Label extends St.Label {
	_tabWidth = 4;
	_label = '';

	constructor(props) {
		super(props);
		const params = {
			...{ tabWidth: 4 },
			...props,
		};
		this._tabWidth = params.tabWidth;
		this.updateLabel();
	}

	get label() {
		return this._label;
	}

	set label(text) {
		if (this._label === text) return;
		this._label = text;
		this.updateLabel();
		this.notify('label');
	}

	get tabWidth() {
		return this._tabWidth;
	}

	set tabWidth(tabWidth) {
		if (this._tabWidth === tabWidth) return;
		this._tabWidth = tabWidth;
		this.updateLabel();
		this.notify('tab-width');
	}

	updateLabel() {
		this.text = normalizeIndentation(trim(this.label), this.tabWidth);
	}
};
Label = __decorate(
	[
		registerClass({
			Properties: {
				'label': GObject.ParamSpec.string('label', null, null, GObject.ParamFlags.READWRITE, ''),
				'tab-width': GObject.ParamSpec.int('tab-width', null, null, GObject.ParamFlags.READWRITE, 1, 8, 4),
			},
		}),
	],
	Label,
);

export { Label };
