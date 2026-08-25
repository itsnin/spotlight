// spotlight - clipboard registry disk persistence
// SPDX-License-Identifier: GPL-3.0-or-later
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {ClipboardEntry} from './clipboardEntry.js';

export class Registry {
    constructor(uuid) {
        this._uuid = uuid;
        this._cacheDir = GLib.build_filenamev([
            GLib.get_user_cache_dir(),
            this._uuid,
        ]);
        this._registryPath = GLib.build_filenamev([
            this._cacheDir,
            'registry.txt',
        ]);
        this._debounceId = 0;
        this._pendingEntries = null;
    }

    // save entries to disk debounced batches multiple rapid changes
    // into single write avoids excessive disk io
    write(entries) {
        this._pendingEntries = entries;
        if (this._debounceId !== 0)
            return;
        // 500ms window batches rapid successive copies
        this._debounceId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            500,
            () => {
                this._debounceId = 0;
                this._flush();
                return GLib.SOURCE_REMOVE;
            },
        );
    }

    // immediately flush pending writes called on destroy
    flush() {
        if (this._debounceId !== 0) {
            GLib.source_remove(this._debounceId);
            this._debounceId = 0;
        }
        if (this._pendingEntries)
            this._flush();
    }

    _flush() {
        if (!this._pendingEntries)
            return;
        const entries = this._pendingEntries;
        this._pendingEntries = null;

        const registryContent = entries.map(e => e.toJSON());
        const json = JSON.stringify(registryContent);
        const contents = new GLib.Bytes(json);

        // ensure cache directory exists replace_async fails if parent missing
        GLib.mkdir_with_parents(this._cacheDir, parseInt('0775', 8));

        const file = Gio.file_new_for_path(this._registryPath);
        file.replace_async(
            null, false, Gio.FileCreateFlags.NONE,
            GLib.PRIORITY_DEFAULT, null, (obj, res) => {
                const stream = obj.replace_finish(res);
                stream.write_bytes_async(
                    contents, GLib.PRIORITY_DEFAULT,
                    null, (w_obj, w_res) => {
                        w_obj.write_bytes_finish(w_res);
                        stream.close(null);
                    });
            });

        // save image entries to individual files
        for (const entry of entries) {
            if (entry.isImage() && entry.getBytes() && !entry.getImagePath()) {
                this._writeImageFile(entry);
            }
        }
    }

    _writeImageFile(entry) {
        const hash = entry.getContentHash();
        if (!hash)
            return;
        const path = GLib.build_filenamev([this._cacheDir, hash]);
        const file = Gio.file_new_for_path(path);

        if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
            entry.setImagePath(path);
            return;
        }

        file.replace_async(
            null, false, Gio.FileCreateFlags.NONE,
            GLib.PRIORITY_DEFAULT, null, (obj, res) => {
                const stream = obj.replace_finish(res);
                stream.write_bytes_async(
                    entry.asBytes(), GLib.PRIORITY_DEFAULT,
                    null, (w_obj, w_res) => {
                        w_obj.write_bytes_finish(w_res);
                        stream.close(null);
                        entry.setImagePath(path);
                    });
            });
    }

    // load entries from disk returns promise
    async read() {
        return new Promise(resolve => {
            if (!GLib.file_test(this._registryPath, GLib.FileTest.EXISTS)) {
                resolve([]);
                return;
            }

            const file = Gio.file_new_for_path(this._registryPath);
            file.load_contents_async(null, (obj, res) => {
                try {
                    const [success, contents] = obj.load_contents_finish(res);
                    if (!success) {
                        resolve([]);
                        return;
                    }

                    const text = new TextDecoder().decode(contents);
                    if (!text.trim()) {
                        resolve([]);
                        return;
                    }

                    const jsonEntries = JSON.parse(text);
                    const entries = jsonEntries.map(je => {
                        try {
                            return ClipboardEntry.fromJSON(je);
                        } catch {
                            return null;
                        }
                    }).filter(e => e !== null);

                    resolve(entries);
                } catch {
                    resolve([]);
                }
            });
        });
    }
}
