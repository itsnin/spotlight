import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { registerClass } from '../../common/gjs.js';
import { Icon } from '../../common/icons.js';
import { createFileInfo } from '../components/contentInfo.js';
import { FileType, ImagePreview } from '../components/contentPreview.js';
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

let ImageItem = class ImageItem extends ClipboardItem {
	imageItemSettings;
	_showImageInfo = false;
	_imagePreview;
	_imageInfo;
	_cancellable = new Gio.Cancellable();

	constructor(ext, entry) {
		super(ext, entry, Icon.Image, _('Image'));
		this.imageItemSettings = this.ext.settings.get_child('image-item');
		this.add_style_class_name('image-item');
		this.add_style_class_name('no-image-info');
		const file = Gio.File.new_for_uri(entry.content);
		this._imagePreview = new ImagePreview(ext, file);
		this._content.add_child(this._imagePreview);

		// Bind properties
		this.imageItemSettings.connectObject(
			'changed::show-image-info',
			this.updateSettings.bind(this),
			'changed::background-size',
			this.updateSettings.bind(this),
			this,
		);
		this.updateSettings();

		// Hover effect
		this.bind_property('active', this._imagePreview, 'active', GObject.BindingFlags.DEFAULT);
	}

	get showImageInfo() {
		return this._showImageInfo;
	}

	set showImageInfo(showImageInfo) {
		if (this._showImageInfo === showImageInfo) return;
		this._showImageInfo = showImageInfo;
		this.notify('show-image-info');
		this.configureImageInfo();
	}

	search(query) {
		this.visible = query.matchesEntry(this.visible, this.entry);
	}

	updateSettings() {
		this.showImageInfo = this.imageItemSettings.get_boolean('show-image-info');
		this._imagePreview.backgroundSize = this.imageItemSettings.get_enum('background-size');
	}

	configureImageInfo() {
		if (this._imageInfo === undefined && this.showImageInfo) {
			createFileInfo(this.ext, Gio.File.new_for_uri(this.entry.content), FileType.Image, this._cancellable)
				.then((imageInfo) => {
					this._imageInfo = imageInfo;
					this._content.add_child(this._imageInfo);
					this.configureImageInfo();
				})
				.catch(() => {});
		}
		if (this._imageInfo == null) {
			return;
		}
		this._imageInfo.visible = this.showImageInfo;
		if (this.showImageInfo) {
			this.remove_style_class_name('no-image-info');
		} else {
			this.add_style_class_name('no-image-info');
		}
	}

	destroy() {
		this.imageItemSettings.disconnectObject(this);
		this._cancellable.cancel();
		super.destroy();
	}
};
ImageItem = __decorate(
	[
		registerClass({
			Properties: {
				'show-image-info': GObject.ParamSpec.boolean(
					'show-image-info',
					null,
					null,
					GObject.ParamFlags.READWRITE,
					false,
				),
			},
		}),
	],
	ImageItem,
);

export { ImageItem };
