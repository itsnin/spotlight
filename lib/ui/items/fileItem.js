import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Pango from 'gi://Pango';
import St from 'gi://St';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { registerClass } from '../../common/gjs.js';
import { globToRegex } from '../../common/glob.js';
import { Icon } from '../../common/icons.js';
import { FilePreviewType, FilePreviewVisibility } from '../../common/settings.js';
import { createFileInfo } from '../components/contentInfo.js';
import {
	FileType,
	ImagePreview,
	TextPreview,
	ThumbnailPreview,
	getFileType,
	tryCreateFilePreview,
} from '../components/contentPreview.js';
import { ClipboardItem } from './clipboardItem.js';

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

export function formatFile(file) {
	const relative = Gio.File.new_for_path(GLib.get_home_dir()).get_relative_path(file);
	return relative !== null ? `~/${relative}` : file.get_path();
}

let FileItem = class FileItem extends ClipboardItem {
	fileItemSettings;
	_filePreviewVisibility = FilePreviewVisibility.Hidden;
	_filePreviewTypes = FilePreviewType.All;
	_filePreviewExclusionPatterns = [];
	_filePreviewExclusionRegex = null;
	_file;
	_fileType;
	_thumbnail;
	_filePreview;
	_fileInfo;
	_cancellable = new Gio.Cancellable();

	constructor(ext, entry) {
		super(ext, entry, Icon.File, _('File'));
		this.fileItemSettings = this.ext.settings.get_child('file-item');
		this.add_style_class_name('file-item');
		this._file = new St.Label({
			style_class: 'file-item-file',
			text: formatFile(Gio.File.new_for_uri(this.entry.content)),
			y_align: Clutter.ActorAlign.START,
			y_expand: true,
		});
		this._file.clutter_text.line_wrap = true;
		this._file.clutter_text.ellipsize = Pango.EllipsizeMode.MIDDLE;
		this._content.add_child(this._file);

		// Bind properties
		this.fileItemSettings.connectObject('changed', this.updateFilePreview.bind(this), this);
		const logger = this.ext.logger;
		this.updateFilePreview().catch(logger.error.bind(logger));
	}

	search(query) {
		const file = this.entry.content.substring('file://'.length);
		this.visible = query.matchesEntry(this.visible, this.entry, file, this._file.text);
	}

	async updateFilePreview() {
		this._filePreviewVisibility = this.fileItemSettings.get_enum('file-preview-visibility');
		this._filePreviewTypes = this.fileItemSettings.get_flags('file-preview-types');
		this._filePreviewExclusionPatterns = this.fileItemSettings.get_strv('file-preview-exclusion-patterns');
		if (this._filePreviewExclusionPatterns.length > 0) {
			try {
				this._filePreviewExclusionRegex = new RegExp(globToRegex(...this._filePreviewExclusionPatterns));
			} catch {
				this._filePreviewExclusionRegex = null;
			}
		} else {
			this._filePreviewExclusionRegex = null;
		}
		await this.configureFilePreview();
		await this.configureFileInfo();
		this.configureVisibility();
	}

	showFilePreview() {
		if (
			this._filePreviewVisibility === FilePreviewVisibility.Hidden ||
			this._filePreviewVisibility === FilePreviewVisibility.FileInfoOnly
		) {
			return false;
		}
		if (this._filePreview) {
			if (this._filePreview instanceof TextPreview) {
				if ((this._filePreviewTypes & FilePreviewType.Text) === 0) return false;
			} else if (this._filePreview instanceof ThumbnailPreview) {
				if ((this._filePreviewTypes & FilePreviewType.Thumbnail) === 0) return false;
			} else if (this._filePreview instanceof ImagePreview) {
				if ((this._filePreviewTypes & FilePreviewType.Image) === 0) return false;
			}
		} else if (this._fileType !== undefined) {
			if (this._fileType === FileType.Text) {
				if ((this._filePreviewTypes & FilePreviewType.Text) === 0) return false;
			} else if (this._fileType === FileType.Image) {
				if ((this._filePreviewTypes & FilePreviewType.Image) === 0) return false;
			} else if (this._thumbnail != null) {
				if ((this._filePreviewTypes & FilePreviewType.Thumbnail) === 0) return false;
			}
		}
		return !this._filePreviewExclusionRegex?.test(this.entry.content);
	}

	async configureFilePreview() {
		if (this._filePreview == null && this.showFilePreview()) {
			const file = Gio.File.new_for_uri(this.entry.content);
			if (this._fileType === undefined || this._thumbnail === undefined) {
				[this._fileType, this._thumbnail] = await getFileType(file);
			}
			this._filePreview = await tryCreateFilePreview(this.ext, file, this._fileType, this._thumbnail);
			if (this._filePreview) {
				this._content.insert_child_above(this._filePreview, this._file);
				this.configureVisibility();
				if (this._filePreview instanceof TextPreview) {
					this.ext.settings.connectObject('changed::tab-width', this.configureFilePreview.bind(this), this);
				} else if (this._filePreview instanceof ImagePreview) {
					// Hover effect
					this.bind_property('active', this._filePreview, 'active', GObject.BindingFlags.DEFAULT);
				}
			}
		} else if (this._filePreview !== null) {
			if (this._filePreview instanceof TextPreview) {
				this._filePreview.syntaxHighlighting = this.fileItemSettings.get_boolean('syntax-highlighting');
				this._filePreview.showLineNumbers = this.fileItemSettings.get_boolean('show-line-numbers');
				this._filePreview.tabWidth = this.ext.settings.get_int('tab-width');
			} else if (this._filePreview instanceof ImagePreview) {
				this._filePreview.backgroundSize = this.fileItemSettings.get_enum('background-size');
			}
		}
	}

	async configureFileInfo() {
		if (
			this._fileInfo === undefined &&
			this._filePreviewVisibility !== FilePreviewVisibility.Hidden &&
			this._filePreviewVisibility !== FilePreviewVisibility.FilePreviewOnly
		) {
			const file = Gio.File.new_for_uri(this.entry.content);
			if (this._fileType === undefined || this._thumbnail === undefined) {
				[this._fileType, this._thumbnail] = await getFileType(file);
			}
			this._fileInfo = await createFileInfo(this.ext, file, this._fileType, this._cancellable);
			this._content.add_child(this._fileInfo);
			this.configureVisibility();
		}
	}

	configureVisibility() {
		// File preview
		const showFilePreview = this.showFilePreview();
		if (this._filePreview && showFilePreview) {
			this._file.y_expand = false;
			this._file.clutter_text.line_wrap = false;
			this._file.clutter_text.ellipsize = Pango.EllipsizeMode.START;
			this._filePreview.visible = true;
		} else {
			this._file.y_expand = true;
			this._file.clutter_text.line_wrap = true;
			this._file.clutter_text.ellipsize = Pango.EllipsizeMode.MIDDLE;
			if (this._filePreview) {
				this._filePreview.visible = false;
			}
		}

		// File info
		if (this._fileInfo != null) {
			if (
				this._filePreviewVisibility !== FilePreviewVisibility.Hidden &&
				this._filePreviewVisibility !== FilePreviewVisibility.FilePreviewOnly
			) {
				this._fileInfo.visible = !(
					this._filePreview &&
					showFilePreview &&
					this._filePreviewVisibility === FilePreviewVisibility.FilePreviewOrFileInfo
				);
			} else {
				this._fileInfo.visible = false;
			}
		}
	}

	destroy() {
		this.fileItemSettings.disconnectObject(this);
		this._cancellable.cancel();
		super.destroy();
	}
};
FileItem = __decorate([registerClass()], FileItem);

export { FileItem };
