import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { ClipboardEntry } from './database.js';
import { MemoryDatabase } from './memory.js';

Gio._promisify(Gio.File.prototype, 'load_contents_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_async');
const DATABASE_VERSION = 2;

/**
 * In memory database
 */
export class JsonDatabase extends MemoryDatabase {
	ext;
	file;
	_saveTimeoutId = -1;

	constructor(ext, file) {
		super();
		this.ext = ext;
		this.file = file;
	}

	async init() {
		await super.init();
		if (!this.file.query_exists(null)) {
			return;
		}
		const [contents] = await this.file.load_contents_async(null);
		const document = JSON.parse(new TextDecoder().decode(contents));
		for (const entry of document.entries) {
			const clipboardEntry = new ClipboardEntry(
				this._id++,
				entry.type,
				entry.content,
				entry.pinned,
				entry.tag,
				GLib.DateTime.new_from_iso8601(entry.datetime, GLib.TimeZone.new_utc()),
				entry.metadata,
				entry.title,
			);
			const key = this.entryToKey(clipboardEntry);
			this._entries.set(key, clipboardEntry);
			this._keys.set(clipboardEntry.id, key);
		}
	}

	async clear(history) {
		const deleted = await super.clear(history);
		if (deleted.length > 0) this.save();
		return deleted;
	}

	async close() {
		if (this._saveTimeoutId >= 0) GLib.source_remove(this._saveTimeoutId);
		await this.flush();
	}

	async insert(type, content, metadata = null) {
		const entry = await super.insert(type, content, metadata);
		if (entry !== null) this.save();
		return entry;
	}

	async updateProperty(entry, property) {
		const result = await super.updateProperty(entry, property);
		if (result < 0) this.save();
		return result;
	}

	async delete(entry) {
		const deleted = await super.delete(entry);
		if (deleted) this.save();
		return deleted;
	}

	async deleteOldest(offset, olderThanMinutes) {
		const deleted = await super.deleteOldest(offset, olderThanMinutes);
		if (deleted.length > 0) this.save();
		return deleted;
	}

	save() {
		if (this._saveTimeoutId >= 0) GLib.source_remove(this._saveTimeoutId);
		this._saveTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
			this.flush().catch(() => {});
			this._saveTimeoutId = -1;
			return GLib.SOURCE_REMOVE;
		});
	}

	async flush() {
		try {
			const database = {
				version: DATABASE_VERSION,
				entries: Array.from(this._entries.values(), (entry) => ({
					type: entry.type,
					content: entry.content,
					pinned: entry.pinned,
					tag: entry.tag,
					datetime: entry.datetime.to_utc().format_iso8601(),
					metadata: entry.metadata,
					title: entry.title || undefined,
				})),
			};
			const dir = this.file.get_parent();
			if (dir && !dir.query_exists(null)) {
				dir.make_directory_with_parents(null);
			}
			const bytes = new TextEncoder().encode(JSON.stringify(database));
			await this.file.replace_contents_async(bytes, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
		} catch (error) {
			this.ext.logger.error('Failed to save JSON database', error);
		}
	}
}
