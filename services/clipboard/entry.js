// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import St from 'gi://St';

export class ClipboardEntry {
    constructor({ mimetype, value, favorite = false, tag = '' }) {
        this._mimetype = mimetype;
        this._value = value;
        this._favorite = favorite;
        this._tag = tag;
        this._bytes = null;
    }

    mimetype() { return this._mimetype; }

    isText() { return this._mimetype === 'text/plain'; }
    isImage() { return this._mimetype.startsWith('image/'); }

    getStringValue() { return this._value; }
    setStringValue(value) { this._value = value; }

    getBytesValue() { return this._bytes; }
    setBytesValue(bytes) { this._bytes = bytes; }

    isFavorite() { return this._favorite; }
    setFavorite(fav) { this._favorite = fav; }
    toggleFavorite() { this._favorite = !this._favorite; }

    getTag() { return this._tag; }
    setTag(tag) { this._tag = tag; }

    equals(other) {
        if (!other || other.mimetype() !== this._mimetype) return false;
        if (this.isText()) return other.getStringValue() === this._value;
        if (this.isImage()) {
            const otherBytes = other.getBytesValue();
            if (!otherBytes || !this._bytes) return false;
            return otherBytes.equal(this._bytes);
        }
        return false;
    }
}


export async function readClipboardContent(clipboard) {
    return new Promise((resolve) => {
        clipboard.get_text(St.ClipboardType.CLIPBOARD, (clip, text) => {
            if (text && text.trim().length > 0) {
                resolve(new ClipboardEntry({
                    mimetype: 'text/plain',
                    value: text,
                }));
            } else {
                resolve(null);
            }
        });
    });
}
