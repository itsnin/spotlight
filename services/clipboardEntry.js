// spotlight - clipboard entry wraps text or image data
// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';

const TEXT_MIMETYPES = [
    'text/plain;charset=utf-8',
    'UTF8_STRING',
    'text/plain',
    'STRING',
];

const IMAGE_MIMETYPES = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
];

// unique id counter incremented for each new entry
let _nextEntryId = 1;

export class ClipboardEntry {
    constructor(mimetype, bytes, favorite = false) {
        this._mimetype = mimetype;
        this._bytes = bytes;
        this._favorite = favorite;
        this._id = _nextEntryId++;
        this._imagePath = null;
    }

    static fromJSON(jsonEntry) {
        const mimetype = jsonEntry.mimetype || 'text/plain;charset=utf-8';
        const favorite = jsonEntry.favorite || false;
        let bytes;
        if (ClipboardEntry._isTextMimetype(mimetype)) {
            bytes = new TextEncoder().encode(jsonEntry.contents);
        } else {
            // image entries store filename not contents bytes loaded lazily
            bytes = null;
        }
        const entry = new ClipboardEntry(mimetype, bytes, favorite);
        if (jsonEntry.imagePath)
            entry._imagePath = jsonEntry.imagePath;
        return entry;
    }

    toJSON() {
        const item = {
            favorite: this._favorite,
            mimetype: this._mimetype,
        };
        if (this.isText()) {
            item.contents = this.getStringValue();
        } else if (this.isImage() && this._imagePath) {
            item.imagePath = this._imagePath;
        }
        return item;
    }

    static _isTextMimetype(mimetype) {
        return mimetype.startsWith('text/') ||
            TEXT_MIMETYPES.includes(mimetype);
    }

    mimetype() {
        return this._mimetype;
    }

    isText() {
        return ClipboardEntry._isTextMimetype(this._mimetype);
    }

    isImage() {
        return this._mimetype.startsWith('image/');
    }

    isFavorite() {
        return this._favorite;
    }

    setFavorite(val) {
        this._favorite = !!val;
    }

    getStringValue() {
        if (!this.isText())
            return `[Image ${this._mimetype}]`;
        return new TextDecoder().decode(this._bytes);
    }

    // load bytes from disk for image entries restored from registry
    _ensureBytes() {
        if (this._bytes !== null)
            return true;
        if (!this._imagePath)
            return false;
        try {
            const file = Gio.file_new_for_path(this._imagePath);
            const [success, contents] = file.load_contents(null);
            if (success) {
                this._bytes = contents;
                return true;
            }
        } catch {
            // file may have been deleted
        }
        return false;
    }

    getBytes() {
        this._ensureBytes();
        return this._bytes;
    }

    asBytes() {
        if (!this._ensureBytes())
            return null;
        return GLib.Bytes.new(this._bytes);
    }

    setImagePath(path) {
        this._imagePath = path;
    }

    getImagePath() {
        return this._imagePath || null;
    }

    // compute sha256 hash of bytes used as filename for image cache
    // prevents collisions that 32-bit bytes.hash would allow
    getContentHash() {
        const bytes = this.getBytes();
        if (!bytes)
            return null;
        const cs = GLib.Checksum.new(GLib.ChecksumType.SHA256);
        cs.update(bytes);
        return cs.get_string();
    }

    equals(other) {
        if (!other)
            return false;
        if (this.isText() && other.isText())
            return this.getStringValue() === other.getStringValue();
        if (this.isImage() && other.isImage()) {
            // same path means same image file on disk
            if (this._imagePath && other._imagePath &&
                this._imagePath === other._imagePath)
                return true;
            // mimetype must match for images to be equal
            if (this._mimetype !== other._mimetype)
                return false;
            // compare actual bytes loading from disk if needed
            const myBytes = this.getBytes();
            const otherBytes = other.getBytes();
            if (!myBytes || !otherBytes)
                return false;
            if (myBytes.length !== otherBytes.length)
                return false;
            return myBytes.every((v, i) => v === otherBytes[i]);
        }
        return false;
    }
}

// try mimetypes in order text first then images
// returns first successful result as ClipboardEntry or null
export async function readClipboardContent(clipboard) {
    const mimetypes = [...TEXT_MIMETYPES, ...IMAGE_MIMETYPES];
    for (const type of mimetypes) {
        const result = await new Promise(resolve => {
            clipboard.get_content(St.ClipboardType.CLIPBOARD, type, (cb, bytes) => {
                if (!bytes || bytes.get_size() === 0) {
                    resolve(null);
                    return;
                }
                let resolvedType = type;
                if (type === 'UTF8_STRING')
                    resolvedType = 'text/plain;charset=utf-8';
                resolve(new ClipboardEntry(resolvedType, bytes.get_data(), false));
            });
        });
        if (result)
            return result;
    }
    return null;
}
