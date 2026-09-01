import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';
import Gst from 'gi://Gst';
import St from 'gi://St';

import { gettext as _, ngettext } from 'resource:///org/gnome/shell/extensions/extension.js';

import { enumParamSpec, registerClass } from '../../common/gjs.js';
import { Icon, loadIcon } from '../../common/icons.js';
import { TextCountMode } from '../../common/settings.js';
import { FileType } from './contentPreview.js';

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

function formatBytes(bytes) {
	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const exp = Math.floor(Math.log10(bytes) / 3);
	const value = (bytes / Math.pow(1000, exp)) % 1000;
	const formatted = value.toLocaleString('en', { maximumSignificantDigits: 2 });
	return [formatted, units[exp]];
}

function formatTime(seconds) {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	let res = '';
	if (h > 0) res += _('%dh').format(h) + ' ';
	if (m > 0) res += _('%dm').format(m) + ' ';
	res += _('%ds').format(s);
	return res;
}

let ContentInfo = class ContentInfo extends St.BoxLayout {
	left;
	right;

	constructor() {
		super({
			style_class: 'content-info',
			x_expand: true,
		});
		this.left = new St.BoxLayout({
			style_class: 'content-info-left',
			x_align: Clutter.ActorAlign.START,
			x_expand: true,
		});
		this.add_child(this.left);
		this.right = new St.BoxLayout({
			style_class: 'content-info-right',
			x_align: Clutter.ActorAlign.END,
		});
		this.add_child(this.right);
	}
};
ContentInfo = __decorate([registerClass()], ContentInfo);

export { ContentInfo };

let TextInfo = class TextInfo extends ContentInfo {
	_countLabel;
	_text;
	_textCountMode;

	constructor(text, textCountMode) {
		super();
		this._countLabel = new St.Label();
		this.left.add_child(this._countLabel);
		this._text = text;
		this._textCountMode = textCountMode;
		this.updateCount();
	}

	set text(text) {
		if (this._text === text) return;
		this._text = text;
		this.updateCount();
	}

	set textCountMode(countMode) {
		if (this._textCountMode === countMode) return;
		this._textCountMode = countMode;
		this.updateCount();
	}

	updateCount() {
		if (this._textCountMode === TextCountMode.Characters) {
			let count = 0;
			const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(this._text);
			for (const _segment of segments) count++;
			this._countLabel.text = ngettext('%d char', '%d chars', count).format(count);
		} else if (this._textCountMode === TextCountMode.Words) {
			let count = 0;
			const segments = new Intl.Segmenter(undefined, { granularity: 'word' }).segment(this._text);
			for (const segment of segments) {
				if (segment.isWordLike) count++;
			}
			this._countLabel.text = ngettext('%d word', '%d words', count).format(count);
		} else if (this._textCountMode === TextCountMode.Lines) {
			const count = this._text.split('\n').length;
			this._countLabel.text = ngettext('%d line', '%d lines', count).format(count);
		}
	}
};
TextInfo = __decorate(
	[
		registerClass({
			Properties: {
				'text': GObject.ParamSpec.string('text', null, null, GObject.ParamFlags.WRITABLE, ''),
				'text-count-mode': enumParamSpec('text-count-mode', GObject.ParamFlags.WRITABLE, TextCountMode, 0),
			},
		}),
	],
	TextInfo,
);

export { TextInfo };

let CodeInfo = class CodeInfo extends TextInfo {
	_languageLabel;

	constructor(text, textCountMode, language) {
		super(text, textCountMode);
		this._languageLabel = new St.Label({
			style_class: 'language',
			text: language ?? '',
		});
		this.right.add_child(this._languageLabel);
	}

	set language(language) {
		this._languageLabel.text = language ?? '';
	}
};
CodeInfo = __decorate(
	[
		registerClass({
			Properties: {
				language: GObject.ParamSpec.string('language', null, null, GObject.ParamFlags.WRITABLE, null),
			},
		}),
	],
	CodeInfo,
);

export { CodeInfo };

let FileInfo = class FileInfo extends ContentInfo {
	constructor(size = null) {
		super();
		this.add_style_class_name('file-info');
		if (size !== null) {
			const [value, unit] = formatBytes(size);
			const sizeBox = new St.BoxLayout({ style_class: 'file-info-size' });
			sizeBox.add_child(new St.Label({ style_class: 'content-info-number', text: value }));
			sizeBox.add_child(
				new St.Label({
					style_class: 'file-info-unit',
					text: unit,
					y_align: Clutter.ActorAlign.END,
				}),
			);
			this.left.add_child(sizeBox);
		}
	}
};
FileInfo = __decorate([registerClass()], FileInfo);

export { FileInfo };

let MissingFileInfo = class MissingFileInfo extends FileInfo {
	constructor(ext) {
		super();
		this.add_style_class_name('missing-info');
		this.left.add_child(new St.Icon({ gicon: loadIcon(ext, Icon.Warning) }));
		this.left.add_child(new St.Label({ text: _('Missing File') }));
	}
};
MissingFileInfo = __decorate([registerClass()], MissingFileInfo);

export { MissingFileInfo };

let ErrorFileInfo = class ErrorFileInfo extends FileInfo {
	constructor(ext) {
		super();
		this.add_style_class_name('error-info');
		this.left.add_child(new St.Icon({ gicon: loadIcon(ext, Icon.Warning) }));
		this.left.add_child(new St.Label({ text: _('Error') }));
	}
};
ErrorFileInfo = __decorate([registerClass()], ErrorFileInfo);

export { ErrorFileInfo };

let DirectoryInfo = class DirectoryInfo extends FileInfo {
	constructor(ext, directoryCount, fileCount) {
		super();
		this.add_style_class_name('directory-info');
		const directories = new St.BoxLayout({ style_class: 'directory-count' });
		directories.add_child(new St.Icon({ gicon: loadIcon(ext, Icon.Folder) }));
		directories.add_child(new St.Label({ style_class: 'content-info-number', text: directoryCount.toString() }));
		this.left.add_child(directories);
		const files = new St.BoxLayout({ style_class: 'file-count' });
		files.add_child(new St.Icon({ gicon: loadIcon(ext, Icon.File) }));
		files.add_child(new St.Label({ style_class: 'content-info-number', text: fileCount.toString() }));
		this.left.add_child(files);
	}
};
DirectoryInfo = __decorate([registerClass()], DirectoryInfo);

export { DirectoryInfo };

let ImageInfo = class ImageInfo extends FileInfo {
	constructor(size, width, height) {
		super(size);
		this.add_style_class_name('image-info');
		const dimensions = new St.BoxLayout({ style_class: 'image-dimensions' });
		dimensions.add_child(new St.Label({ text: `${width}×${height}` }));
		this.right.add_child(dimensions);
	}
};
ImageInfo = __decorate([registerClass()], ImageInfo);

export { ImageInfo };

let MediaInfo = class MediaInfo extends FileInfo {
	constructor(ext, size, seconds) {
		super(size);
		this.add_style_class_name('media-info');
		const duration = new St.BoxLayout({ style_class: 'media-duration', y_align: Clutter.ActorAlign.END });
		duration.add_child(new St.Icon({ gicon: loadIcon(ext, Icon.Duration) }));
		duration.add_child(new St.Label({ text: formatTime(seconds) }));
		this.right.add_child(duration);
	}
};
MediaInfo = __decorate([registerClass()], MediaInfo);

export { MediaInfo };

Gio._promisify(Gio.File.prototype, 'enumerate_children_async');

export async function tryCreateDirectoryFileInfo(ext, file) {
	try {
		const enumerator = await file.enumerate_children_async(
			'standard::*',
			Gio.FileQueryInfoFlags.NONE,
			GLib.PRIORITY_DEFAULT,
			null,
		);
		let directoryCount = 0;
		let fileCount = 0;
		for await (const f of enumerator) {
			const fileType = f.get_file_type();
			if (fileType === Gio.FileType.DIRECTORY) {
				directoryCount++;
			} else if (fileType === Gio.FileType.REGULAR) {
				fileCount++;
			}
		}
		return new DirectoryInfo(ext, directoryCount, fileCount);
	} catch {
		return null;
	}
}

export function tryCreateImageInfo(file, size) {
	try {
		const [, width, height] = GdkPixbuf.Pixbuf.get_file_info(file.get_path());
		return new ImageInfo(size, width, height);
	} catch {
		return null;
	}
}

export async function tryCreateMediaFileInfo(ext, file, size, cancellable) {
	try {
		if (!Gst.is_initialized()) {
			Gst.init(null);
		}

		// https://gitlab.freedesktop.org/gstreamer/gst-plugins-base/-/blob/ce69d1068af058425b083aaa1b8c268b1b2e5ddd/gst-libs/gst/pbutils/gstdiscoverer.c#L340
		const pipeline = Gst.parse_launch(`uridecodebin uri="${file.get_uri()}"`);
		pipeline.set_state(Gst.State.PAUSED);

		// https://gitlab.freedesktop.org/gstreamer/gst-plugins-base/-/blob/ce69d1068af058425b083aaa1b8c268b1b2e5ddd/gst-libs/gst/pbutils/gstdiscoverer.c#L1417
		let [success, duration] = pipeline.query_duration(Gst.Format.TIME);
		if (!success) {
			pipeline.set_state(Gst.State.PLAYING);
			await new Promise((resolve) => {
				let i = 0;
				const timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
					[success, duration] = pipeline.query_duration(Gst.Format.TIME);
					if (success || i >= 5) {
						resolve();
						cancellable.disconnect(cancellableId);
						return GLib.SOURCE_REMOVE;
					}
					i++;
					cancellable.disconnect(cancellableId);
					return GLib.SOURCE_CONTINUE;
				});
				const cancellableId = cancellable.connect(() => GLib.source_remove(timeoutId));
			});
		}
		pipeline.set_state(Gst.State.NULL);
		if (success && duration >= 0) {
			return new MediaInfo(ext, size, duration / Gst.SECOND);
		} else {
			return null;
		}
	} catch (err) {
		ext.logger.error(err);
		return null;
	}
}

export async function createFileInfo(ext, file, fileType, cancellable) {
	try {
		if (!file.query_exists(null)) {
			return new MissingFileInfo(ext);
		}
		const info = await file.query_info_async(
			Gio.FILE_ATTRIBUTE_STANDARD_SIZE,
			Gio.FileQueryInfoFlags.NONE,
			GLib.PRIORITY_DEFAULT,
			null,
		);
		const size = info.get_size();
		let fileInfo = null;
		switch (fileType) {
			case FileType.Directory:
				fileInfo = await tryCreateDirectoryFileInfo(ext, file);
				break;
			case FileType.Image:
				fileInfo = tryCreateImageInfo(file, size);
				break;
			case FileType.Audio:
			case FileType.Video:
				fileInfo = await tryCreateMediaFileInfo(ext, file, size, cancellable);
				break;
		}
		return fileInfo ?? new FileInfo(size);
	} catch {
		return new ErrorFileInfo(ext);
	}
}
