import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

export const Sound = {
	None: 'none',

	// Gnome sounds
	Click: 'click',
	Hum: 'hum',
	String: 'string',
	Swing: 'swing',

	// Xdg sounds
	Message: 'message',
	MessageNewInstant: 'message-new-instant',
	Bell: 'bell',
	DialogWarning: 'dialog-warning',
};

export async function tryCreateSoundManager(ext) {
	try {
		const gsound = (await import('gi://GSound')).default;
		return new SoundManager(gsound, ext);
	} catch {
		return null;
	}
}

export class SoundManager {
	_GSound;
	_context;
	_sounds = {};
	_settings;

	constructor(gsound, ext) {
		this._GSound = gsound;
		this._context = new gsound.Context();
		this._context.init(null);
		this._sounds = SoundManager.initSounds();
		this._settings = 'settings' in ext ? ext.settings : ext.getSettings();
	}

	static initSounds() {
		const sounds = {};

		// Locate gnome sounds
		for (const dir of GLib.get_system_data_dirs()) {
			const gnomeSounds = Gio.File.new_build_filenamev([dir, 'sounds', 'gnome', 'default', 'alerts']);
			if (gnomeSounds.query_exists(null)) {
				for (const sound of [Sound.Click, Sound.Hum, Sound.String, Sound.Swing]) {
					const file = gnomeSounds.get_child(`${sound}.ogg`);
					if (file.query_exists(null)) {
						sounds[sound] = file.get_path();
					}
				}
			}
		}

		// Xdg sounds should always exist
		sounds[Sound.Message] = null;
		sounds[Sound.MessageNewInstant] = null;
		sounds[Sound.Bell] = null;
		sounds[Sound.DialogWarning] = null;
		return sounds;
	}

	destroy() {
		this._settings.disconnectObject(this);
	}

	hasSound(sound) {
		return sound in this._sounds;
	}

	playSound(sound, volume) {
		sound ??= this._settings.get_string('sound');
		volume ??= this._settings.get_double('volume');
		if (!(sound in this._sounds)) return;
		const file = this._sounds[sound];
		if (file == null) {
			// Xdg sound
			this._context.play_simple(
				{
					[this._GSound.ATTR_EVENT_ID]: sound,
					[this._GSound.ATTR_CANBERRA_VOLUME]: volume.toString(),
				},
				null,
			);
		} else {
			// Gnome sound
			this._context.play_simple(
				{
					[this._GSound.ATTR_MEDIA_FILENAME]: file,
					[this._GSound.ATTR_CANBERRA_VOLUME]: volume.toString(),
				},
				null,
			);
		}
	}
}
