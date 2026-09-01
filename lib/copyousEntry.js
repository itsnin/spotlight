import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { getDataPath, getHljsLanguages, getHljsPath } from './common/constants.js';
import { DbusService } from './common/dbus.js';
import { migrateSettings } from './common/settings.js';
import { tryCreateSoundManager } from './common/sound.js';
import { ClipboardEntryTracker } from './database/entryTracker.js';
import { ClipboardManager } from './misc/clipboard.js';
import { NotificationManager } from './misc/notifications.js';
import { ShortcutManager } from './misc/shortcuts.js';
import { ThemeManager } from './misc/theme.js';
import { ClipboardDialog } from './ui/clipboardDialog.js';
import { ClipboardIndicator } from './ui/indicator.js';

export default class CopyousExtension extends Extension {
	settings;
	logger;
	hljs;
	hljsMonitor;
	hljsLanguages;
	hljsCallbacks;
	themeManager;
	clipboardDialog;
	indicator;
	dbus;
	notificationManager;
	soundManager;
	shortcutsManager;
	entryTracker;
	historyTimeoutId = -1;
	updateHistory = false;
	clipboardManager;

	enable() {
		this.settings = this.getSettings();
		migrateSettings(this.settings);
		this.logger = this.getLogger();
		const error = this.logger.error.bind(this.logger);

		// Highlight.js
		this.initHljs().catch(error);

		// Theme
		this.themeManager = new ThemeManager(this);

		// UI
		this.clipboardDialog = new ClipboardDialog(this);
		this.clipboardDialog.connectObject(
			'notify::opened',
			async () => {
				// Update the history when the dialog is closed and an update was scheduled while the dialog was open
				if (!this.clipboardDialog?.opened && this.updateHistory) {
					await this.entryTracker?.deleteOldest();
				}
			},
			'copy',
			async (_, entry) => {
				await this.clipboardManager?.copyEntry(entry);
				this.indicator?.showEntry(entry);
			},
			'paste',
			async (_, entry) => {
				await this.clipboardManager?.pasteEntry(entry);
				this.indicator?.showEntry(entry);
			},
			'clear-history',
			(_, history) => this.entryTracker?.clear(history),
			this,
		);
		this.indicator = new ClipboardIndicator(this);
		this.indicator.connectObject(
			'open-dialog',
			() => this.clipboardDialog?.open(),
			'clear-history',
			(_, history) => this.entryTracker?.clear(history),
			this,
		);

		// DBus
		this.dbus = new DbusService();
		this.dbus.connectObject(
			'toggle',
			() => this.clipboardDialog?.toggle(),
			'show',
			() => this.clipboardDialog?.open(),
			'hide',
			() => this.clipboardDialog?.close(),
			'clear-history',
			(_, history) => this.entryTracker?.clear(history === -1 ? null : history),
			this,
		);

		// Feedback
		this.notificationManager = new NotificationManager(this);
		tryCreateSoundManager(this)
			.then((soundManager) => {
				if (soundManager) this.soundManager = soundManager;
			})
			.catch(error);

		// Shortcuts
		this.shortcutsManager = new ShortcutManager(this, this.clipboardDialog);
		this.shortcutsManager.connectObject(
			'open-clipboard-dialog',
			() => this.clipboardDialog?.dialogShortcut(),
			'toggle-incognito-mode',
			() => this.indicator?.toggleIncognito(),
			this,
		);

		// Database
		this.entryTracker = new ClipboardEntryTracker(this);
		this.initEntryTracker().catch(error);
		this.initHistoryTimeout().catch(error);
		this.settings.connectObject(
			'changed::database-location',
			this.initEntryTracker.bind(this),
			'changed::database-backend',
			this.initEntryTracker.bind(this),
			'changed::history-time',
			this.initHistoryTimeout.bind(this),
			this,
		);

		// Clipboard Manager
		this.clipboardManager = new ClipboardManager(this, this.entryTracker);
		this.clipboardManager.connectObject(
			'clipboard',
			(_, entry) => {
				this.clipboardDialog?.addEntry(entry);
				this.indicator?.showEntry(entry);
				this.indicator?.animate();
				this.notificationManager?.notification(entry);
				this.soundManager?.playSound();
			},
			'text',
			(_, text) => {
				this.indicator?.showText(text);
				this.indicator?.animate();
				this.notificationManager?.textNotification(text);
				this.soundManager?.playSound();
			},
			'image',
			(_, image, width, height) => {
				this.indicator?.showImageBytes(image);
				this.indicator?.animate();
				this.notificationManager?.imageNotification(image, width, height);
				this.soundManager?.playSound();
			},
			this,
		);
	}

	async initHljs() {
		if (this.hljs) return;
		const hljsPath = getHljsPath(this);
		try {
			const hljs = await import(hljsPath.get_uri());
			this.hljs = hljs.default;

			// Disable file monitor
			this.hljsMonitor?.cancel();
			this.hljsMonitor = undefined;

			// Initialize extra languages
			await this.loadHljsLanguages();

			// Notify dependents
			this.hljsCallbacks?.forEach((fn) => fn());
			this.hljsCallbacks = undefined;
		} catch {
			this.hljs = null;

			// Automatically load highlight.js
			if (!this.hljsMonitor) {
				this.hljsMonitor = hljsPath.monitor(Gio.FileMonitorFlags.NONE, null);
				this.hljsMonitor.connectObject(
					'changed',
					async (_monitor, _file, _otherFile, eventType) => {
						if (eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT) {
							await this.initHljs();
						}
					},
					this,
				);
			}
		}
	}

	async loadHljsLanguages() {
		this.hljsLanguages ??= new Map();
		if (!this.hljsMonitor) {
			const path = getDataPath(this).get_child('languages');
			this.hljsMonitor = path.monitor_directory(Gio.FileMonitorFlags.NONE, null);
			this.hljsMonitor.connectObject(
				'changed',
				async (_monitor, _file, _otherFile, eventType) => {
					if (
						eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
						eventType === Gio.FileMonitorEvent.DELETED
					) {
						await this.loadHljsLanguages();
					}
				},
				this,
			);
		}
		const languages = getHljsLanguages(this);
		await Promise.all(
			languages.map(async ([name, _language, _hash, path]) => {
				const enabled = this.hljsLanguages?.get(name) ?? false;
				if (!path.query_exists(null)) {
					if (enabled) {
						this.hljs?.unregisterLanguage(name);
						this.hljsLanguages?.set(name, false);
					}
					return;
				}
				if (enabled) return;
				try {
					const language = await import(path.get_uri());
					this.hljs?.registerLanguage(name, language.default);
					this.hljsLanguages?.set(name, true);
				} catch {
					this.logger.error(`Failed to register language "${name}"`);
				}
			}),
		);
	}

	connectHljsInit(fn) {
		if (this.hljs != null) return;
		this.hljsCallbacks ??= [];
		this.hljsCallbacks.push(fn);
	}

	async initEntryTracker() {
		if (!this.entryTracker || !this.entryTracker.shouldInit) return;
		this.clipboardDialog?.clearEntries();
		const entries = await this.entryTracker.init();
		for (const entry of entries) {
			this.clipboardDialog?.addEntry(entry);
		}
	}

	async initHistoryTimeout() {
		if (this.historyTimeoutId >= 0) GLib.source_remove(this.historyTimeoutId);
		const historyTime = this.settings?.get_int('history-time');
		if (historyTime === undefined || historyTime === 0) return;
		await this.entryTracker?.deleteOldest();
		this.historyTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, () => {
			// Do not update the history if the dialog is open
			this.updateHistory = this.clipboardDialog?.opened ?? false;
			if (this.updateHistory) return GLib.SOURCE_CONTINUE;
			if (this.entryTracker?.checkOldest()) {
				this.entryTracker?.deleteOldest().catch(this.logger.error.bind(this.logger));
			}
			return GLib.SOURCE_CONTINUE;
		});
	}

	disable() {
		// UI
		this.clipboardDialog?.disconnectObject(this);
		this.clipboardDialog?.destroy();
		this.indicator?.disconnectObject(this);
		this.indicator?.destroy();
		this.clipboardDialog = undefined;
		this.indicator = undefined;

		// Highlight.js
		this.hljs = undefined;
		this.hljsMonitor?.disconnectObject(this);
		this.hljsMonitor?.cancel();
		this.hljsMonitor = undefined;
		this.hljsLanguages = undefined;
		this.hljsCallbacks = undefined;

		// Theme
		this.themeManager?.destroy();
		this.themeManager = undefined;

		// DBus
		this.dbus?.disconnectObject(this);
		this.dbus?.destroy();
		this.dbus = undefined;

		// Feedback
		this.notificationManager = undefined;
		this.soundManager?.destroy();
		this.soundManager = undefined;

		// Shortcuts
		this.shortcutsManager?.disconnectObject(this);
		this.shortcutsManager?.destroy();
		this.shortcutsManager = undefined;

		// Database
		const error = this.logger.error.bind(this.logger);
		this.entryTracker?.destroy().catch(error);
		this.entryTracker = undefined;
		if (this.historyTimeoutId >= 0) GLib.source_remove(this.historyTimeoutId);
		this.historyTimeoutId = -1;

		// Clipboard Manager
		this.clipboardManager?.disconnectObject(this);
		this.clipboardManager?.destroy();
		this.clipboardManager = undefined;

		// Globals
		this.settings?.disconnectObject(this);
		this.settings = undefined;
		this.logger = undefined;
	}
}
