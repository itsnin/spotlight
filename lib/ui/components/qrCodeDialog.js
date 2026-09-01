import Cairo from 'cairo';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

import QrCodeGen from '../../../thirdparty/qrcodegen.js';
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

Gio._promisify(Gio.File.prototype, 'load_bytes_async');

class ErrorQrCode {
	// prettier-ignore
	_errorMessage = [
        0b111101110011100111101110,
        0b100001001010010100101001,
        0b111001110011100100101110,
        0b100001010010100100101010,
        0b111101001010010111101001,
    ];

	get size() {
		return 24;
	}

	getModule(x, y) {
		// Offset from top = 9
		const row = this._errorMessage[y - 9];
		if (row == null) return false;
		return ((row >> (23 - x)) & 1) === 1;
	}
}

let QrCode = class QrCode extends St.DrawingArea {
	ext;
	_qrCode;

	constructor(ext, text) {
		super();
		this.ext = ext;
		try {
			this._qrCode = QrCodeGen.QrCode.encodeText(text, QrCodeGen.QrCode.Ecc.MEDIUM);
		} catch {
			this._qrCode = new ErrorQrCode();
		}
		this.set_size(300, 300);
	}

	get error() {
		return this._qrCode instanceof ErrorQrCode;
	}

	vfunc_repaint() {
		const [width, height] = this.get_surface_size();
		const cr = this.get_context();
		this.draw(cr, width, height);
		cr.$dispose();
	}

	async copy() {
		// Draw QR code with border
		const size = this._qrCode.size * 8 + 32;
		const surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, size, size);
		const cr = new Cairo.Context(surface);
		this.draw(cr, size, size, 16);
		cr.$dispose();

		// Create intermediate file for copying
		const [tmp] = Gio.file_new_tmp(null);
		surface.writeToPNG(tmp.get_path());

		// Copy to clipboard
		const [bytes] = await tmp.load_bytes_async(null);
		const data = bytes.get_data();
		if (!data) return;
		this.ext.clipboardManager?.copyPng(data, size, size);
	}

	draw(cr, width, height, border = 0) {
		// Background
		if (border) {
			// Set antialiasing for rounded corners
			cr.setAntialias(Cairo.Antialias.BEST);

			// Draw rounded rectangle
			cr.newSubPath();
			cr.arc(border, border, border, Math.PI, Math.PI * 1.5);
			cr.arc(width - border, border, border, Math.PI * 1.5, 0);
			cr.arc(width - border, height - border, border, 0, Math.PI * 0.5);
			cr.arc(border, height - border, border, Math.PI * 0.5, Math.PI);
			cr.closePath();
			cr.setSourceRGBA(1, 1, 1, 1);
			cr.fill();
		} else {
			cr.setSourceRGBA(1, 1, 1, 1);
			cr.rectangle(0, 0, width, height);
			cr.fill();
		}
		cr.setAntialias(Cairo.Antialias.NONE);

		// Qr Code
		const qrSize = this._qrCode.size;
		const cellSize = (width - 2 * border) / qrSize;
		for (let y = 0; y < qrSize; y++) {
			for (let x = 0; x < qrSize; x++) {
				if (this._qrCode.getModule(x, y)) {
					cr.setSourceRGBA(0, 0, 0, 1);
					cr.rectangle(border + x * cellSize, border + y * cellSize, cellSize, cellSize);
					cr.fill();
				}
			}
		}
	}
};
QrCode = __decorate([registerClass()], QrCode);
let QrCodeDialog = class QrCodeDialog extends ModalDialog.ModalDialog {
	constructor(ext, text) {
		super();
		const content = new Dialog.MessageDialogContent({});
		this.contentLayout.add_child(content);
		const box = new St.BoxLayout({
			x_align: Clutter.ActorAlign.CENTER,
			y_align: Clutter.ActorAlign.CENTER,
			x_expand: true,
			y_expand: true,
			style_class: 'qr-code',
		});
		content.add_child(box);
		const qrCode = new QrCode(ext, text);
		box.add_child(qrCode);
		this.addButton({
			label: _('Close'),
			action: this.close.bind(this),
			default: true,
			key: Clutter.KEY_Escape,
		});
		if (!qrCode.error) {
			this.addButton({
				label: _('Copy'),
				action: async () => {
					await qrCode.copy();
					this.close();
				},
			});
		}
	}
};
QrCodeDialog = __decorate([registerClass()], QrCodeDialog);

export { QrCodeDialog };
