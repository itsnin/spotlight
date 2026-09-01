import GLib from 'gi://GLib';

import { ClipboardHistory } from '../common/settings.js';
import { ClipboardEntry } from './database.js';

/**
 * In memory database
 */
export class MemoryDatabase {
	_entries = new Map();
	_keys = new Map();
	_id = 0;

	constructor() {}

	async init() {}

	clear(history) {
		let deleted = [];
		switch (history) {
			case ClipboardHistory.Clear:
				deleted = Array.from(this._keys.keys());
				this._entries.clear();
				this._keys.clear();
				break;
			case ClipboardHistory.KeepPinnedAndTagged:
				deleted = [];
				for (const [key, entry] of this._entries) {
					if (!(entry.pinned || entry.tag)) {
						this._entries.delete(key);
						this._keys.delete(entry.id);
						deleted.push(entry.id);
					}
				}
				break;
			case ClipboardHistory.KeepAll:
				break;
		}
		return Promise.resolve(deleted);
	}

	async close() {
		await this.clear(ClipboardHistory.Clear);
	}

	entries() {
		const entries = Array.from(this._entries.values()).sort((a, b) => b.datetime.compare(a.datetime));
		return Promise.resolve(entries);
	}

	selectConflict(entry) {
		const key = this.entryToKey(entry);
		return Promise.resolve(this._entries.get(key)?.id ?? null);
	}

	insert(type, content, metadata = null) {
		const key = this.entryToKey({ type, content });
		const entry = this._entries.get(key);
		if (entry) {
			return Promise.resolve(null);
		} else {
			const newEntry = new ClipboardEntry(
				this._id++,
				type,
				content,
				false,
				null,
				GLib.DateTime.new_now_utc(),
				metadata,
			);
			this._entries.set(key, newEntry);
			this._keys.set(newEntry.id, key);
			return Promise.resolve(newEntry);
		}
	}

	updateProperty(entry, property) {
		if (property !== 'content') return Promise.resolve(-1);
		const key = this.entryToKey(entry);
		const existingEntry = this._entries.get(key);
		if (existingEntry) {
			return Promise.resolve(existingEntry.id);
		} else {
			const prevKey = this._keys.get(entry.id);
			if (prevKey) this._entries.delete(prevKey);
			this._entries.set(key, entry);
			this._keys.set(entry.id, key);
			return Promise.resolve(-1);
		}
	}

	delete(entry) {
		const key = this._keys.get(entry.id);
		this._keys.delete(entry.id);
		if (key) {
			this._entries.delete(key);
			return Promise.resolve(true);
		}
		return Promise.resolve(false);
	}

	async deleteOldest(offset, olderThanMinutes) {
		const entries = await this.entries();
		let deleted = entries
			.filter((e) => !(e.pinned || e.tag))
			.map((e) => e.id)
			.slice(offset);
		if (olderThanMinutes > 0) {
			const now = GLib.DateTime.new_now_utc();
			const olderThan = now.add_minutes(-olderThanMinutes);
			deleted = [
				...new Set([
					...deleted,
					...entries
						.filter((e) => !(e.pinned || e.tag) && e.datetime.compare(olderThan) < 0)
						.map((e) => e.id),
				]),
			];
		}
		for (const id of deleted) {
			const key = this._keys.get(id);
			this._keys.delete(id);
			if (key) this._entries.delete(key);
		}
		return deleted;
	}

	entryToKey(entry) {
		return `${entry.type}:${entry.content}`;
	}
}
