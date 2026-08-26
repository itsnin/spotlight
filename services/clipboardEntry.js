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
    constructor(mimetype, bytes, favorite = false, tag = null) {
        this._mimetype = mimetype;
        this._bytes = bytes;
        this._favorite = favorite;
        this._tag = tag;
        this._id = _nextEntryId++;
        this._imagePath = null;
        this._contentHash = null;
        this._size = bytes ? bytes.length : 0;
        // precompute hash when bytes available avoids sync disk io in equals
        if (bytes)
            this._contentHash = this._computeHash(bytes);
    }

    static fromJSON(jsonEntry) {
        const mimetype = jsonEntry.mimetype || 'text/plain;charset=utf-8';
        const favorite = jsonEntry.favorite || false;
        const tag = jsonEntry.tag || null;
        let bytes;
        if (ClipboardEntry._isTextMimetype(mimetype)) {
            bytes = new TextEncoder().encode(jsonEntry.contents);
        } else {
            // image entries store filename not contents bytes loaded lazily
            bytes = null;
        }
        const entry = new ClipboardEntry(mimetype, bytes, favorite, tag);
        if (jsonEntry.imagePath) {
            entry._imagePath = jsonEntry.imagePath;
            // image path is already a sha256 hash from registry write
            // extract basename use as content hash avoids disk read in equals
            const parts = jsonEntry.imagePath.split('/');
            entry._contentHash = parts[parts.length - 1];
            if (jsonEntry.size)
                entry._size = jsonEntry.size;
        }
        return entry;
    }

    toJSON() {
        const item = {
            favorite: this._favorite,
            tag: this._tag,
            mimetype: this._mimetype,
        };
        if (this.isText()) {
            item.contents = this.getStringValue();
        } else if (this.isImage() && this._imagePath) {
            item.imagePath = this._imagePath;
            item.size = this._size;
        }
        return item;
    }

    _computeHash(bytes) {
        const cs = GLib.Checksum.new(GLib.ChecksumType.SHA256);
        cs.update(bytes);
        return cs.get_string();
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
    getTag() {
        return this._tag;
    }
    setTag(val) {
        this._tag = val ? String(val).trim() || null : null;
    }
    setText(text) {
        if (!this.isText())
            return;
        this._bytes = new TextEncoder().encode(text);
        this._contentHash = this._computeHash(this._bytes);
        this._size = this._bytes.length;
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
                this._size = contents.length;
                if (!this._contentHash)
                    this._contentHash = this._computeHash(contents);
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
        if (this._contentHash)
            return this._contentHash;
        const bytes = this.getBytes();
        if (!bytes)
            return null;
        this._contentHash = this._computeHash(bytes);
        return this._contentHash;
    }

    getSize() {
        return this._size;
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
            // different sizes cannot be equal
            if (this._size > 0 && other._size > 0 &&
                this._size !== other._size)
                return false;
            // compare by content hash if both have it avoids sync disk io
            if (this._contentHash && other._contentHash)
                return this._contentHash === other._contentHash;
            // fall back to byte comparison only if both have bytes in memory
            // never load from disk during equality check would block main thread
            if (this._bytes && other._bytes) {
                if (this._bytes.length !== other._bytes.length)
                    return false;
                return this._bytes.every((v, i) => v === other._bytes[i]);
            }
            // cannot determine equality without loading from disk
            // assume different to avoid false duplicates
            return false;
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
