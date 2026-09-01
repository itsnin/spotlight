import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import { ItemType } from '../common/constants.js';
import { int32ParamSpec, registerClass } from '../common/gjs.js';

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
 * File operation.
 */
export const FileOperation = {
	Copy: 'copy',
	Cut: 'cut',
};

/**
 * Clipboard entry.
 */
let ClipboardEntry = class ClipboardEntry extends GObject.Object {
	_id;

	constructor(id, type, content, pinned, tag, datetime, metadata = null, title = '') {
		super();
		this._id = id;
		this.type = type;
		this.content = content;
		this.pinned = pinned;
		this.tag = tag;
		this.datetime = datetime;
		this.metadata = metadata;
		this.title = title;
	}

	get id() {
		return this._id;
	}
};
ClipboardEntry = __decorate(
	[
		registerClass({
			Properties: {
				id: int32ParamSpec('id', GObject.ParamFlags.READABLE, 0),
				type: GObject.ParamSpec.string('type', null, null, GObject.ParamFlags.READWRITE, ItemType.Text),
				content: GObject.ParamSpec.string('content', null, null, GObject.ParamFlags.READWRITE, ''),
				pinned: GObject.ParamSpec.boolean('pinned', null, null, GObject.ParamFlags.READWRITE, false),
				tag: GObject.ParamSpec.string('tag', null, null, GObject.ParamFlags.READWRITE, ''),
				datetime: GObject.ParamSpec.boxed('datetime', null, null, GObject.ParamFlags.READWRITE, GLib.DateTime),
				metadata: GObject.ParamSpec.jsobject('metadata', null, null, GObject.ParamFlags.READWRITE),
				title: GObject.ParamSpec.string('title', null, null, GObject.ParamFlags.READWRITE, ''),
			},
			Signals: {
				delete: {},
			},
		}),
	],
	ClipboardEntry,
);

export { ClipboardEntry };
